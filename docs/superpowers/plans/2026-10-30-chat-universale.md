# Chat universale (liste generiche e calendario) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** estendere l'Assistente (interpretazione testuale già in produzione/review) a due nuovi domini — liste generiche (film, ristoranti, ecc.) e calendario — mantenendo lo stesso principio di sicurezza (conferma sempre obbligatoria, mai eseguire un nome non risolto su un membro a caso).

**Architecture:** due nuovi tipi di azione nello stesso schema Zod discriminato già usato da `aggiungi_articolo`/`acquisto`; lo stesso `ConfermaAzioni`/`eseguiAzioniConfermate` vengono estesi con un branch per tipo, riusando l'infrastruttura di risoluzione nomi già costruita. Nessuna nuova schermata: `app/(app)/assistente/index.tsx` resta invariata (già agnostica rispetto al dominio). Un impegno via chat introduce un concetto nuovo nello schema dati — l'assegnatario — che va esposto anche nella creazione/modifica manuale esistente del calendario, non solo nella chat.

**Tech Stack:** React Native + Expo + TypeScript, Supabase (Postgres + RLS + Edge Functions), TanStack React Query, Zod v4, SDK Anthropic (`claude-opus-5`, `messages.parse` + `zodOutputFormat`).

**Spec:** `docs/superpowers/specs/2026-10-30-chat-universale-design.md`

## Global Constraints

- Branch `feature/chat-universale`, creato da `feature/interpretazione-testuale` (la cui PR non è ancora mergiata al momento di scrivere questo piano — se nel frattempo è stata mergiata, creare da `feature/faccende-casa` invece). Mai merge né push diretto su main.
- **Conferma sempre obbligatoria su ogni azione**, nessuna eccezione per azioni "ovvie" — vale anche per i due nuovi tipi, stesso meccanismo di `ConfermaAzioni` già in produzione.
- **Nessuna modifica/cancellazione** di elementi esistenti tramite chat in questa fase — solo aggiunte. Fuori scope.
- **Faccende di casa fuori scope** in questa fase.
- Liste generiche create al volo: `mostraInHome: false`, `conPrezzi: false` di default (decisione del design doc).
- Impegni creati via chat: sempre `frequenza: 'una_tantum'` (nessun riconoscimento di ricorrenze dette a parole in questa fase), `intervalloRicorrenza: null`, `promemoriaMinutiPrima: null`, `modificabileDaTutti: true`, `descrizione: null` (un impegno via chat porta solo titolo/data/ora/assegnatario — la descrizione non è un campo naturale da dettare in una frase breve).
- **Risoluzione di date relative ("domani", "venerdì"):** il system prompt riceve la data di oggi nel fuso orario del gruppo e l'LLM restituisce direttamente una data assoluta `YYYY-MM-DD`. Decisione architetturale esplicita: capire "domani" rispetto a "oggi" è interpretazione del linguaggio (il lavoro dell'AI), non calcolo deterministico di soldi/punteggi — non viola "l'AI interpreta, il codice calcola" (quella regola riguarda la matematica dei soldi, non la comprensione del linguaggio). Un parser di date relative lato codice è fuori scope per questa fase.
- `assegnato_a` di un impegno è **nullable** e **non è un filtro di accesso/RLS** — tutti i membri del gruppo vedono sempre tutti gli impegni, è solo un'informazione in più su "per chi è".
- La chiave API di Claude resta solo lato Edge Function.
- `src/types/database.types.ts` va aggiornato a mano (coerente con la convenzione già usata in questo progetto per le migration precedenti — nessun accesso Docker/DB locale in questo ambiente per rigenerarlo automaticamente).

## Review Focus

- Una lista generica nominata che esiste già nel gruppo ma con differenze di maiuscole/spazi (es. "Film" vs "film ") non deve creare un duplicato: il confronto per trovare la lista esistente deve essere case-insensitive e trim, come già fa `risolviNome` per i nomi di persona (Task 4).
- Un nome di assegnatario che non corrisponde a esattamente un membro (zero corrispondenze, o più di una per omonimia) non deve mai essere eseguito su un membro indovinato a caso: l'azione resta "da risolvere" finché non si sceglie a mano, stesso principio già garantito per `pagato_da`/`diviso_tra` (Task 2, Task 5).
- Un impegno creato via chat senza nome di assegnatario esplicito nella frase deve restare di gruppo (`assegnato_a: null`), non assegnato per errore a chi scrive la frase o al primo membro della lista (Task 4).
- Una frase che nomina insieme più domini diversi (es. "aggiungi il latte e metti un appuntamento dal dentista domani") deve produrre un array di azioni di tipi diversi nella stessa risposta, non solo il primo tipo riconosciuto — il parsing Zod discriminato deve accettare un mix di tipi nello stesso array (Task 2).
- Un impegno appena creato via chat deve comparire subito in Calendario senza dover riaprire la schermata: la generazione delle occorrenze va innescata subito dopo la creazione, stesso comportamento già garantito dalla creazione manuale (Task 4).

---

## File Structure

```
supabase/migrations/
  00000000000032_impegni_assegnatario.sql   (nuovo)

src/types/database.types.ts                  (modificato a mano)

src/api/impegni.ts                           (modificato: assegnatoA)
src/hooks/useImpegni.ts                      (modificato: assegnatoA)

src/calcolo/schemaAzioni.ts                  (modificato: 2 nuovi tipi)
src/calcolo/schemaAzioni.test.ts             (nuovo)
supabase/functions/interpreta-azione/index.ts (modificato: schema gemello + prompt)

src/api/interpretazione.ts                   (modificato: eseguiAzioniConfermate)
src/hooks/useInterpretazione.ts              (modificato: invalidazione cache)

src/components/ConfermaAzioni.tsx            (modificato: 2 nuovi rendering)

src/components/ModificaImpegno.tsx           (modificato: campo assegnatario)
app/(app)/calendario/index.tsx               (modificato: wiring + display assegnatario)
```

---

### Task 1: Database — colonna assegnatario sugli impegni

**Files:**
- Create: `supabase/migrations/00000000000032_impegni_assegnatario.sql`
- Modify: `src/types/database.types.ts` (tabella `impegni`, a mano)
- Modify: `src/api/impegni.ts`

**Interfaces:**
- Produces: `ParametriImpegno` (in `src/api/impegni.ts`) guadagna il campo
  `assegnatoA: string | null`; `creaImpegno`/`modificaImpegno` scrivono la
  colonna `assegnato_a`. Consumato da Task 4 (esecuzione chat) e Task 6
  (form manuale).

- [ ] **Step 1: Scrivere la migration**

```sql
alter table public.impegni
  add column assegnato_a uuid references public.membri (id) on delete set null;
```

Nessuna modifica a RLS/grant: `assegnato_a` non è un filtro di accesso (vedi
Global Constraints) e il grant di tabella su `impegni` copre già tutte le
colonne.

- [ ] **Step 2: Aggiornare `src/types/database.types.ts` a mano**

Nel blocco `impegni` (`Row`, `Insert`, `Update`), aggiungere
`assegnato_a: string | null` (opzionale in `Insert`:
`assegnato_a?: string | null`), stessa forma delle altre colonne nullable
già presenti (es. `descrizione`).

- [ ] **Step 3: Estendere `src/api/impegni.ts`**

`ParametriImpegno` guadagna `assegnatoA: string | null`. Sia `creaImpegno`
che `modificaImpegno` passano `assegnato_a: params.assegnatoA` nel
payload insert/update, stesso pattern degli altri campi.

- [ ] **Step 4: Verificare**

Run: `npx tsc --noEmit`
Expected: 0 errori (nessun test automatico per una migration — nessun
accesso Docker/DB locale in questo ambiente; la migration va letta/rivista
a mano e applicata al progetto live solo con autorizzazione esplicita).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/00000000000032_impegni_assegnatario.sql src/types/database.types.ts src/api/impegni.ts
git commit -m "feat: colonna assegnato_a su impegni"
```

---

### Task 2: Calcolo — due nuovi tipi di azione nello schema

**Files:**
- Modify: `src/calcolo/schemaAzioni.ts`
- Create: `src/calcolo/schemaAzioni.test.ts`

**Interfaces:**
- Produces: `AzioneAggiungiVoceLista`, `AzioneCreaImpegno` (nuovi membri del
  discriminated union `SchemaRisposta.azioni`). Consumati da Task 3 (copia
  gemella nella Edge Function), Task 4 (esecuzione), Task 5 (rendering in
  `ConfermaAzioni`).

- [ ] **Step 1: Scrivere i due nuovi schemi Zod**

In `src/calcolo/schemaAzioni.ts`, accanto a `AzioneAggiungiArticolo`/`AzioneAcquisto`:

```ts
export const AzioneAggiungiVoceLista = z.object({
  tipo: z.literal('aggiungi_voce_lista'),
  nomeLista: z.string().min(1),
  voci: z.array(z.string().min(1)).min(1),
});

export const AzioneCreaImpegno = z.object({
  tipo: z.literal('crea_impegno'),
  titolo: z.string().min(1),
  dataInizio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ora: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  assegnatoA: z.string().nullable(),
});
```

Aggiungere entrambi all'array del `discriminatedUnion` dentro
`SchemaRisposta`:
`z.discriminatedUnion('tipo', [AzioneAggiungiArticolo, AzioneAcquisto, AzioneAggiungiVoceLista, AzioneCreaImpegno])`.

Nessun campo `descrizione` nello schema dell'impegno (vedi Global
Constraints: non è un campo naturale da dettare in una frase breve, resta
sempre `null` lato esecuzione).

- [ ] **Step 2: Scrivere i test**

```ts
import { SchemaRisposta } from './schemaAzioni';

describe('SchemaRisposta - nuovi tipi di azione', () => {
  test('accetta aggiungi_voce_lista valido', () => {
    const risultato = SchemaRisposta.safeParse({
      azioni: [{ tipo: 'aggiungi_voce_lista', nomeLista: 'film', voci: ['Inception'] }],
      ambiguo: false,
      domanda_chiarimento: null,
    });
    expect(risultato.success).toBe(true);
  });

  test('accetta crea_impegno valido con assegnatoA null', () => {
    const risultato = SchemaRisposta.safeParse({
      azioni: [
        { tipo: 'crea_impegno', titolo: 'Dentista', dataInizio: '2026-11-02', ora: '18:00', assegnatoA: null },
      ],
      ambiguo: false,
      domanda_chiarimento: null,
    });
    expect(risultato.success).toBe(true);
  });

  test('accetta crea_impegno valido con assegnatoA valorizzato e ora null', () => {
    const risultato = SchemaRisposta.safeParse({
      azioni: [
        { tipo: 'crea_impegno', titolo: 'Dentista', dataInizio: '2026-11-02', ora: null, assegnatoA: 'Marco' },
      ],
      ambiguo: false,
      domanda_chiarimento: null,
    });
    expect(risultato.success).toBe(true);
  });

  test('rifiuta crea_impegno con dataInizio in formato sbagliato', () => {
    const risultato = SchemaRisposta.safeParse({
      azioni: [
        { tipo: 'crea_impegno', titolo: 'Dentista', dataInizio: '2/11/2026', ora: null, assegnatoA: null },
      ],
      ambiguo: false,
      domanda_chiarimento: null,
    });
    expect(risultato.success).toBe(false);
  });

  test('accetta un array con tipi misti nella stessa risposta', () => {
    const risultato = SchemaRisposta.safeParse({
      azioni: [
        { tipo: 'aggiungi_articolo', articoli: ['latte'] },
        { tipo: 'crea_impegno', titolo: 'Dentista', dataInizio: '2026-11-02', ora: null, assegnatoA: null },
      ],
      ambiguo: false,
      domanda_chiarimento: null,
    });
    expect(risultato.success).toBe(true);
  });

  test('rifiuta un tipo di azione sconosciuto', () => {
    const risultato = SchemaRisposta.safeParse({
      azioni: [{ tipo: 'cancella_tutto', qualcosa: true }],
      ambiguo: false,
      domanda_chiarimento: null,
    });
    expect(risultato.success).toBe(false);
  });
});
```

- [ ] **Step 3: Eseguire i test**

Run: `npx jest schemaAzioni.test.ts`
Expected: 6/6 pass

- [ ] **Step 4: Verificare**

Run: `npx tsc --noEmit`
Expected: 0 errori

- [ ] **Step 5: Commit**

```bash
git add src/calcolo/schemaAzioni.ts src/calcolo/schemaAzioni.test.ts
git commit -m "feat: schema azioni per liste generiche e impegni"
```

---

### Task 3: Edge Function — schema gemello e prompt estesi

**Files:**
- Modify: `supabase/functions/interpreta-azione/index.ts`

**Interfaces:**
- Consumes: `AzioneAggiungiVoceLista`, `AzioneCreaImpegno` (Task 2, da
  replicare come copia gemella — vedi commento esistente nel file: "se
  cambi questo schema, cambia anche quello").
- Consumes: `gruppoId`, `membriNomi`, `nomeMittente`, `testo` (invariati,
  stessa richiesta di oggi).

- [ ] **Step 1: Replicare i due nuovi schemi Zod**

Stessa forma esatta di Task 2 (stessi campi, stessi vincoli), copiata nel
blocco "COPIA GEMELLA" già presente in questo file. Aggiungere entrambi
all'array del `discriminatedUnion` della `SchemaRisposta` locale.

- [ ] **Step 2: Estendere il system prompt**

Il prompt oggi (vedi file) spiega chi scrive, i membri del gruppo, e le
regole per `acquisto`. Aggiungere, nello stesso stile e lingua:

- La data di oggi nel fuso orario del gruppo, così l'LLM può risolvere
  espressioni relative ("domani", "venerdì", "tra due settimane") in una
  data assoluta `YYYY-MM-DD`. Serve leggere il fuso orario del gruppo: la
  funzione già riceve `gruppoId` e ha un client Supabase autenticato —
  leggere `impostazioni_faccende.fuso_orario` per quel gruppo (stessa
  tabella/logica di `leggiFusoOrarioGruppo` in `src/api/impegni.ts`, non
  importabile direttamente da un'Edge Function Deno: va fatta una query
  diretta equivalente), con fallback `'Europe/Rome'` se non impostato o il
  modulo Faccende non è ancora attivo per quel gruppo (stesso fallback già
  usato lato app).
- Istruzioni per `aggiungi_voce_lista`: quando la frase chiede di aggiungere
  qualcosa a una lista con un nome esplicito (es. "film", "ristoranti",
  "libri da leggere" — qualunque nome l'utente usi, non solo questi
  esempi), usa questo tipo di azione con `nomeLista` esattamente come
  nominata nella frase (il codice si occupa di cercarla o crearla, non
  deve indovinare se esiste già).
- Istruzioni per `crea_impegno`: quando la frase descrive un appuntamento,
  evento o impegno con una data, usa questo tipo di azione. `assegnatoA`
  è il nome della persona per cui è l'impegno, se la frase lo specifica
  esplicitamente (es. "Marco ha il dentista") — altrimenti `null` (impegno
  di gruppo, NON assumere mai che sia per chi scrive la frase a meno che
  non lo dica esplicitamente, es. "ho il dentista domani" → `assegnatoA`
  uguale a `${nomeMittente}`, perché lì la prima persona lo specifica
  comunque esplicitamente, stessa regola già esistente per `pagato_da` in
  `acquisto`).
- Chiarire che la lista della spesa (`aggiungi_articolo`) è un dominio
  separato dalle liste generiche (`aggiungi_voce_lista`): "metti il latte
  in lista" va sempre a `aggiungi_articolo`, mai trattato come una lista
  generica chiamata "spesa" o "lista della spesa".

- [ ] **Step 3: Verificare**

Run: `npx tsc --noEmit` (o il check equivalente Deno già in uso nel
progetto per questa funzione, se diverso da tsc — verificare come fatto
nella fase precedente).
Expected: 0 errori

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/interpreta-azione/index.ts
git commit -m "feat: interpreta-azione riconosce liste generiche e impegni"
```

---

### Task 4: API — esecuzione delle due nuove azioni

**Files:**
- Modify: `src/api/interpretazione.ts`
- Modify: `src/hooks/useInterpretazione.ts`

**Interfaces:**
- Consumes: `AzioneAggiungiVoceLista`, `AzioneCreaImpegno` (Task 2);
  `listaListe`, `creaLista`, `aggiungiVoce` (`src/api/liste.ts`,
  `src/api/vociLista.ts`, già esistenti, firme invariate); `creaImpegno`,
  `leggiFusoOrarioGruppo`, `sincronizzaOccorrenzeImpegni` (Task 1 per
  `creaImpegno` con `assegnatoA`, resto già esistente in
  `src/api/impegni.ts`).
- Produces: `eseguiAzioniConfermate` gestisce tutti e 4 i tipi di azione
  (invariati i due esistenti). Nessuna modifica alla firma pubblica di
  `eseguiAzioniConfermate`/`AzioneRisolta`.

- [ ] **Step 1: Estendere `eseguiAzioniConfermate` per `aggiungi_voce_lista`**

Per ogni azione di questo tipo, nel ciclo esistente (stesso `for...of`
sequenziale, stesso ordine delle azioni):
1. Cerca tra `listaListe(gruppoId)` una lista il cui `nome` (trim +
   lowercase) coincide con `azione.nomeLista` (trim + lowercase) — stesso
   confronto case-insensitive già usato da `risolviNome` per i nomi di
   persona (Review Focus: evitare duplicati per differenze di
   maiuscole/spazi).
2. Se non trovata, creala con
   `creaLista({ gruppoId, nome: azione.nomeLista.trim(), creatoDaMembroId, mostraInHome: false, conPrezzi: false })`.
3. Per ogni voce in `azione.voci`, chiama
   `aggiungiVoce(listaId, voce, creatoDaMembroId)`.

- [ ] **Step 2: Estendere `eseguiAzioniConfermate` per `crea_impegno`**

1. Se `azione.assegnatoA !== null`, risolvi l'id tramite
   `idPerNome.get(azione.assegnatoA)` — se non presente, lancia un errore
   chiaro in italiano (stesso principio già applicato a `pagato_da`/
   `diviso_tra`: mai eseguire su un membro indovinato a caso, Review
   Focus). Se `azione.assegnatoA === null`, l'id risolto resta `null`
   (impegno di gruppo).
2. Chiama `creaImpegno({ gruppoId, membroId: creatoDaMembroId, titolo: azione.titolo, descrizione: null, dataInizio: azione.dataInizio, ora: azione.ora, frequenza: 'una_tantum', intervalloRicorrenza: null, promemoriaMinutiPrima: null, modificabileDaTutti: true, assegnatoA: idAssegnatoRisolto })`.
3. Subito dopo, genera le occorrenze come fa già la creazione manuale
   (`useImpegni`'s `crea` mutation): `leggiFusoOrarioGruppo(gruppoId)` poi
   `sincronizzaOccorrenzeImpegni(gruppoId, fusoOrario)` — senza questo
   passaggio l'impegno resterebbe senza occorrenze visibili finché
   l'utente non riapre la schermata Calendario (Review Focus).

- [ ] **Step 3: Estendere l'invalidazione cache in `useInterpretazione.ts`**

Nel successo di `conferma` (oggi invalida solo `['articoli-spesa', gruppoId]`
e `['spese', gruppoId]`), aggiungere `['liste', gruppoId]`,
`['impegni', gruppoId]`, `['occorrenze-impegni', gruppoId]` — stesse chiavi
esatte usate da `useListe`/`useImpegni`. Stesso motivo già documentato per
le due chiavi esistenti: dare feedback immediato senza aspettare il
round-trip del Realtime.

- [ ] **Step 4: Verificare**

Run: `npx tsc --noEmit`
Expected: 0 errori

- [ ] **Step 5: Commit**

```bash
git add src/api/interpretazione.ts src/hooks/useInterpretazione.ts
git commit -m "feat: esecuzione di liste generiche e impegni dalla chat"
```

---

### Task 5: Componente ConfermaAzioni — rendering dei due nuovi tipi

**Files:**
- Modify: `src/components/ConfermaAzioni.tsx`

**Interfaces:**
- Consumes: `AzioneAggiungiVoceLista`, `AzioneCreaImpegno` (Task 2).

- [ ] **Step 1: Estendere `nomiNecessari`**

```ts
function nomiNecessari(azione: Azione): string[] {
  if (azione.tipo === 'acquisto') {
    const nomiDivisoTra = azione.diviso_tra && azione.diviso_tra.length > 0 ? azione.diviso_tra : [];
    return [azione.pagato_da, ...nomiDivisoTra];
  }
  if (azione.tipo === 'crea_impegno' && azione.assegnatoA !== null) {
    return [azione.assegnatoA];
  }
  return [];
}
```

- [ ] **Step 2: Estendere il rendering per tipo**

Il ternario attuale (`aggiungi_articolo` vs `acquisto`, tramite
`RigaAcquisto`) diventa un dispatch sui 4 tipi. Due nuovi componenti riga,
stesso pattern di `RigaAcquisto` (testo con placeholder "(scegli)" per i
nomi non risolti + `SelettoreMembro` sotto):

- `aggiungi_voce_lista`: `Aggiungi a "{nomeLista}": {voci.join(', ')}`
  (nessun nome da risolvere, riga semplice come `aggiungi_articolo`).
- `crea_impegno`: testo tipo
  `Crea impegno: "{titolo}" il {dataInizio}` + (se `ora !== null`)
  ` alle {ora}` + sempre un pezzo finale: se `assegnatoA === null`,
  `, di gruppo`; se non `null`, `, assegnato a {testoNome(assegnatoA)}`
  (con lo stesso placeholder "(scegli)" e `SelettoreMembro` sotto se non
  risolto, stesso meccanismo di `RigaAcquisto`).

- [ ] **Step 3: Verificare**

Run: `npx tsc --noEmit`
Expected: 0 errori

- [ ] **Step 4: Commit**

```bash
git add src/components/ConfermaAzioni.tsx
git commit -m "feat: ConfermaAzioni mostra liste generiche e impegni"
```

---

### Task 6: Form manuale calendario — campo "Assegnato a"

**Files:**
- Modify: `src/components/ModificaImpegno.tsx`
- Modify: `src/hooks/useImpegni.ts`
- Modify: `app/(app)/calendario/index.tsx`

**Interfaces:**
- Consumes: `ParametriImpegno` con `assegnatoA` (Task 1); `membriAttivi`
  (già disponibile in `CalendarioDelGruppo` tramite `useGruppoAttivo()`).

- [ ] **Step 1: Estendere `ValoriImpegno` e il form**

In `src/components/ModificaImpegno.tsx`: `ValoriImpegno` guadagna
`assegnatoA: string | null`. Il componente guadagna una nuova prop
`membri: MembroRisolvibile[]` (o il tipo equivalente con almeno `id`/
`nome` — `membriAttivi` da `useGruppoAttivo` è strutturalmente
compatibile). Nuovo campo nel form, stesso pattern chip-row già usato
altrove nell'app per "pagato da" (`app/(app)/spese/nuova.tsx`): una riga
di chip con tutti i membri più un chip "Nessuno" (per tornare a
`assegnato_a: null`), stato locale inizializzato da
`valoriIniziali?.assegnatoA ?? null`, incluso in `onSalva`.

- [ ] **Step 2: Estendere `useImpegni.ts`**

`ParametriImpegnoForm` guadagna `assegnatoA: string | null` (la
`mutationFn` di `crea`/`modifica` già spread l'intero oggetto verso
`creaImpegno`/`modificaImpegno`, che da Task 1 accettano già il campo —
nessun'altra modifica necessaria qui oltre al tipo).

- [ ] **Step 3: Collegare in `calendario/index.tsx`**

- Passare `membri={membriAttivi}` a `<ModificaImpegno>`.
- In `valoriInizialiForm()`: ramo modifica,
  `assegnatoA: impegnoInModifica.assegnato_a`; ramo creazione,
  `assegnatoA: null`.
- Nella card di ogni occorrenza del giorno (dove oggi compaiono titolo,
  descrizione, ora), se `impegno?.assegnato_a` non è `null`, mostrare una
  riga in più col nome del membro (risolto cercando l'id in
  `membriAttivi`, fallback a un testo generico se il membro non è più
  attivo — stesso tipo di fallback già usato altrove nell'app per un
  membro uscito).

- [ ] **Step 4: Verificare**

Run: `npx tsc --noEmit`
Expected: 0 errori

- [ ] **Step 5: Verificare manualmente**

Run: `npm start`
Expected: nel form manuale di un nuovo impegno compare il selettore
"Assegnato a" con i membri del gruppo + "Nessuno"; salvando con un membro
scelto, la card del giorno mostra il suo nome.

- [ ] **Step 6: Commit**

```bash
git add src/components/ModificaImpegno.tsx src/hooks/useImpegni.ts "app/(app)/calendario/index.tsx"
git commit -m "feat: campo assegnato a nel form manuale del calendario"
```

---

## Self-Review

**Copertura dello spec:** liste generiche (creazione al volo + aggiunta
voci): Task 2, 3, 4, 5. Calendario (creazione impegno + assegnatario):
Task 1, 2, 3, 4, 5, 6. Conferma sempre su tutto: riuso del meccanismo
esistente in `ConfermaAzioni`, nessuna modifica necessaria a quella
regola — già vale per design (Task 5 estende il rendering, non la
regola). Nessuna cronologia visibile: nessuna modifica necessaria,
`app/(app)/assistente/index.tsx` resta invariata. Fuori scope (faccende,
modifica/cancellazione): nessun task li tocca, coerente col design doc.

**Proporzione:** gli unici blocchi di codice completi sono lo schema Zod
(Task 2, dato pinnato dal design) e i suoi test (assertion esatte); la
logica di esecuzione (Task 4), il prompt (Task 3) e il rendering (Task 5)
sono descritti per firma/algoritmo in prosa, coerente con la fase
precedente.
