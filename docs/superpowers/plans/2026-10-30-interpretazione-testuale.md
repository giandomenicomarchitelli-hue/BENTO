# Interpretazione testuale (fase 2a) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un campo di testo dove un membro scrive una frase libera in
italiano, interpretata da Claude in una Edge Function in azioni
`aggiungi_articolo`/`acquisto`, mostrate in una schermata di conferma e
poi eseguite con le API già esistenti.

**Architecture:** Stesso schema a livelli già usato nei moduli
precedenti: calcolo puro e testato in `src/calcolo/` (schema Zod delle
azioni, risoluzione nomi→membro, ordine deterministico delle quote), API
tipizzata in `src/api/` che chiama la Edge Function e poi esegue le
azioni confermate con le funzioni già esistenti (`aggiungiArticolo`,
`creaSpesa`, `aggiornaArticolo`), hook React Query, UI. Novità di questo
modulo: la prima Edge Function invocata direttamente da un client
autenticato (le altre due sono invocate da trigger/cron con JWT
disattivato) — qui il JWT resta verificato di default e la funzione
controlla anche l'appartenenza al gruppo prima di spendere una chiamata
a Claude.

**Tech Stack:** React Native + Expo Router, TypeScript, Zod (già
presente, v4), Supabase Edge Functions (Deno) con l'SDK ufficiale
`@anthropic-ai/sdk`, TanStack React Query, Jest. Nessuna libreria nuova
lato app.

**Spec:** `docs/superpowers/specs/2026-10-30-interpretazione-testuale-design.md`
(questo piano assume quel documento letto per intero: schema JSON,
regole di conferma, scelte su mittente/sicurezza/ordine quote vivono
lì; qui solo l'interfaccia esatta di ogni file e cosa testare).

## Global Constraints

- Non modificare `src/calcolo/divisioni.ts` (`dividiEqualmente` si usa
  com'è), `src/api/spese.ts`, `src/api/articoliSpesa.ts`, né alcuna
  migration esistente — questo piano **non aggiunge nessuna migration**:
  nessuna tabella nuova, la verifica di appartenenza al gruppo nella
  Edge Function usa la tabella `membri` e la sua RLS già esistenti.
- Modello Claude: `claude-opus-5`, come costante isolata e facile da
  cambiare (vedi design doc, nota sul costo) — non sostituirlo con un
  modello più economico di propria iniziativa.
- Chiave `ANTHROPIC_API_KEY`: solo come secret della Edge Function
  (`supabase secrets set`), mai in `.env`/`.env.example` (tutte le
  variabili lì sono `EXPO_PUBLIC_*`, pubbliche per design — questa non
  ci va mai). Applicare il secret al progetto reale richiede
  autorizzazione esplicita in chat, fuori da questo piano (stesso
  principio già seguito per `pg_cron`/deploy delle Edge Function di
  Calendario).
- La Edge Function `interpreta-azione` resta con la verifica JWT di
  default attiva (nessun `--no-verify-jwt`, a differenza di
  `invia-push-notifica`/`genera-promemoria-impegni`) e verifica
  l'appartenenza al gruppo con un client Supabase costruito
  sull'`Authorization` della richiesta (mai service role per questo
  controllo).
- Schema Zod delle azioni: duplicato identico in
  `src/calcolo/schemaAzioni.ts` e dentro la Edge Function (vedi design
  doc, "Correzione rispetto all'idea iniziale") — ogni modifica a uno va
  specchiata nell'altro, entrambi i file portano un commento che lo dice.
- Testi dell'interfaccia in italiano (CLAUDE.md).
- Nessuna persistenza delle interpretazioni passate, nessuna
  conversazione multi-turno per i chiarimenti, nessuna azione oltre
  `aggiungi_articolo`/`acquisto` — tutto esplicitamente fuori scope nel
  design doc.
- Branch `feature/interpretazione-testuale`, creato dal branch corrente
  (`feature/faccende-casa`); mai merge né push diretto su `main`.

## Review Focus

- Un nome che non corrisponde a esattamente un membro del gruppo (zero
  corrispondenze, o più di una per omonimia) non deve mai essere
  eseguito su un membro indovinato a caso: l'azione resta "da
  risolvere" finché non si scieglie a mano (Task 1, Task 6).
- Una risposta di Claude che, nonostante lo schema forzato, contenesse
  un tipo di azione non previsto o campi fuori forma viene scartata dal
  parsing Zod stesso (`discriminatedUnion` rifiuta tipi sconosciuti) e
  trattata come `ambiguo: true`, mai eseguita "alla meglio" (Task 1,
  Task 3).
- Una chiamata alla Edge Function con un `gruppoId` di cui chi chiama
  non fa parte riceve 403 **prima** di qualunque chiamata a Claude —
  nessun costo pagato per una richiesta non autorizzata (Task 2).
- L'ordine in cui Claude elenca i nomi in `diviso_tra` non deve cambiare
  chi riceve il centesimo in più nella divisione: stesso insieme di
  persone, ordine diverso nella frase → stessa distribuzione di
  centesimi (Task 1).
- Un'azione `acquisto` che nomina un articolo non più presente tra
  quelli "da comprare" (es. già segnato comprato da un altro membro nel
  frattempo) non deve far fallire la registrazione della spesa: il
  tentativo di segnarlo comprato diventa un no-op silenzioso se
  l'articolo non si trova più (Task 4).

---

## File Structure

```
src/calcolo/
  schemaAzioni.ts             (nuovo, puro)
  risoluzioneAzioni.ts         (nuovo, puro)
  risoluzioneAzioni.test.ts

supabase/functions/
  interpreta-azione/index.ts   (nuovo)

src/api/
  interpretazione.ts            (nuovo)

src/hooks/
  useInterpretazione.ts          (nuovo)

src/components/
  ConfermaAzioni.tsx              (nuovo)

app/(app)/
  _layout.tsx                     (modificato: nuova rotta)
  dashboard.tsx                    (modificato: nuova GlassTile)
  assistente/index.tsx              (nuovo)
```

---

### Task 1: Calcolo — schema azioni e risoluzione nomi

**Files:**
- Create: `src/calcolo/schemaAzioni.ts`
- Create: `src/calcolo/risoluzioneAzioni.ts`
- Test: `src/calcolo/risoluzioneAzioni.test.ts`

**Interfaces:**
- Consumes: `dividiEqualmente` da `src/calcolo/divisioni.ts`.
- Produces:
  - `SchemaRisposta` (Zod, da `schemaAzioni.ts`) e
    `type RispostaInterpretazione = z.infer<typeof SchemaRisposta>`
  - `interface MembroRisolvibile { id: string; nome: string }`
  - `risolviNome(nome: string, membri: MembroRisolvibile[]): { stato: 'risolto'; membroId: string } | { stato: 'non_risolto' }`
  - `ordinaSecondoMembriAttivi(idsMembri: string[], ordineCanonico: string[]): string[]`
  - `calcolaQuoteAcquisto(importoCentesimi: number, idsOrdinati: string[]): { membroId: string; quotaCentesimi: number }[]`

- [ ] **Step 1: Implementare `schemaAzioni.ts`**

```ts
import { z } from 'zod';

export const AzioneAggiungiArticolo = z.object({
  tipo: z.literal('aggiungi_articolo'),
  articoli: z.array(z.string().min(1)).min(1),
});

export const AzioneAcquisto = z.object({
  tipo: z.literal('acquisto'),
  articoli: z.array(z.string()),
  importo_euro: z.number().positive(),
  pagato_da: z.string().min(1),
  diviso_tra: z.array(z.string()).optional(),
});

// COPIA GEMELLA in supabase/functions/interpreta-azione/index.ts (Task 2):
// se cambi questo schema, cambia anche quello.
export const SchemaRisposta = z.object({
  azioni: z.array(z.discriminatedUnion('tipo', [AzioneAggiungiArticolo, AzioneAcquisto])),
  ambiguo: z.boolean(),
  domanda_chiarimento: z.string().nullable(),
});

export type RispostaInterpretazione = z.infer<typeof SchemaRisposta>;
```

Nessun test per questo file: è una dichiarazione di schema, la logica
che vale la pena testare è in `risoluzioneAzioni.ts`.

- [ ] **Step 2: Scrivere i test di `risolviNome`**

```ts
import { risolviNome } from './risoluzioneAzioni';

const membri = [
  { id: 'm1', nome: 'Marco' },
  { id: 'm2', nome: 'Giulia' },
];

describe('risolviNome', () => {
  it('risolve case-insensitive', () => {
    expect(risolviNome('marco', membri)).toEqual({ stato: 'risolto', membroId: 'm1' });
  });

  it('non risolve un nome che non corrisponde a nessun membro', () => {
    expect(risolviNome('Paolo', membri)).toEqual({ stato: 'non_risolto' });
  });

  it('non risolve se il nome corrisponde a più di un membro (omonimia)', () => {
    const conOmonimi = [...membri, { id: 'm3', nome: 'marco' }];
    expect(risolviNome('Marco', conOmonimi)).toEqual({ stato: 'non_risolto' });
  });

  it('ignora spazi iniziali/finali', () => {
    expect(risolviNome('  Giulia  ', membri)).toEqual({ stato: 'risolto', membroId: 'm2' });
  });
});
```

- [ ] **Step 3: Eseguire e verificare che falliscano, poi implementare**

`risolviNome` confronta `nome.trim().toLowerCase()` con
`membro.nome.trim().toLowerCase()` per ciascun membro; `non_risolto` se
il conteggio delle corrispondenze è 0 o > 1.

Run: `npx jest risoluzioneAzioni.test.ts -t risolviNome`
Expected: PASS

- [ ] **Step 4: Scrivere i test di `ordinaSecondoMembriAttivi` e `calcolaQuoteAcquisto`**

```ts
import { ordinaSecondoMembriAttivi, calcolaQuoteAcquisto } from './risoluzioneAzioni';

describe('ordinaSecondoMembriAttivi', () => {
  it('riordina secondo l\'ordine canonico, indipendentemente dall\'ordine di input', () => {
    const ordineCanonico = ['m1', 'm2', 'm3'];
    expect(ordinaSecondoMembriAttivi(['m3', 'm1'], ordineCanonico)).toEqual(['m1', 'm3']);
    expect(ordinaSecondoMembriAttivi(['m1', 'm3'], ordineCanonico)).toEqual(['m1', 'm3']);
  });
});

describe('calcolaQuoteAcquisto', () => {
  it('la stessa persona riceve il resto indipendentemente dall\'ordine con cui Claude ha elencato i nomi', () => {
    const ordineCanonico = ['m1', 'm2', 'm3'];
    const idsA = ordinaSecondoMembriAttivi(['m2', 'm3', 'm1'], ordineCanonico);
    const idsB = ordinaSecondoMembriAttivi(['m1', 'm2', 'm3'], ordineCanonico);
    expect(calcolaQuoteAcquisto(1000, idsA)).toEqual(calcolaQuoteAcquisto(1000, idsB));
  });

  it('le quote sommano all\'importo totale', () => {
    const quote = calcolaQuoteAcquisto(1000, ['m1', 'm2', 'm3']);
    expect(quote.reduce((tot, q) => tot + q.quotaCentesimi, 0)).toBe(1000);
  });
});
```

- [ ] **Step 5: Eseguire e verificare che falliscano, poi implementare**

`ordinaSecondoMembriAttivi` filtra `ordineCanonico` a solo gli id
presenti in `idsMembri`, mantenendo l'ordine di `ordineCanonico`.
`calcolaQuoteAcquisto` chiama `dividiEqualmente(importoCentesimi,
idsOrdinati.length)` e abbina l'array risultante a `idsOrdinati` per
indice.

Run: `npx jest risoluzioneAzioni.test.ts`
Expected: PASS, tutti i test verdi

- [ ] **Step 6: Commit**

```bash
git add src/calcolo/schemaAzioni.ts src/calcolo/risoluzioneAzioni.ts src/calcolo/risoluzioneAzioni.test.ts
git commit -m "feat: schema azioni e risoluzione nomi per l'interpretazione testuale"
```

---

### Task 2: Edge Function `interpreta-azione`

**Files:**
- Create: `supabase/functions/interpreta-azione/index.ts`

**Interfaces:**
- Consumes: nessuna dipendenza da `src/` (runtime Deno separato — vedi
  Global Constraints sulla duplicazione dello schema).
- Produces: endpoint HTTP che riceve
  `{ gruppoId: string; membriNomi: string[]; nomeMittente: string; testo: string }`
  e risponde con un body conforme a `SchemaRisposta` (Task 1, copiato
  qui) oppure `{ azioni: [], ambiguo: true, domanda_chiarimento: "Non ho capito bene, puoi riscriverla?" }`.

- [ ] **Step 1: Implementare il controllo di appartenenza al gruppo**

```ts
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const { gruppoId, membriNomi, nomeMittente, testo } = await req.json();

  const supabaseUtente = createClient(
    Deno.env.get('SUPABASE_URL') as string,
    Deno.env.get('SUPABASE_ANON_KEY') as string,
    { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } }
  );

  const { data: utente } = await supabaseUtente.auth.getUser();
  if (utente.user === null) {
    return new Response('non autenticato', { status: 401 });
  }

  const { data: membro } = await supabaseUtente
    .from('membri')
    .select('id')
    .eq('gruppo_id', gruppoId)
    .eq('utente_id', utente.user.id)
    .is('uscito_il', null)
    .maybeSingle();

  if (membro === null) {
    return new Response('non sei membro di questo gruppo', { status: 403 });
  }

  // Step 2 continua qui sotto
});
```

- [ ] **Step 2: Implementare la chiamata a Claude con output forzato**

Copiare lo schema Zod `SchemaRisposta` (Task 1) in questo file (commento
che rimanda al gemello in `src/calcolo/schemaAzioni.ts`). Import
`npm:@anthropic-ai/sdk@1` e `@anthropic-ai/sdk/helpers/zod`. System
prompt esatto:

```
Sei un interprete di comandi per un'app di gestione casa condivisa.
L'utente scrive una frase libera in italiano. Traducila in una lista di
azioni secondo lo schema fornito.

Chi scrive questa frase si chiama "${nomeMittente}". Quando la frase usa
la prima persona (io, ho comprato, ho speso, mi deve...) riferita a chi
scrive, usa il nome "${nomeMittente}" nei campi pagato_da/diviso_tra -
non scrivere mai "io".

I membri di questo gruppo sono: ${membriNomi.join(', ')}. Usa esattamente
questi nomi, stessa capitalizzazione, quando la frase li nomina o li
implica.

Se diviso_tra non è specificato per un acquisto, lascialo vuoto (il
codice dividerà automaticamente tra tutti i membri del gruppo).

Se la frase è ambigua, incompleta, o non descrive né un acquisto né
un'aggiunta alla lista della spesa, imposta ambiguo a true e scrivi una
domanda_chiarimento breve e specifica in italiano; in quel caso azioni
deve essere un array vuoto.
```

Chiamare `client.messages.parse({ model: 'claude-opus-5', max_tokens: 2048,
system: <sopra>, messages: [{ role: 'user', content: testo }], output_config: { format: zodOutputFormat(SchemaRisposta) } })`.
Se `response.parsed_output === null` o la chiamata lancia un'eccezione,
rispondere con il fallback `ambiguo: true` descritto sopra. Altrimenti
rispondere con `response.parsed_output` come JSON, status 200.

- [ ] **Step 3: Verifica statica**

Nessun framework di test Deno in questo progetto (stesso limite già
incontrato per le altre Edge Function): rileggere il file confrontandolo
con il design doc, in particolare: (a) il controllo di appartenenza usa
il client con l'`Authorization` della richiesta, mai service role; (b) la
chiamata a Claude avviene solo dopo quel controllo; (c) ogni percorso di
errore (non autenticato, non membro, parsing fallito, eccezione Claude)
restituisce comunque un body coerente, mai un crash non gestito. Non
eseguire `supabase functions deploy`.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/interpreta-azione/index.ts
git commit -m "feat: Edge Function di interpretazione testuale con controllo di appartenenza"
```

---

### Task 3: API — chiamata e validazione

**Files:**
- Create: `src/api/interpretazione.ts`

**Interfaces:**
- Consumes: `supabase` (`src/lib/supabase.ts`); `SchemaRisposta`,
  `RispostaInterpretazione` (Task 1).
- Produces:
  - `interpretaAzione(params: { gruppoId: string; membriNomi: string[]; nomeMittente: string; testo: string }): Promise<RispostaInterpretazione>`

Nessun file di test (API layer non testato in questo progetto, vedi
Task 1 del piano Calendario per lo stesso precedente).

- [ ] **Step 1: Implementare `interpretaAzione`**

```ts
export async function interpretaAzione(params: {
  gruppoId: string;
  membriNomi: string[];
  nomeMittente: string;
  testo: string;
}): Promise<RispostaInterpretazione> {
  const fallbackAmbiguo: RispostaInterpretazione = {
    azioni: [],
    ambiguo: true,
    domanda_chiarimento: 'Non ho capito bene, puoi riscriverla?',
  };

  const { data, error } = await supabase.functions.invoke('interpreta-azione', { body: params });
  if (error) {
    return fallbackAmbiguo;
  }

  const risultato = SchemaRisposta.safeParse(data);
  return risultato.success ? risultato.data : fallbackAmbiguo;
}
```

`supabase.functions.invoke` inoltra già l'`Authorization` della sessione
corrente — nessuna configurazione aggiuntiva lato client.

- [ ] **Step 2: Verificare**

Run: `npx tsc --noEmit`
Expected: 0 errori

- [ ] **Step 3: Commit**

```bash
git add src/api/interpretazione.ts
git commit -m "feat: API di interpretazione testuale con validazione Zod lato client"
```

---

### Task 4: API — esecuzione delle azioni confermate

**Files:**
- Modify: `src/api/interpretazione.ts`

**Interfaces:**
- Consumes: `aggiungiArticolo`, `listaArticoli`, `aggiornaArticolo`
  (`src/api/articoliSpesa.ts`); `creaSpesa` (`src/api/spese.ts`);
  `ordinaSecondoMembriAttivi`, `calcolaQuoteAcquisto` (Task 1).
- Produces:
  - `type AzioneRisolta = { azione: RispostaInterpretazione['azioni'][number]; idPerNome: Map<string, string> }`
  - `eseguiAzioniConfermate(gruppoId: string, creatoDaMembroId: string, ordineCanonicoMembriIds: string[], azioni: AzioneRisolta[]): Promise<void>`

- [ ] **Step 1: Implementare `eseguiAzioniConfermate`**

Per ogni azione, nell'ordine dell'array:
- `aggiungi_articolo`: `aggiungiArticolo(gruppoId, nome, creatoDaMembroId)` per ciascun nome in `articoli`.
- `acquisto`: risolve `pagato_da` e `diviso_tra` (default: tutti gli id
  in `ordineCanonicoMembriIds` se `diviso_tra` è assente/vuoto) tramite
  `idPerNome`; ordina con `ordinaSecondoMembriAttivi`; calcola le quote
  con `calcolaQuoteAcquisto(Math.round(azione.importo_euro * 100), idsOrdinati)`;
  chiama `creaSpesa({ gruppoId, pagatoDa: ..., importoCentesimi: ..., quote: ... })`.
  Poi, per ciascun nome in `azione.articoli`: legge `listaArticoli(gruppoId)`,
  cerca (case-insensitive) un articolo con `stato === 'da_comprare'` e
  quel nome; se trovato, `aggiornaArticolo(id, { stato: 'comprato', compratoDa: pagatoDaId })`;
  se non trovato, non fa nulla (nessun errore: l'articolo potrebbe
  essere già stato segnato da un altro membro, o non essere mai stato
  nella lista).

- [ ] **Step 2: Verificare**

Run: `npx tsc --noEmit`
Expected: 0 errori

- [ ] **Step 3: Commit**

```bash
git add src/api/interpretazione.ts
git commit -m "feat: esecuzione delle azioni di interpretazione testuale confermate"
```

---

### Task 5: Hook — `useInterpretazione`

**Files:**
- Create: `src/hooks/useInterpretazione.ts`

**Interfaces:**
- Consumes: `interpretaAzione`, `eseguiAzioniConfermate` (Task 3/4);
  `risolviNome` (Task 1); `useGruppoAttivo`; `useAuthStore`.
- Produces: `useInterpretazione(gruppoId: string | null)` →
  `{ interpreta: UseMutationResult<RispostaInterpretazione, unknown, string>; conferma: UseMutationResult<void, unknown, AzioneRisolta[]> }`

- [ ] **Step 1: Implementare l'hook**

`interpreta`: data una `testo: string`, legge `membriAttivi`
dall'hook `useGruppoAttivo`, calcola `nomeMittente` (il nome del membro
con `utente_id === utenteId` corrente) e chiama `interpretaAzione`.
`conferma`: chiama `eseguiAzioniConfermate` con l'ordine canonico preso
da `membriAttivi.map(m => m.id)`, poi invalida le query di
`useArticoliSpesa`/`useSpese` per il gruppo (stesse chiavi già usate da
quegli hook, es. `['articoli-spesa', gruppoId]`/`['spese', gruppoId]`)
così le liste si aggiornano senza attendere il Realtime.

- [ ] **Step 2: Verificare**

Run: `npx tsc --noEmit`
Expected: 0 errori

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useInterpretazione.ts
git commit -m "feat: hook useInterpretazione"
```

---

### Task 6: Componente — schermata di conferma

**Files:**
- Create: `src/components/ConfermaAzioni.tsx`

**Interfaces:**
- Consumes: `RispostaInterpretazione`, `risolviNome`,
  `MembroRisolvibile` (Task 1).
- Produces:
  ```ts
  <ConfermaAzioni
    azioni={RispostaInterpretazione['azioni']}
    membri={MembroRisolvibile[]}
    confermando={boolean}
    onConferma={(azioniRisolte: AzioneRisolta[]) => void}
  />
  ```

- [ ] **Step 1: Implementare il componente**

Stato locale: insieme degli indici rimossi con la `X` (parte da vuoto).
Per ogni azione non rimossa, riga leggibile: "Aggiungi: {articoli.join(', ')}"
per `aggiungi_articolo`; "Registra spesa: {importo_euro}€ pagati da
{pagato_da}, divisi tra {diviso_tra?.join(', ') ?? 'tutti'}" per
`acquisto`. Per ogni nome citato (pagato_da, ogni elemento di
diviso_tra, ogni nome implicito in articoli non si applica) che
`risolviNome` non risolve: un `Picker`/menu a tendina con i nomi di
`membri` al posto del testo semplice, e l'azione resta "non risolta"
finché non si scieglie un valore. Bottone "Conferma" unico in fondo,
disabilitato se `confermando` o se una qualunque azione non rimossa ha
ancora un nome non risolto; alla pressione, costruisce l'array
`AzioneRisolta[]` (azioni non rimosse, con una `Map` nome→membroId presa
dalle risoluzioni/scelte manuali) e chiama `onConferma`.

- [ ] **Step 2: Verificare**

Run: `npx tsc --noEmit`
Expected: 0 errori

- [ ] **Step 3: Commit**

```bash
git add src/components/ConfermaAzioni.tsx
git commit -m "feat: schermata di conferma delle azioni interpretate"
```

---

### Task 7: Schermata Assistente

**Files:**
- Create: `app/(app)/assistente/index.tsx`
- Modify: `app/(app)/_layout.tsx`

**Interfaces:**
- Consumes: `useInterpretazione` (Task 5), `ConfermaAzioni` (Task 6),
  `useGruppoAttivo`.
- Produces: rotta `/assistente`.

- [ ] **Step 1: Registrare la rotta**

In `_layout.tsx`, aggiungere
`<Stack.Screen name="assistente/index" options={{ title: 'Scrivi' }} />`.

- [ ] **Step 2: Implementare la schermata**

Campo di testo libero (`TextInput` multilinea) + bottone "Invia" (chiama
`interpreta.mutate(testo)`, disabilitato mentre `interpreta.isPending` o
testo vuoto). Quando arriva una risposta: se `ambiguo`, mostra
`domanda_chiarimento` come messaggio sopra al campo (che resta
modificabile, nessuna nuova chiamata automatica); altrimenti mostra
`<ConfermaAzioni>` con le azioni ricevute. Alla conferma
(`onConferma`), chiama `conferma.mutate(azioniRisolte)` e, a successo,
svuota il campo di testo e torna allo stato iniziale (pronto per una
nuova frase).

- [ ] **Step 3: Verificare manualmente**

Run: `npm start`
Expected: scrivere "ho comprato il sale e la pasta e ho speso 4 euro" (in
un gruppo con almeno due membri) produce una schermata di conferma con
un'azione "Aggiungi: sale, pasta" e una "Registra spesa: 4€...";
confermare aggiunge gli articoli come comprati e registra la spesa.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/assistente/index.tsx" "app/(app)/_layout.tsx"
git commit -m "feat: schermata Assistente per l'interpretazione testuale"
```

---

### Task 8: Dashboard — tile Assistente

**Files:**
- Modify: `app/(app)/dashboard.tsx`

**Interfaces:**
- Consumes: nessuna nuova dipendenza oltre a `router`/`GlassTile` già
  importati in questo file.

- [ ] **Step 1: Aggiungere la tile**

Nuova `GlassTile` nella griglia esistente: `icona="edit-3"` (Feather),
accento a scelta del builder tra quelli già usati altrove nel tema (non
restano colori `accenti` inutilizzati dopo la tile Calendario — va bene
riusarne uno), `titolo="Scrivi"`, nessun sottotitolo fisso (es.
`"Aggiungi con una frase"`), `onPress={() => router.push('/assistente')}`.

- [ ] **Step 2: Verificare manualmente**

Run: `npm start`
Expected: la tile compare nella Dashboard e naviga a `/assistente`.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/dashboard.tsx"
git commit -m "feat: tile Assistente nella Dashboard"
```

---

## Self-Review

**Copertura dello spec:** Goal 1 (campo di testo): Task 7. Goal 2 (Edge
Function + Zod): Task 1, 2, 3. Goal 3 (conferma sempre, un bottone):
Task 6. Goal 4 (esecuzione con funzioni esistenti, zero calcoli nuovi):
Task 4 (riusa `dividiEqualmente`/`creaSpesa`/`aggiungiArticolo`/
`aggiornaArticolo` invariati). Goal 5 (risoluzione nome→membro
deterministica + correzione a mano): Task 1, Task 6. Le cinque scelte
segnate "mia" nel design doc (mittente, sicurezza/appartenenza, bottone
unico, cosa è correggibile, ordine quote) sono rispettivamente in
Task 2, Task 2, Task 6, Task 6, Task 1/4.

**Proporzione:** i blocchi di codice sono per lo più test con asserzioni
esatte, lo schema Zod (dato pinnato dal design doc) e il system prompt
esatto (copia che lo spec fissa); la logica applicativa è descritta per
firma e algoritmo in prosa.
