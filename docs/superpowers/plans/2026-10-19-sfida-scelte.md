# Sfida delle scelte Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trasformare qualunque lista condivisa Bento in una sfida di
decisione di gruppo a 3 preferenze segrete, con domanda generata
automaticamente, scadenza voto indipendente dalla data dell'attività,
calcolo deterministico del vincitore/spareggio lato server, notifiche
interne e storico completo.

**Architecture:** Stesso schema a 3 livelli già usato nel modulo
Faccende: calcolo puro e testato in `src/calcolo/` (datazione, domanda
automatica, algoritmo del vincitore), API typed + RPC Postgres
`security invoker` per tutto ciò che deve essere atomico o segreto
(creazione sfida, conferma voti, chiusura turno, spareggio/ritentativo,
scadenza), hook React Query con Realtime per la UI. Segretezza dei voti
garantita in RLS (mai una riga di voto scritta prima della conferma
atomica; i conteggi finali vivono in una tabella di risultati separata,
scritta una sola volta a chiusura turno, così `sfide_voti` resta privata
per sempre anche dopo la conclusione).

**Tech Stack:** React Native + Expo Router, TypeScript, Supabase
(Postgres + RLS + RPC + Realtime), TanStack React Query, Zustand,
Jest. Nessuna libreria nuova.

**Spec:** `docs/superpowers/specs/2026-10-19-sfida-scelte-design.md`
(questo piano assume quel documento letto per intero: nomi di colonne,
RPC, regole di business e scelte di default vivono lì, qui solo
l'interfaccia esatta di ogni file e cosa testare).

## Global Constraints

- Non modificare `src/calcolo/saldi.ts`, `src/calcolo/divisioni.ts`,
  `src/calcolo/tipi.ts`, `src/api/spese.ts`, `src/hooks/useSpese.ts`, né
  alcuna migration già applicata (`00000000000001`...`00000000000014`).
- Nessuna nuova libreria UI: riuso di `GlassCard`, `Badge`,
  `BentoButton`, `SectionHeader`, `IconBadge`, `Avatar`, `BentoScreen`.
- Ogni nuova RPC è `security invoker`; l'identità dell'esecutore si
  ricava sempre da `auth.uid()` via `membri`, mai da un parametro.
- RLS su tutte le nuove tabelle via `e_membro_di(gruppo_id)` (definita
  in `00000000000001`/`00000000000008`, non va toccata).
- Migrazioni nuove sempre append-only; applicazione al progetto
  Supabase collegato solo dopo autorizzazione esplicita in chat (stesso
  processo già seguito per il modulo Faccende).
- Fuso orario fisso `'Europe/Rome'` per tutte le date; riuso **senza
  modifiche** di `dataLocaleISO`/`fineGiornoISO`/`aggiungiGiorni`/
  `inizioSettimanaISO`/`fineSettimanaISO` da
  `src/calcolo/ricorrenzaFaccende.ts`.
- Fascia "sera" (stasera/domani sera/venerdì sera) = **19:00–23:59**
  locali del giorno risolto.
- Un'opzione vince un turno a 3 scelte solo se ha **almeno 2 voti** ed
  è l'unica al conteggio massimo; in un turno di spareggio (1 scelta)
  basta essere l'unica al conteggio massimo, qualunque esso sia.
- Mai un secondo spareggio: un turno `spareggio` ancora in parità
  termina `concluso_senza_accordo`, mai un altro turno automatico.
- Nessuna notifica push nativa in questa fase: solo righe in
  `notifiche`, lette via Realtime.
- Branch `feature/sfida-scelte`, creato da `feature/faccende-casa`; mai
  merge né push diretto su `main`.

## Review Focus

- Un partecipante naviga via dal form di voto prima di premere "Conferma
  le mie 3 scelte": nessuna riga deve comparire in `sfide_voti` per lui
  — le selezioni locali non salvate si perdono, non esiste una bozza
  lato server (Task 6, Task 11).
- Due tap quasi simultanei su "Conferma le mie 3 scelte" per lo stesso
  turno/membro (doppio tap, rete lenta) non devono inserire voti
  duplicati né permettere un secondo voto valido (Task 6).
- Un'opzione personalizzata proposta con spazi/maiuscole/accenti diversi
  da una già proposta da un altro membro nella stessa sfida ("Sushi " vs
  "sushi") deve riusare la stessa riga `sfide_opzioni`; "Pizza" e
  "Pizzeria" restano invece due opzioni distinte, mai fuse (Task 1,
  Task 6).
- Una lista con 3 o più voci, modificata (voce aggiunta o eliminata)
  **dopo** l'avvio di una sfida già in corso, non deve cambiare le
  opzioni di quella sfida: lo snapshot in `sfide_opzioni` resta fisso
  (Task 6, Task 8).
- La scadenza di un turno arriva esattamente mentre l'ultimo
  partecipante sta confermando il suo voto (race fra `scadi_turni_sfida`
  e `conferma_voti` sullo stesso turno): il voto valido già in transito
  non deve andare perso, e il turno non deve restare in uno stato
  ambiguo (sia "scaduto" sia "in corso" per client diversi) — vince
  sempre l'update atomico che arriva fisicamente per primo in DB (Task 6).

---

## File Structure

```
src/calcolo/
  normalizzazioneTesto.ts        (nuovo, puro)
  datazioneSfida.ts               (nuovo, puro)
  domandaSfida.ts                 (nuovo, puro)
  risultatoSfida.ts                (nuovo, puro)

supabase/migrations/
  00000000000015_sfida_scelte.sql       (nuovo: tabelle, RLS, grant, realtime)
  00000000000016_sfida_scelte_rpc.sql   (nuovo: funzioni RPC)

src/types/database.types.ts       (modificato: nuove tabelle/funzioni)

src/api/
  sfide.ts                        (nuovo)
  notifiche.ts                    (nuovo)

src/hooks/
  useSfide.ts                     (nuovo: elenco sfide del gruppo)
  useSfidaDettaglio.ts             (nuovo: una sfida + turno corrente)
  useNotifiche.ts                  (nuovo)

app/(app)/
  _layout.tsx                      (modificato: nuove rotte)
  liste/[id].tsx                   (modificato: bottone "Inizia sfida")
  liste/index.tsx                  (modificato: ingresso "Sfide del gruppo")
  index.tsx                        (modificato: campanella notifiche)
  sfide/nuova.tsx                  (nuovo)
  sfide/[id].tsx                   (nuovo)
  sfide/index.tsx                  (nuovo)
  notifiche/index.tsx              (nuovo)
```

---

### Task 1: Normalizzazione testo (per deduplicare le proposte personalizzate)

**Files:**
- Create: `src/calcolo/normalizzazioneTesto.ts`
- Test: `src/calcolo/normalizzazioneTesto.test.ts`

**Interfaces:**
- Produces: `normalizzaTesto(testo: string): string`

- [ ] **Step 1: Write the failing tests**

```ts
import { normalizzaTesto } from './normalizzazioneTesto';

describe('normalizzaTesto', () => {
  it('rimuove spazi iniziali/finali e collassa spazi multipli', () => {
    expect(normalizzaTesto('  Sushi   bar  ')).toBe(normalizzaTesto('Sushi bar'));
  });
  it('ignora maiuscole/minuscole', () => {
    expect(normalizzaTesto('PIZZA')).toBe(normalizzaTesto('pizza'));
  });
  it('tratta forme Unicode equivalenti come uguali (NFKC)', () => {
    expect(normalizzaTesto('café')).toBe(normalizzaTesto('café'));
  });
  it('NON fonde termini semanticamente diversi', () => {
    expect(normalizzaTesto('pizza')).not.toBe(normalizzaTesto('pizze'));
    expect(normalizzaTesto('Pizza')).not.toBe(normalizzaTesto('Pizzeria'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/calcolo/normalizzazioneTesto.test.ts`
Expected: FAIL (`normalizzaTesto` is not defined / module not found)

- [ ] **Step 3: Implement `normalizzaTesto(testo: string): string` in `src/calcolo/normalizzazioneTesto.ts`**

`testo.normalize('NFKC').trim().toLocaleLowerCase('it-IT').replace(/\s+/g, ' ')`.
Un breve commento JSDoc deve spiegare perché NON fa stemming/sinonimi
(scelta esplicita della spec: "evitare di fondere automaticamente
termini semanticamente diversi").

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/calcolo/normalizzazioneTesto.test.ts`
Expected: PASS (4/4)

- [ ] **Step 5: Commit**

```bash
git add src/calcolo/normalizzazioneTesto.ts src/calcolo/normalizzazioneTesto.test.ts
git commit -m "feat: normalizzazione testo per deduplicare opzioni personalizzate"
```

---

### Task 2: Datazione della sfida ("Quando?")

**Files:**
- Create: `src/calcolo/datazioneSfida.ts`
- Test: `src/calcolo/datazioneSfida.test.ts`

**Interfaces:**
- Consumes: da `src/calcolo/ricorrenzaFaccende.ts` — `dataLocaleISO(istante: Date, fusoOrario: string): string`, `fineGiornoISO(dataISO: string, fusoOrario: string): string`, `aggiungiGiorni(dataISO: string, giorni: number): string`, `giornoSettimanaISO(dataISO: string): number` (1=lunedì..7=domenica).
- Produces:
  - `type PrecisioneAttivita = 'giorno' | 'fascia' | 'orario'`
  - `type SceltaQuando = { tipo: 'rapida'; valore: 'oggi' | 'stasera' | 'domani' | 'domani_sera' | 'venerdi' | 'sabato' | 'domenica' | 'questo_weekend' | 'prossimo_weekend' } | { tipo: 'data'; dataISO: string } | { tipo: 'data_ora'; dataOraISO: string }`
  - `type EsitoDatazione = { inizioISO: string; fineISO: string | null; precisione: PrecisioneAttivita }` (`inizioISO`/`fineISO` sono istanti UTC completi, non date di calendario)
  - `risolviQuando(scelta: SceltaQuando, adesso: Date, fusoOrario: string): EsitoDatazione`
  - `formattaConGiorno(esito: EsitoDatazione, fusoOrario: string): string` — es. `"Sabato 24 ottobre"` (usa `date-fns`/`date-fns/locale` `it`, stesso pattern già in `src/components/GroupPreviewCard.tsx`); per `precisione: 'fascia'` aggiunge `" sera"`; per `'orario'` aggiunge `" alle HH:mm"`.

- [ ] **Step 1: Write the failing tests**

```ts
import { risolviQuando, formattaConGiorno } from './datazioneSfida';

// adesso fisso per tutti i test: 2026-10-19T10:00:00.000Z è un lunedì
// (venerdì 2026-10-16, quindi lunedì 2026-10-19 - verificare con lo
// stesso calcolo giorno-settimana già validato in ricorrenzaFaccende.test.ts)
const ADESSO = new Date('2026-10-19T10:00:00.000Z');
const FUSO = 'Europe/Rome';

describe('risolviQuando - scelte rapide', () => {
  it('oggi: precisione giorno, oggi stesso', () => {
    const r = risolviQuando({ tipo: 'rapida', valore: 'oggi' }, ADESSO, FUSO);
    expect(r.precisione).toBe('giorno');
  });
  it('stasera: precisione fascia, 19:00-23:59 di oggi', () => {
    const r = risolviQuando({ tipo: 'rapida', valore: 'stasera' }, ADESSO, FUSO);
    expect(r.precisione).toBe('fascia');
  });
  it('venerdi: il prossimo venerdì da oggi incluso', () => { /* ... */ });
  it('questo_weekend: se oggi è un giorno feriale, il sabato-domenica successivi', () => { /* ... */ });
  it('questo_weekend: se oggi è già sabato o domenica, il weekend corrente (non quello dopo)', () => { /* ... */ });
  it('prossimo_weekend: sempre il weekend successivo a "questo_weekend"', () => { /* ... */ });
});

describe('risolviQuando - scelte esplicite', () => {
  it('data: precisione giorno sulla data fornita', () => { /* ... */ });
  it('data_ora: precisione orario, inizioISO coincide con l\'istante fornito', () => { /* ... */ });
});

describe('formattaConGiorno', () => {
  it('formatta un giorno come "Sabato 24 ottobre"', () => { /* ... */ });
  it('aggiunge "sera" per una fascia', () => { /* ... */ });
  it('aggiunge l\'orario per una precisione orario', () => { /* ... */ });
});
```

L'implementer riempie i corpi dei test con asserzioni concrete sulle
date esatte (usando `dataLocaleISO` per leggere `inizioISO`/`fineISO`
nel fuso di test), seguendo lo stesso stile di
`ricorrenzaFaccende.test.ts`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/calcolo/datazioneSfida.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement `datazioneSfida.ts`**

Regola per i giorni della settimana (venerdì/sabato/domenica): il
prossimo giorno di calendario con quel nome, **oggi incluso** se oggi
coincide già con quel giorno.

Regola weekend: "questo weekend" = l'intervallo sabato 00:00 -
domenica 23:59 della settimana corrente (se oggi è già sabato o
domenica, è il weekend in corso, non quello della settimana dopo);
"prossimo weekend" = sempre l'intervallo immediatamente successivo a
"questo weekend" (una settimana dopo).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/calcolo/datazioneSfida.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/calcolo/datazioneSfida.ts src/calcolo/datazioneSfida.test.ts
git commit -m "feat: risoluzione delle scelte rapide Quando? della sfida"
```

---

### Task 3: Domanda automatica

**Files:**
- Create: `src/calcolo/domandaSfida.ts`
- Test: `src/calcolo/domandaSfida.test.ts`

**Interfaces:**
- Consumes: `EsitoDatazione`, `formattaConGiorno` da Task 2.
- Produces:
  - `type Categoria = 'cibo' | 'ristoranti' | 'film' | 'attivita' | 'viaggi' | 'giochi'`
  - `deduciCategoria(nomeLista: string): Categoria | null`
  - `generaDomanda(categoria: Categoria | null, esito: EsitoDatazione, fusoOrario: string): string`

- [ ] **Step 1: Write the failing tests**

```ts
import { deduciCategoria, generaDomanda } from './domandaSfida';
import { risolviQuando } from './datazioneSfida';

describe('deduciCategoria', () => {
  it.each([
    ['Cosa mangiamo', 'cibo'],
    ['Ricette della settimana', 'cibo'],
    ['Ristoranti preferiti', 'ristoranti'],
    ['Pizzerie in zona', 'ristoranti'],
    ['Film da vedere', 'film'],
    ['Serie TV', 'film'],
    ['Cose da fare', 'attivita'],
    ['Weekend fuori porta', 'viaggi'],
    ['Giochi da tavolo', 'giochi'],
  ])('"%s" -> %s', (nome, attesa) => {
    expect(deduciCategoria(nome)).toBe(attesa);
  });

  it('nessuna parola chiave riconosciuta -> null', () => {
    expect(deduciCategoria('Lista della nonna')).toBeNull();
  });
});

describe('generaDomanda', () => {
  // Replica esatta degli esempi nel brief (§5):
  it('cibo + stasera -> "Cosa vuoi mangiare stasera?"', () => { /* ... */ });
  it('cibo + sabato -> "Cosa vuoi mangiare sabato?"', () => { /* ... */ });
  it('ristoranti + stasera -> "Dove vuoi andare a cena stasera?"', () => { /* ... */ });
  it('ristoranti + sabato -> "Dove vuoi mangiare sabato?"', () => { /* ... */ });
  it('film + venerdì sera -> "Che film vuoi vedere venerdì sera?"', () => { /* ... */ });
  it('film + stasera -> "Che film vuoi guardare stasera?"', () => { /* ... */ });
  it('attività + weekend -> "Cosa vuoi fare nel weekend?"', () => { /* ... */ });
  it('viaggi + prossimo weekend -> "Dove vuoi andare il prossimo weekend?"', () => { /* ... */ });
  it('giochi + stasera -> "A cosa vuoi giocare stasera?"', () => { /* ... */ });
  it('categoria null -> domanda generica "Quale opzione scegliamo per <quando>?"', () => { /* ... */ });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/calcolo/domandaSfida.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement `domandaSfida.ts`**

`deduciCategoria`: liste di parole chiave minuscole per categoria,
confrontate contro `normalizzaTesto(nomeLista)` (Task 1) con
`.includes()` — niente regex complesse. Parole minime da includere:
`cibo`: mangiare, cena, pranzo, cibo, ricette, food; `ristoranti`:
ristorant, pizzer, trattori, osteri, locali; `film`: film, cinema,
serie, netflix; `attivita`: attività, attivita, fare, uscite; `viaggi`:
viaggi, weekend fuori, gite, vacanz; `giochi`: giochi, gioco, board
game. Prima corrispondenza vince (ordine: cibo, ristoranti, film,
attivita, viaggi, giochi).

`generaDomanda`: tabella statica `template[categoria][precisione]` più
un ramo generico quando `categoria` è `null`, usando
`formattaConGiorno`/l'etichetta della scelta rapida originale per la
parte finale della frase (es. "stasera", "sabato", "venerdì sera", "nel
weekend", "il prossimo weekend").

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/calcolo/domandaSfida.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/calcolo/domandaSfida.ts src/calcolo/domandaSfida.test.ts
git commit -m "feat: generazione automatica della domanda della sfida"
```

---

### Task 4: Algoritmo del vincitore e dello spareggio

**Files:**
- Create: `src/calcolo/risultatoSfida.ts`
- Test: `src/calcolo/risultatoSfida.test.ts`

**Interfaces:**
- Produces:
  - `type EsitoTurno = 'vincitore' | 'pareggio' | 'nessun_accordo'`
  - `type RisultatoTurno = { esito: EsitoTurno; opzioneVincenteId: string | null; opzioniInParita: string[]; conteggi: Record<string, number> }`
  - `calcolaRisultatoTurno(voti: { opzioneId: string; membroId: string }[], tipoTurno: 'iniziale' | 'nuovo_tentativo' | 'spareggio'): RisultatoTurno`
  - `percentualeOpzione(votiRicevuti: number, totalePartecipantiVotanti: number): number` (stesso pattern di arrotondamento di `contributoClassifica` in `src/calcolo/puntiFaccende.ts`: 0 se il totale è 0, mai NaN/Infinity)

- [ ] **Step 1: Write the failing tests**

```ts
import { calcolaRisultatoTurno, percentualeOpzione } from './risultatoSfida';

describe('calcolaRisultatoTurno - turni a 3 scelte (iniziale/nuovo_tentativo)', () => {
  it('Caso A del brief: una scelta comune su 2 persone -> vince quell\'opzione', () => {
    // Giando: pizza, sushi, hamburger. Vale: pasta, pizza, messicano.
    const voti = [
      { opzioneId: 'pizza', membroId: 'giando' }, { opzioneId: 'sushi', membroId: 'giando' }, { opzioneId: 'hamburger', membroId: 'giando' },
      { opzioneId: 'pasta', membroId: 'vale' }, { opzioneId: 'pizza', membroId: 'vale' }, { opzioneId: 'messicano', membroId: 'vale' },
    ];
    const r = calcolaRisultatoTurno(voti, 'iniziale');
    expect(r).toMatchObject({ esito: 'vincitore', opzioneVincenteId: 'pizza' });
  });

  it('Caso B del brief: nessuna scelta comune -> nessun_accordo, mai pareggio', () => {
    // Giando: pizza, sushi, hamburger. Vale: pasta, messicano, insalata.
    const r = calcolaRisultatoTurno([/* 6 voti, tutte opzioni diverse, 1 voto ciascuna */], 'iniziale');
    expect(r.esito).toBe('nessun_accordo');
  });

  it('Caso C del brief: due scelte comuni -> pareggio tra le due', () => {
    // Giando: pizza, sushi, hamburger. Vale: pizza, sushi, pasta.
    const r = calcolaRisultatoTurno([/* ... */], 'iniziale');
    expect(r.esito).toBe('pareggio');
    expect(r.opzioniInParita.sort()).toEqual(['pizza', 'sushi'].sort());
  });

  it('Caso D del brief: le stesse identiche 3 opzioni -> pareggio tra tutte e 3, non la prima', () => {
    const r = calcolaRisultatoTurno([/* entrambi votano pizza, sushi, hamburger */], 'iniziale');
    expect(r.esito).toBe('pareggio');
    expect(r.opzioniInParita.sort()).toEqual(['hamburger', 'pizza', 'sushi'].sort());
  });

  it('3+ partecipanti, un\'opzione con 2 voti unica al massimo -> vince anche se non unanime', () => { /* ... */ });
  it('nessun voto -> nessun_accordo, conteggi tutti a 0, mai un errore', () => {
    const r = calcolaRisultatoTurno([], 'iniziale');
    expect(r.esito).toBe('nessun_accordo');
  });
});

describe('calcolaRisultatoTurno - turno di spareggio (1 scelta)', () => {
  it('un\'unica opzione al massimo vince anche con un solo voto', () => {
    const r = calcolaRisultatoTurno([{ opzioneId: 'pizza', membroId: 'giando' }, { opzioneId: 'pizza', membroId: 'vale' }, { opzioneId: 'sushi', membroId: 'marco' }], 'spareggio');
    expect(r).toMatchObject({ esito: 'vincitore', opzioneVincenteId: 'pizza' });
  });

  it('ancora in parità -> nessun_accordo, MAI un altro pareggio/spareggio implicito', () => {
    const r = calcolaRisultatoTurno([{ opzioneId: 'pizza', membroId: 'giando' }, { opzioneId: 'sushi', membroId: 'vale' }], 'spareggio');
    expect(r.esito).toBe('nessun_accordo');
  });
});

describe('percentualeOpzione', () => {
  it('calcola una percentuale semplice', () => expect(percentualeOpzione(3, 4)).toBe(75));
  it('0 quando il totale è 0', () => expect(percentualeOpzione(0, 0)).toBe(0));
  it('le percentuali delle diverse opzioni non devono sommare a 100 (ogni persona vota 3 opzioni)', () => {
    // 4 partecipanti, ognuno vota 3 opzioni su 5 disponibili: somma dei "voti totali" = 12, non 4
    expect(percentualeOpzione(4, 4) + percentualeOpzione(4, 4) + percentualeOpzione(4, 4)).toBeGreaterThan(100);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/calcolo/risultatoSfida.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement `risultatoSfida.ts`**

Algoritmo (vedi design doc §4 per il ragionamento completo):
1. Conta i voti per `opzioneId` in una `Map`/`Record`.
2. Trova il conteggio massimo `M` fra le opzioni **votate almeno una
   volta**. Se non c'è nessun voto, `M = 0`.
3. `leader` = le opzioni con conteggio `=== M`.
4. Se `tipoTurno !== 'spareggio'`:
   - `M <= 1` → `nessun_accordo` (mai pareggio quando il massimo è al
     più 1 voto).
   - `M >= 2` e `leader.length === 1` → `vincitore` su quella opzione.
   - `M >= 2` e `leader.length > 1` → `pareggio` su `leader`.
5. Se `tipoTurno === 'spareggio'`:
   - `leader.length === 1` (qualunque `M`, incluso 1) → `vincitore`.
   - `leader.length > 1` → `nessun_accordo` (mai un altro pareggio).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/calcolo/risultatoSfida.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/calcolo/risultatoSfida.ts src/calcolo/risultatoSfida.test.ts
git commit -m "feat: algoritmo deterministico vincitore/spareggio della sfida"
```

---

### Task 5: Migration — schema, RLS, grant, realtime

**Files:**
- Create: `supabase/migrations/00000000000015_sfida_scelte.sql`

**Interfaces:**
- Consumes: `e_membro_di(p_gruppo_id uuid) returns boolean` (già definita, non ridefinire).
- Produces: tabelle `sfide_scelta`, `sfide_partecipanti`, `sfide_opzioni`, `sfide_turni`, `sfide_voti`, `sfide_turno_risultati`, `notifiche`, coi nomi di colonna esatti del design doc §1.

- [ ] **Step 1: Scrivere la migration**

Schema esatto (vedi design doc §1 per il dettaglio di ogni colonna/check/commento):

```sql
create table public.sfide_scelta (
  id uuid primary key default gen_random_uuid(),
  gruppo_id uuid not null references public.gruppi (id) on delete cascade,
  lista_id uuid not null references public.liste (id) on delete cascade,
  richiesta_id uuid unique,
  titolo text not null check (char_length(trim(titolo)) > 0),
  categoria text,
  attivita_precisione text not null check (attivita_precisione in ('giorno', 'fascia', 'orario')),
  attivita_inizio timestamptz not null,
  attivita_fine timestamptz,
  votazione_scade_il timestamptz not null,
  stato text not null default 'in_corso'
    check (stato in ('in_corso', 'conclusa_vincitore', 'conclusa_senza_accordo', 'conclusa_scaduta', 'annullata')),
  opzione_vincente_id uuid references public.sfide_opzioni (id) on delete set null,
  creata_da uuid not null references public.membri (id) on delete restrict,
  creata_il timestamptz not null default now(),
  conclusa_il timestamptz
);
```

(Nota: `opzione_vincente_id` referenzia `sfide_opzioni`, definita più
sotto — Postgres richiede o riordinare le tabelle o aggiungere questo
vincolo con un `alter table` a fine file; usare `alter table` a fine
file è più semplice da leggere, scegliere quello.)

Poi, nello stesso ordine del design doc: `sfide_partecipanti` (`unique
(sfida_id, membro_id)`), `sfide_opzioni` (`unique (sfida_id,
testo_normalizzato)`), `sfide_turni` (`unique (sfida_id,
numero_turno)`, colonna `opzioni_in_gara uuid[] not null default
'{}'`), `sfide_voti` (`unique (turno_id, membro_id, opzione_id)` **e**
un secondo vincolo `unique (turno_id, membro_id, ??)` non basta da solo
a impedire più di 3/1 righe per persona — quel conteggio esatto lo
applica la RPC `conferma_voti`, non un CHECK a livello di riga: lasciare
un commento che lo spiega), `sfide_turno_risultati` (`primary key
(turno_id, opzione_id)`), `notifiche` (`unique (evento_idempotenza)`).

Indici: almeno `(gruppo_id, stato)` su `sfide_scelta`, `(sfida_id)` su
ciascuna tabella figlia, `(turno_id)` su `sfide_voti`, `(gruppo_id,
destinatario_membro_id, letta_il)` su `notifiche`.

Trigger `aggiornato_il`: non serve, nessuna di queste tabelle ha un
campo "modificabile dopo creazione" eccetto gli `update` di stato
gestiti esplicitamente dalle RPC (niente `set_aggiornato_il`).

RLS (abilitare su tutte e 7; usare SEMPRE `e_membro_di(gruppo_id)` per
`sfide_scelta`, `sfide_partecipanti`, `sfide_turni`, `notifiche` — hanno
`gruppo_id` diretto):

- `sfide_scelta`: select/insert/update per membri del gruppo
  (`e_membro_di`); nessuna policy di delete (storico immutabile).
- `sfide_partecipanti`: select per membri del gruppo via
  `e_membro_di(gruppo_id)`; **nessuna policy di insert/update/delete**
  dirette dal client — solo le RPC (`security definer` solo se
  strettamente necessario per questa tabella, altrimenti `security
  invoker` con un `insert` che passa comunque da `e_membro_di` sul
  `gruppo_id` della sfida referenziata, verificare in Task 6 quale
  serve davvero).
- `sfide_opzioni`: select con la regola di visibilità descritta nel
  design doc §1 (`not personalizzata or proposta_da = (select id from
  membri where utente_id = auth.uid()) or exists (select 1 from
  sfide_turni t where t.sfida_id = sfide_opzioni.sfida_id and
  t.stato <> 'in_corso')`) **and** `exists (select 1 from sfide_scelta s
  where s.id = sfide_opzioni.sfida_id and e_membro_di(s.gruppo_id))`;
  nessun insert/update/delete diretto dal client (solo dalle RPC).
- `sfide_turni`: select per membri del gruppo della sfida; nessun
  insert/update diretto dal client (solo RPC).
- `sfide_voti`: select **solo le proprie righe**
  (`membro_id = (select id from membri where utente_id = auth.uid())`);
  nessun insert/update/delete diretto dal client (solo dalla RPC
  `conferma_voti`, che scrive con i privilegi del chiamante ma
  rispettando comunque questa stessa policy, visto che inserisce righe
  con `membro_id` = se stesso).
- `sfide_turno_risultati`: select per membri del gruppo della sfida
  (via join fino a `sfide_scelta`); nessun insert/update/delete diretto.
- `notifiche`: select solo le proprie
  (`destinatario_membro_id = (select id from membri where utente_id =
  auth.uid())`); **update** solo per segnare `letta_il` sulle proprie
  righe; nessun insert diretto dal client (solo dalle RPC).

Grant: `select, insert, update` su `sfide_scelta`/`sfide_voti` (le RPC
devono poter scrivere rispettando comunque RLS); `select` soltanto su
`sfide_partecipanti`/`sfide_opzioni`/`sfide_turni`/`sfide_turno_risultati`
(scritte solo dalle RPC, che sono `security invoker` ma esplicitamente
autorizzate — vedi nota sotto); `select, update` su `notifiche` (mai
insert diretto dal client). **Attenzione**: se una RPC `security
invoker` deve scrivere su una tabella senza policy di insert per il
client, la RPC stessa fallirà per permessi — Task 6 deve verificare per
ciascuna scrittura se serve `security definer` con controlli manuali
equivalenti a `e_membro_di`/appartenenza, oppure se è più semplice
aggiungere una policy di insert "ristretta" (es. `sfide_turni`: insert
permesso solo se `e_membro_di` e esiste già una `sfide_scelta` collegata
nello stesso gruppo). Decidere in Task 6 e tornare qui se serve
aggiungere una policy mancante prima di chiudere Task 5 (i due task
vanno quindi implementati e verificati insieme, anche se restano due
commit separati).

Realtime: `alter publication supabase_realtime add table
public.sfide_scelta, public.sfide_turni, public.sfide_turno_risultati,
public.notifiche;` (NON aggiungere `sfide_voti`/`sfide_opzioni`
personalizzate alla pubblicazione realtime finché non si è sicuri che
il payload Realtime stesso non esponga colonne che dovrebbero restare
segrete — di norma Supabase Realtime rispetta le RLS per i `broadcast`
autenticati via "Realtime Authorization", ma più sicuro per questa
fase escludere le due tabelle più sensibili dalla pubblicazione e far
leva sull'invalidation dei soli canali già inclusi).

- [ ] **Step 2: Verifica statica**

Rileggere il file per intero confrontandolo con lo schema del design
doc (nomi colonna, check, foreign key) e con le convenzioni delle
migration esistenti (`00000000000006_liste.sql`,
`00000000000013_faccende.sql`). Nessuna istanza Postgres locale
disponibile in questo progetto (stesso limite già incontrato nel modulo
Faccende): non eseguire `supabase db push` in questo task.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/00000000000015_sfida_scelte.sql
git commit -m "feat: schema, RLS e realtime del modulo Sfida delle scelte"
```

---

### Task 6: Migration — funzioni RPC

**Files:**
- Create: `supabase/migrations/00000000000016_sfida_scelte_rpc.sql`

**Interfaces:**
- Consumes: tabelle di Task 5; `e_membro_di(p_gruppo_id uuid)`.
- Produces: `crea_sfida`, `conferma_voti`, `ripeti_sfida`,
  `scadi_turni_sfida`, `annulla_sfida` (firme esatte sotto).

- [ ] **Step 1: Scrivere `crea_sfida`**

```sql
create or replace function public.crea_sfida(
  p_lista_id uuid,
  p_richiesta_id uuid,
  p_titolo text,
  p_categoria text,
  p_attivita_precisione text,
  p_attivita_inizio timestamptz,
  p_attivita_fine timestamptz,
  p_votazione_scade_il timestamptz,
  p_opzioni_scelte uuid[],        -- 3 id di sfide_opzioni GIA' create da questa funzione (vedi sotto)
  p_proposta_personalizzata text  -- nullable: testo della propria proposta, se una delle 3 non è dalla lista
)
returns uuid
language plpgsql security invoker
as $$ ... $$;
```

Algoritmo (passi, non SQL completo — l'implementer scrive il corpo):
1. Se esiste già una `sfide_scelta` con `richiesta_id = p_richiesta_id`,
   ritorna subito il suo `id` (idempotenza, nessun doppio lavoro).
2. Risolve `v_gruppo_id` dalla `liste` (`p_lista_id`), verifica
   `e_membro_di(v_gruppo_id)` altrimenti eccezione.
3. Risolve `v_membro_id` da `membri` per `auth.uid()` + `v_gruppo_id`
   (membro attivo), altrimenti eccezione.
4. Conta i membri attivi del gruppo: se `< 2`, eccezione leggibile
   ("Serve almeno un altro membro nel gruppo per avviare una sfida" —
   vedi design doc §9).
5. Valida `p_votazione_scade_il > now()`; se
   `p_attivita_precisione = 'orario'`, valida anche
   `p_votazione_scade_il <= p_attivita_inizio`, altrimenti eccezione.
6. Inserisce la riga `sfide_scelta` (`stato = 'in_corso'`).
7. Snapshot: inserisce in `sfide_opzioni` una riga per ogni voce di
   `voci_lista` della lista (`personalizzata = false`), più — se
   fornita — una riga per `p_proposta_personalizzata`
   (`personalizzata = true`, `proposta_da = v_membro_id`,
   `testo_normalizzato` secondo la stessa funzione usata in Task 1 **ma
   riscritta in SQL**: `lower(trim(regexp_replace(..., '\s+', ' ',
   'g')))` è sufficiente lato DB, la normalizzazione completa
   Unicode/NFKC resta solo lato client per la UX, qui serve solo
   coerenza con l'unique constraint).
8. Snapshot: inserisce in `sfide_partecipanti` una riga per ogni membro
   attivo del gruppo (incluso l'organizzatore).
9. Inserisce il primo `sfide_turni` (`numero_turno = 1`,
   `tipo_turno = 'iniziale'`, `stato = 'in_corso'`,
   `scadenza = p_votazione_scade_il`, `opzioni_in_gara` = tutti gli id
   appena creati in `sfide_opzioni`).
10. Registra il voto dell'organizzatore: inserisce 3 righe in
    `sfide_voti` per `(turno appena creato, v_membro_id, ciascuna delle
    3 opzioni passate in `p_opzioni_scelte`/l'id appena generato per la
    proposta personalizzata)`.
11. Se con questo voto *tutti* i partecipanti attivi hanno già votato
    (caso limite: gruppo di 2 persone dove l'altro aveva già votato per
    un turno impossibile da raggiungere in creazione — in pratica MAI
    vero al momento della creazione, ma scrivere comunque la chiamata
    alla stessa logica di chiusura di `conferma_voti` per non duplicare
    codice: estrarre la logica di "verifica completamento e chiudi" in
    una funzione privata `_chiudi_turno_se_completo(p_turno_id uuid)`
    riusata da entrambe le RPC).
12. Inserisce una riga `notifiche` per ogni partecipante **diverso
    dall'organizzatore** (`tipo = 'sfida_invito'`, `evento_idempotenza
    = 'sfida:' || id || ':invito:' || membro_id`).
13. Ritorna l'id della sfida.

- [ ] **Step 2: Scrivere `conferma_voti` e la funzione privata condivisa**

```sql
create or replace function public._chiudi_turno_se_completo(p_turno_id uuid)
returns void language plpgsql security invoker as $$ ... $$;

create or replace function public.conferma_voti(
  p_turno_id uuid,
  p_opzioni_scelte uuid[],
  p_proposta_personalizzata text
)
returns void
language plpgsql security invoker
as $$ ... $$;
```

`conferma_voti`, passi:
1. **Blocco atomico anti-race** (Review Focus: scadenza che arriva
   mentre l'ultimo voto è in transito): `update sfide_turni set
   numero_turno = numero_turno where id = p_turno_id and stato =
   'in_corso' and scadenza >= now() returning sfida_id, tipo_turno into
   v_sfida_id, v_tipo_turno` — un `update` no-op (riscrive lo stesso
   valore) usato solo per prendere un row-lock su quella riga fino a
   fine transazione. Se `not found`, eccezione leggibile ("Questo turno
   non accetta più voti"). Qualunque `scadi_turni_sfida` concorrente
   sulla stessa riga aspetta questo lock (o viceversa): non possono mai
   lasciare il turno in uno stato intermedio visibile a metà, e il voto
   che arriva anche un istante prima della scadenza viene comunque
   registrato per intero prima che l'altra transazione possa chiuderlo.
2. Risolve `v_membro_id` da `membri` per `auth.uid()` + `v_gruppo_id`
   (già noto dal join implicito nel passo 1 tramite `v_sfida_id` →
   `sfide_scelta.gruppo_id`; membro **ancora attivo**), altrimenti
   eccezione ("Non sei un partecipante attivo di questo gruppo").
3. Verifica che `v_membro_id` sia in `sfide_partecipanti` per
   `v_sfida_id` (altrimenti non era tra gli invitati originali:
   eccezione).
4. Verifica che non esista già un voto di `v_membro_id` per
   `p_turno_id` (`select 1 from sfide_voti where turno_id = p_turno_id
   and membro_id = v_membro_id` — se esiste, eccezione "Hai già
   confermato le tue scelte per questo turno": impedisce sia il doppio
   tap sia un secondo voto legittimo).
5. Verifica la cardinalità di `p_opzioni_scelte`: esattamente 3 se
   `v_tipo_turno in ('iniziale','nuovo_tentativo')`, esattamente 1 se
   `'spareggio'`; array senza duplicati (`array_length(array(select
   distinct unnest(...)), 1) = array_length(...)`).
6. Se `p_proposta_personalizzata` è fornita, crea (con `insert ... on
   conflict (sfida_id, testo_normalizzato) do update set id = sfide_opzioni.id
   returning id` per riusare una proposta già esistente con lo stesso
   testo normalizzato, di chiunque) la riga in `sfide_opzioni` e
   sostituisce il suo id nell'array delle scelte.
7. Verifica che ogni opzione scelta sia effettivamente tra
   `opzioni_in_gara` del turno (altrimenti eccezione — impedisce di
   votare un'opzione fuori dallo spareggio corrente).
8. Inserisce le righe in `sfide_voti` (un `insert` multi-riga da
   `unnest(p_opzioni_scelte)`).
9. Chiama `_chiudi_turno_se_completo(p_turno_id)`.

`_chiudi_turno_se_completo`, passi (atomica, chiamata sia da
`conferma_voti` sia dal passo 11 di `crea_sfida`):
1. Conta i partecipanti **ancora attivi** del gruppo della sfida
   (`membri.uscito_il is null`) che hanno almeno un voto per questo
   turno (`count(distinct membro_id)` su `sfide_voti` filtrato per
   `turno_id`), lo confronta col conteggio dei partecipanti attivi
   totali.
2. Se non coincidono, esce senza fare nulla (turno ancora aperto).
3. Se coincidono, calcola l'esito leggendo `sfide_voti` del turno
   (conteggi per `opzione_id`, stessa logica di
   `calcolaRisultatoTurno` di Task 4 **riscritta in SQL puro**: `group
   by opzione_id`, `max(conteggio)`, opzioni col massimo).
4. Scrive `sfide_turno_risultati` (una riga per opzione con
   `voti_ricevuti > 0`).
5. Applica le regole di Task 4 per decidere l'esito. **Nota su
   `sfida_tutti_votato`** (brief Parte G): non viene inserita come
   notifica separata — il momento "tutti hanno votato" e il momento
   "si conosce l'esito" coincidono sempre in questa implementazione
   (stessa transazione), quindi la notifica specifica dell'esito
   (vincitore/spareggio/senza accordo, sotto) la sostituisce
   interamente invece di duplicarla; la colonna `tipo` lo ammette come
   valore per un eventuale uso futuro, ma questa RPC non lo emette mai.
   - vincitore → `update sfide_turni set stato = 'concluso_vincitore',
     concluso_il = now()`; `update sfide_scelta set stato =
     'conclusa_vincitore', opzione_vincente_id = ..., conclusa_il =
     now()`; inserisce notifica `sfida_vincitore` per ogni
     partecipante.
   - pareggio e `tipo_turno <> 'spareggio'` → chiude il turno
     corrente come `concluso_pareggio`; **apre subito** il turno
     successivo (`numero_turno + 1`, `tipo_turno = 'spareggio'`,
     `opzioni_in_gara` = solo le opzioni in parità, `scadenza` = la
     stessa `votazione_scade_il` originale della sfida se ancora nel
     futuro, altrimenti `now() + interval '1 hour'` come scadenza di
     ripiego esplicita — mai una scadenza nel passato); notifica
     `sfida_spareggio` a tutti i partecipanti attivi.
   - pareggio e `tipo_turno = 'spareggio'` → chiude come
     `concluso_senza_accordo`; `sfide_scelta.stato =
     'conclusa_senza_accordo'`; notifica `sfida_senza_accordo`.
   - nessun accordo (max ≤ 1 voto, solo per turni non-spareggio) →
     stessa chiusura `concluso_senza_accordo` di cui sopra.

- [ ] **Step 3: Scrivere `ripeti_sfida`, `scadi_turni_sfida`, `annulla_sfida`**

```sql
create or replace function public.ripeti_sfida(p_sfida_id uuid) returns uuid
  language plpgsql security invoker as $$ ... $$;
create or replace function public.scadi_turni_sfida(p_gruppo_id uuid) returns void
  language plpgsql security invoker as $$ ... $$;
create or replace function public.annulla_sfida(p_sfida_id uuid) returns void
  language plpgsql security invoker as $$ ... $$;
```

`ripeti_sfida`: verifica `e_membro_di` sul gruppo della sfida, verifica
`sfide_scelta.stato in ('conclusa_senza_accordo', 'conclusa_scaduta')`
altrimenti eccezione; crea un nuovo `sfide_turni`
(`tipo_turno = 'nuovo_tentativo'`, `opzioni_in_gara` = **tutto** il pool
di `sfide_opzioni` della sfida, non solo quelle dell'ultimo turno);
`update sfide_scelta set stato = 'in_corso'`; notifica
`sfida_invito`-equivalente (stesso `tipo = 'sfida_invito'`, nuovo
`evento_idempotenza` che include il nuovo `numero_turno`) a tutti i
partecipanti attivi tranne chi la avvia.

`scadi_turni_sfida`: per ogni `sfide_turni` del gruppo con
`stato = 'in_corso'` e `scadenza < now()`: `update ... set stato =
'scaduto_incompleto', concluso_il = now()`;
`update sfide_scelta set stato = 'conclusa_scaduta', conclusa_il =
now()`; notifica `sfida_scaduta` a tutti i partecipanti. Nella stessa
funzione, per ogni turno `in_corso` con **meno del 25% del tempo
restante** (`now() >= iniziato_il + (scadenza - iniziato_il) * 0.75`)
e nessuna notifica `sfida_promemoria` già registrata per quel turno
(`evento_idempotenza = 'sfida:' || sfida_id || ':promemoria:' ||
turno_id`): inserisce quella notifica per ogni partecipante attivo che
**non ha ancora votato** in quel turno (`not exists` in `sfide_voti`
per quel `turno_id`/`membro_id`).

`annulla_sfida`: verifica che il chiamante sia `sfide_scelta.creata_da`
(solo l'organizzatore, diversamente dalle altre RPC — è l'unica
eccezione esplicita del design doc, perché annullare è distruttivo
verso gli altri partecipanti); verifica `stato = 'in_corso'`; `update
... set stato = 'annullata', conclusa_il = now()`.

- [ ] **Step 4: Verifica statica**

Rilettura completa confrontando ogni passo con Task 4 (l'algoritmo deve
coincidere esattamente con `calcolaRisultatoTurno`) e con le regole
"Global Constraints"/"Review Focus" in cima a questo piano. Verificare
in particolare: nessun parametro usato per l'identità (sempre
`auth.uid()`), ogni `update` di chiusura turno è nella stessa
transazione del conteggio (nessuna finestra in cui un secondo
`conferma_voti` concorrente potrebbe leggere uno stato intermedio).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/00000000000016_sfida_scelte_rpc.sql
git commit -m "feat: RPC di creazione, voto, spareggio e scadenza della sfida"
```

---

### Task 7: Tipi database

**Files:**
- Modify: `src/types/database.types.ts`

**Interfaces:**
- Consumes: schema esatto di Task 5/6.
- Produces: `Database['public']['Tables']['sfide_scelta'|'sfide_partecipanti'|'sfide_opzioni'|'sfide_turni'|'sfide_voti'|'sfide_turno_risultati'|'notifiche']`, `Database['public']['Functions']['crea_sfida'|'conferma_voti'|'ripeti_sfida'|'scadi_turni_sfida'|'annulla_sfida']`.

- [ ] **Step 1: Aggiungere le tabelle**

Stesso stile già usato per il modulo Faccende in questo stesso file
(campi in ordine alfabetico dentro `Row`/`Insert`/`Update`, blocco
`Relationships` con una entry per ogni foreign key, tabelle inserite in
ordine alfabetico rispetto alle esistenti). Aggiornare anche il
commento in cima al file che già documenta le tabelle Faccende aggiunte
a mano, includendo anche queste.

- [ ] **Step 2: Aggiungere le funzioni**

Stesso stile delle funzioni Faccende già presenti (`Args`/`Returns`).

- [ ] **Step 3: Verificare**

Run: `npx tsc --noEmit`
Expected: 0 errori

- [ ] **Step 4: Commit**

```bash
git add src/types/database.types.ts
git commit -m "feat: tipi database per il modulo Sfida delle scelte"
```

---

### Task 8: API — sfide

**Files:**
- Create: `src/api/sfide.ts`

**Interfaces:**
- Consumes: `supabase` da `src/lib/supabase.ts`; tipi di Task 7.
- Produces:
  - `type Sfida = Database['public']['Tables']['sfide_scelta']['Row']`
  - `type OpzioneSfida = Database['public']['Tables']['sfide_opzioni']['Row']`
  - `type TurnoSfida = Database['public']['Tables']['sfide_turni']['Row']`
  - `type RisultatoOpzione = Database['public']['Tables']['sfide_turno_risultati']['Row']`
  - `listaSfide(gruppoId: string): Promise<Sfida[]>`
  - `leggiSfidaCompleta(sfidaId: string): Promise<{ sfida: Sfida; turni: TurnoSfida[]; opzioniVisibili: OpzioneSfida[]; risultatiTurnoCorrente: RisultatoOpzione[]; partecipantiTotali: number; partecipantiCheHannoVotatoNelTurnoCorrente: number; hoGiaVotatoNelTurnoCorrente: boolean }>` (una sola query aggregata lato client, non un'unica query SQL — vedi Step 3)
  - `creaSfida(params: {...tutti i parametri di crea_sfida in camelCase...}): Promise<string>`
  - `confermaVoti(params: { turnoId: string; opzioniScelte: string[]; propostaPersonalizzata?: string }): Promise<void>`
  - `ripetiSfida(sfidaId: string): Promise<string>`
  - `annullaSfida(sfidaId: string): Promise<void>`
  - `scadiTurniSfida(gruppoId: string): Promise<void>`

- [ ] **Step 1: Scrivere le funzioni di lettura**

`listaSfide`: `select()` ordinata per `creata_il desc`.

`leggiSfidaCompleta`: più query in parallelo (`Promise.all`, stesso
pattern di `useGruppoAttivo`): sfida singola (`maybeSingle`), tutti i
turni della sfida, le opzioni visibili (RLS filtra già quelle
personalizzate non proprie e non ancora concluse — la query lato
client è semplicemente `select().eq('sfida_id', ...)`, nessun filtro
aggiuntivo necessario), i risultati del turno corrente (vuoto se il
turno è ancora `in_corso` — RLS/assenza dati fa il lavoro), i
partecipanti totali (`count`), se **io** ho già votato nel turno
corrente (`select` su `sfide_voti` filtrato per `turno_id` e il mio
`membro_id` — RLS lo limita comunque alle mie sole righe, quindi
`length > 0` basta), e quanti **in totale** hanno votato (va dedotto
in altro modo, visto che non posso leggere le righe altrui di
`sfide_voti`: usare il conteggio `partecipanti_che_hanno_votato` che la
RPC rende disponibile — vedere Step 2).

- [ ] **Step 2: Decidere come esporre "quante persone hanno votato" senza leggere i voti altrui**

Questo è un punto che Task 5/6 devono già aver risolto (la colonna o
vista esiste) — se non lo hanno fatto, aggiungerla qui facendo un passo
indietro su Task 5/6 prima di proseguire: la soluzione più semplice è
una **vista** `sfide_turni_progresso` (`turno_id`, `partecipanti_totali`,
`partecipanti_votanti`) leggibile da RLS allo stesso modo di
`sfide_turni` (conta `sfide_partecipanti` attivi vs `count(distinct
membro_id)` da `sfide_voti` per quel turno) — una vista **non** espone
mai `membro_id`→`opzione_id`, solo numeri aggregati, quindi non viola
la segretezza. Aggiungere questa vista a Task 5 (stessa migration
`00000000000015`) prima di chiudere questo task, con una nota nel
commit message di Task 5 se il task è già stato committato (va bene un
commit successivo che la aggiunge, basta restare append-only).

- [ ] **Step 3: Scrivere le funzioni di scrittura (wrapper RPC)**

Ciascuna chiama `supabase.rpc('<nome_rpc>', { p_... })`, stesso
pattern di `src/api/occorrenzeFaccende.ts`. `creaSfida` genera
`richiesta_id` con `crypto.randomUUID()` lato chiamante (il componente
React che la invoca, non questa funzione, per poter riusare lo stesso
id in un retry automatico — documentarlo nel JSDoc del parametro).

- [ ] **Step 4: Verificare**

Run: `npx tsc --noEmit`
Expected: 0 errori

- [ ] **Step 5: Commit**

```bash
git add src/api/sfide.ts supabase/migrations/00000000000015_sfida_scelte.sql
git commit -m "feat: API typed per il modulo Sfida delle scelte"
```

---

### Task 9: API — notifiche

**Files:**
- Create: `src/api/notifiche.ts`

**Interfaces:**
- Produces:
  - `type Notifica = Database['public']['Tables']['notifiche']['Row']`
  - `listaNotifiche(gruppoId: string): Promise<Notifica[]>`
  - `segnaNotificaLetta(notificaId: string): Promise<void>`

- [ ] **Step 1: Implementare**

`listaNotifiche`: `select().eq('gruppo_id', gruppoId).order('creata_il',
{ ascending: false })` (RLS limita già alle proprie). `segnaNotificaLetta`:
`update({ letta_il: new Date().toISOString() }).eq('id', notificaId)`.

- [ ] **Step 2: Verificare**

Run: `npx tsc --noEmit`
Expected: 0 errori

- [ ] **Step 3: Commit**

```bash
git add src/api/notifiche.ts
git commit -m "feat: API typed per le notifiche interne"
```

---

### Task 10: Hook — elenco sfide del gruppo

**Files:**
- Create: `src/hooks/useSfide.ts`

**Interfaces:**
- Consumes: `src/api/sfide.ts` (Task 8).
- Produces: `useSfide(gruppoId: string | null)` → `{ sfide: Sfida[]; isLoading: boolean; error: unknown; crea: UseMutationResult; ripeti: UseMutationResult; annulla: UseMutationResult; sincronizzaScadenze: UseMutationResult }`

- [ ] **Step 1: Implementare**

Stesso scheletro di `src/hooks/useFaccende.ts`: `useQuery` +
canale Realtime su `sfide_scelta`/`sfide_turni` filtrato per
`gruppo_id` (nome canale univoco con `useId()`, invalidazione su ogni
evento) + mutazioni che chiamano Task 8 e invalidano la stessa query.

- [ ] **Step 2: Verificare**

Run: `npx tsc --noEmit`
Expected: 0 errori

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useSfide.ts
git commit -m "feat: hook elenco sfide del gruppo con Realtime"
```

---

### Task 11: Hook — dettaglio di una sfida

**Files:**
- Create: `src/hooks/useSfidaDettaglio.ts`

**Interfaces:**
- Consumes: `leggiSfidaCompleta`, `confermaVoti`, `scadiTurniSfida` da Task 8.
- Produces: `useSfidaDettaglio(sfidaId: string | null)` → `{ dettaglio: ReturnType<typeof leggiSfidaCompleta> | undefined; isLoading: boolean; error: unknown; confermaVoti: UseMutationResult }`

- [ ] **Step 1: Implementare**

`useQuery` su `leggiSfidaCompleta(sfidaId)` + canale Realtime su
`sfide_turni`/`sfide_turno_risultati`/`notifiche` filtrato lato client
per `sfida_id` (dove la tabella lo permette) o `gruppo_id` altrimenti,
che invalida la stessa query — **non** sottoscrivere `sfide_voti` (non
in pubblicazione Realtime, vedi Task 5). La mutazione `confermaVoti`
invalida sia questa query sia quella di Task 10 (entrambe le
`queryKey` passate/derivate in modo che un singolo
`queryClient.invalidateQueries` con un prefisso comune copra entrambe —
scegliere `['sfide', gruppoId]`/`['sfide', gruppoId, sfidaId]` come
schema di chiave gerarchico, coerente fra i due hook).

- [ ] **Step 2: Verificare**

Run: `npx tsc --noEmit`
Expected: 0 errori

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useSfidaDettaglio.ts
git commit -m "feat: hook dettaglio sfida con voto e Realtime"
```

---

### Task 12: Hook — notifiche

**Files:**
- Create: `src/hooks/useNotifiche.ts`

**Interfaces:**
- Consumes: Task 9.
- Produces: `useNotifiche(gruppoId: string | null)` → `{ notifiche: Notifica[]; nonLette: number; isLoading: boolean; segnaLetta: UseMutationResult }`

- [ ] **Step 1: Implementare**

Stesso scheletro di `useStoricoFaccende.ts` (solo lettura + Realtime),
più la mutazione `segnaLetta` e il derivato `nonLette =
notifiche.filter(n => n.letta_il === null).length`.

- [ ] **Step 2: Verificare**

Run: `npx tsc --noEmit`
Expected: 0 errori

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useNotifiche.ts
git commit -m "feat: hook notifiche interne con Realtime"
```

---

### Task 13: Rotte e punto d'ingresso da una lista

**Files:**
- Modify: `app/(app)/_layout.tsx`
- Modify: `app/(app)/liste/[id].tsx`

**Interfaces:**
- Consumes: niente di nuovo (solo `router.push`).

- [ ] **Step 1: Registrare le rotte**

Aggiungere a `app/(app)/_layout.tsx`, stesso stile delle righe
esistenti: `sfide/index` (titolo "Sfide"), `sfide/nuova` (titolo "Nuova
sfida"), `sfide/[id]` (titolo dinamico, vedi Task 15), `notifiche/index`
(titolo "Notifiche").

- [ ] **Step 2: Aggiungere "Inizia sfida" a `liste/[id].tsx`**

Bottone visibile solo quando `voci.length >= 3` (vedi design doc §9: le
voci "fatte" contano), accanto al form esistente, senza toccare il
resto della schermata. `onPress` → `router.push({ pathname:
'/sfide/nuova', params: { listaId: id } })`.

- [ ] **Step 3: Verificare**

Run: `npx tsc --noEmit && npx expo lint`
Expected: 0 errori

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/_layout.tsx" "app/(app)/liste/[id].tsx"
git commit -m "feat: rotte del modulo Sfida e punto d'ingresso dalla lista"
```

---

### Task 14: Pagina — creazione sfida

**Files:**
- Create: `app/(app)/sfide/nuova.tsx`

**Interfaces:**
- Consumes: `listaId` via `useLocalSearchParams`; `risolviQuando`/
  `formattaConGiorno` (Task 2); `deduciCategoria`/`generaDomanda`
  (Task 3); `useListe`/`useVociLista` (esistenti, sola lettura);
  `useGruppoAttivo` (esistente); `useSfide` (Task 10, per `crea`).
- Produces: schermata, nessuna nuova interfaccia esportata.

- [ ] **Step 1: Implementare**

Un'unica schermata con, in ordine (priorità dichiarata: velocità,
pochi tap, default sensati — vedi design doc):
1. Chip "Quando?" (le 9 scelte rapide + "Scegli data" + "Scegli data e
   ora"), con la data effettiva mostrata sotto appena scelta
   (`formattaConGiorno`).
2. Domanda proposta (`generaDomanda(deduciCategoria(lista.nome),
   esitoQuando, 'Europe/Rome')`), in un campo di testo modificabile -
   si rigenera automaticamente quando cambia "Quando?" **solo se
   l'utente non l'ha ancora toccata a mano** (stesso pattern "derivato
   vs manuale" già usato per il punteggio in
   `app/(app)/faccende/index.tsx`: niente `useEffect` + `setState`, un
   flag "toccata a mano" e un valore derivato durante il render).
3. Elenco delle voci della lista come chip selezionabili, contatore "N
   di 3 scelte", più un chip "+ Proponi un'altra opzione" che apre un
   campo di testo libero (occupa uno dei 3 slot, non un quarto).
4. Chip scadenza voto (30 min / 1 ora / 2 ore / 24 ore / "Scegli data e
   ora"), default "24 ore" **se** l'attività non è precisa
   (`attivita_precisione !== 'orario'`), altrimenti un valore che
   rispetti il vincolo "precedente all'attività" (es. 2 ore prima
   dell'orario scelto, arrotondato).
5. Bottone "Invia sfida", disabilitato finché non ci sono esattamente 3
   scelte valide; alla pressione chiama `crea.mutate({ ...,
   richiestaId: crypto.randomUUID() stabile per tutta la sessione del
   form (generato una volta con `useState(() => crypto.randomUUID())`,
   non ad ogni render) })`, poi `router.replace` a `sfide/[id]` con
   l'id ritornato.

- [ ] **Step 2: Verificare**

Run: `npx tsc --noEmit && npx expo lint`
Expected: 0 errori

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/sfide/nuova.tsx"
git commit -m "feat: pagina creazione sfida"
```

---

### Task 15: Pagina — sfida (voto / attesa / spareggio / risultati)

**Files:**
- Create: `app/(app)/sfide/[id].tsx`

**Interfaces:**
- Consumes: `useSfidaDettaglio` (Task 11), `useGruppoAttivo`.
- Produces: schermata, nessuna nuova interfaccia esportata.

- [ ] **Step 1: Implementare**

Una sola pagina, stati condizionali (stesso principio di
`app/(app)/faccende/index.tsx`):
- **Caricamento**: indicatore.
- **Sfida annullata/non trovata**: messaggio, nessun dato finto.
- **Ho già votato nel turno corrente, turno ancora `in_corso`**:
  domanda, gruppo, organizzatore, data attività, scadenza, "X di Y
  persone hanno votato" (dalla vista/conteggio di Task 8, **mai** le
  opzioni altrui), nessun pulsante di voto.
- **Non ho ancora votato, turno `in_corso`, `tipo_turno` a 3 scelte**:
  le opzioni visibili (Task 8 già filtra quelle segrete), selezione a
  3 con contatore, "+ Proponi un'altra opzione", bottone "Conferma le
  mie 3 scelte" (disabilitato finché non sono esattamente 3; disabilita
  se stesso durante l'invio, mostra l'errore reale in caso di fallimento
  — stesso pattern già introdotto in `app/(app)/faccende/index.tsx`
  dopo il bug "manca il tasto completato").
- **Non ho ancora votato, `tipo_turno = 'spareggio'`**: solo le opzioni
  in `opzioni_in_gara`, selezione singola, bottone "Conferma la mia
  scelta".
- **Turno concluso `concluso_vincitore` (sfida `conclusa_vincitore`)**:
  "Abbiamo un vincitore! 🎉", nome opzione, classifica completa con
  voti e percentuali (da `sfide_turno_risultati`, mai da `sfide_voti`).
- **Sfida `conclusa_senza_accordo` o `conclusa_scaduta`**: "Nessun
  accordo! 😅" o "La sfida è scaduta prima che tutti votassero",
  bottone "Riprova" → chiama `ripeti_sfida` (Task 10's `ripeti`,
  passato giù o richiamato via un secondo hook — riusare `useSfide`
  accanto a `useSfidaDettaglio` in questa pagina).

- [ ] **Step 2: Verificare**

Run: `npx tsc --noEmit && npx expo lint`
Expected: 0 errori

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/sfide/[id].tsx"
git commit -m "feat: pagina sfida (voto, attesa, spareggio, risultati)"
```

---

### Task 16: Pagina — elenco sfide del gruppo

**Files:**
- Create: `app/(app)/sfide/index.tsx`
- Modify: `app/(app)/liste/index.tsx`

**Interfaces:**
- Consumes: `useSfide` (Task 10).

- [ ] **Step 1: Implementare `sfide/index.tsx`**

Sezioni (brief Parte I.F): "In attesa del mio voto", "Attive",
"Spareggi", "Concluse"/"Storico" — raggruppate da `sfida.stato` +
`hoGiaVotatoNelTurnoCorrente` (quest'ultimo richiede, per ogni sfida
dell'elenco, sapere se ho votato nel turno corrente: **non** fare N
query separate — estendere `listaSfide`/una nuova funzione in Task 8 se
necessario per includere questo dato in un'unica query, tornando a
Task 8 se manca).

- [ ] **Step 2: Aggiungere l'ingresso da `liste/index.tsx`**

Una riga/sezione "Sfide del gruppo" che naviga a `/sfide`, stesso
componente di riga già usato in quella pagina.

- [ ] **Step 3: Verificare**

Run: `npx tsc --noEmit && npx expo lint`
Expected: 0 errori

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/sfide/index.tsx" "app/(app)/liste/index.tsx"
git commit -m "feat: elenco sfide del gruppo"
```

---

### Task 17: Pagina notifiche e campanella in Home

**Files:**
- Create: `app/(app)/notifiche/index.tsx`
- Modify: `app/(app)/index.tsx`

**Interfaces:**
- Consumes: `useNotifiche` (Task 12).

- [ ] **Step 1: Implementare `notifiche/index.tsx`**

Elenco (`titolo`, `corpo`, data relativa), tap su una notifica →
`segnaLetta.mutate(id)` + se `sfida_id` non è null, `router.push` a
`/sfide/[id]`.

- [ ] **Step 2: Aggiungere la campanella in Home**

Icona `Feather name="bell"` accanto a profilo/logout già esistenti in
`app/(app)/index.tsx`, con un badge numerico (`Badge` esistente, tono
`rosso`) quando `nonLette > 0`; nessun'altra modifica alla Home.

- [ ] **Step 3: Verificare**

Run: `npx tsc --noEmit && npx expo lint`
Expected: 0 errori

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/notifiche/index.tsx" "app/(app)/index.tsx"
git commit -m "feat: pagina notifiche e campanella in Home"
```

---

### Task 18: Verifica finale

**Files:** nessuno (solo comandi)

- [ ] **Step 1: Suite completa**

Run: `npx tsc --noEmit && npx expo lint && npm test`
Expected: 0 errori TypeScript, 0 errori lint, tutti i test esistenti +
nuovi passano (Task 1-4 aggiungono test; nessun test preesistente deve
rompersi).

- [ ] **Step 2: Percorsi protetti**

Run: `git diff --stat deb2d84..HEAD -- src/calcolo/saldi.ts src/calcolo/divisioni.ts src/calcolo/tipi.ts src/api/spese.ts src/hooks/useSpese.ts supabase/migrations/00000000000001_schema_iniziale.sql supabase/migrations/00000000000002_rls.sql supabase/migrations/00000000000003_funzioni_rpc.sql supabase/migrations/00000000000004_grants.sql supabase/migrations/00000000000005_fix_gruppi_select.sql supabase/migrations/00000000000006_liste.sql supabase/migrations/00000000000007_opzioni_liste.sql supabase/migrations/00000000000008_uscita_gruppo.sql supabase/migrations/00000000000009_fix_riadesione_gruppo.sql supabase/migrations/00000000000010_profili_utente.sql supabase/migrations/00000000000011_comprato_da_articolo.sql supabase/migrations/00000000000012_prezzo_note_articolo.sql supabase/migrations/00000000000013_faccende.sql supabase/migrations/00000000000014_faccende_rpc.sql`
Expected: output vuoto (nessuna riga)

- [ ] **Step 3: Verifica manuale guidata**

Checklist minima da eseguire nel browser (un solo account disponibile
in questa fase, come già accaduto per il modulo Faccende — annotare
esplicitamente nel riepilogo finale che il flusso a **due** account
reali non è stato verificato se non diversamente possibile): creare una
lista di prova con ≥3 voci, avviare una sfida, verificare la domanda
proposta e che sia modificabile, confermare l'invio, verificare lo
stato "in attesa degli altri" e il conteggio votanti, verificare che le
migrazioni **non** siano ancora applicate al progetto live finché non
autorizzato esplicitamente (stesso processo di approvazione già seguito
per Faccende prima di `supabase db push`).

- [ ] **Step 4: Riepilogo finale**

Preparare per l'utente: file creati/modificati, migrazioni da
applicare, risultati test, funzionalità verificate vs non verificabili
in questa sessione (push native, due account reali), limitazioni
residue — stesso formato già usato nei riepiloghi del modulo Faccende.

---

## Self-Review (completato dall'autore del piano)

**Copertura spec:** Parte A (creazione, quando, domanda, 3 opzioni,
proposta personalizzata) → Task 2, 3, 14. Parte B (invio atomico,
notifiche) → Task 6, 9, 12, 17. Parte C (voto, segretezza) → Task 5, 6,
11, 15. Parte D (regole di voto, casi A–D, spareggio) → Task 4, 6.
Parte E (chiusura, partecipanti) → Task 6 (`_chiudi_turno_se_completo`,
policy "membro che esce"). Parte F (risultati, storico) → Task 8, 15,
16. Parte G (eventi di notifica) → Task 6 (tutti i `tipo` elencati),
Task 9/12/17. Parte H (schema, RPC, RLS) → Task 5, 6, 7. Parte I
(pagine) → Task 13-17. Parte J (Realtime) → Task 10, 11, 12. Parte K
(test) → Task 1-4 coprono i casi 1-20/30 che sono calcolo puro; i casi
21-30 (notifiche, RLS, isolamento gruppi, concorrenza, Realtime,
compatibilità con liste modificate) non sono eseguibili come test
automatici senza un'istanza Postgres locale (stesso limite già
incontrato ed esplicitamente segnalato nel modulo Faccende) — restano
verificati per revisione del codice SQL in Task 6, non da un test
runnabile: va dichiarato esplicitamente nel riepilogo finale (Task 18
Step 4), non taciuto.

**Coerenza dei tipi:** `EsitoDatazione` (Task 2) è lo stesso tipo
consumato da Task 3 e Task 14. `RisultatoTurno`/`calcolaRisultatoTurno`
(Task 4) non è chiamato direttamente da nessuna RPC (Postgres non
esegue TypeScript) — è lo **specifica di riferimento** che Task 6
riscrive in SQL; ho reso esplicito in Task 6 che l'algoritmo deve
coincidere esattamente, e i test di Task 4 restano l'oracolo con cui
confrontare manualmente la RPC durante la revisione statica (nessuna
istanza Postgres per un test automatico end-to-end, coerente col limite
già dichiarato).

**Punto aperto esplicito, non un buco silenzioso:** Task 8 Step 2
richiede eventualmente di tornare su Task 5 per aggiungere una vista
`sfide_turni_progresso` se la prima stesura di Task 5/6 non espone già
un modo sicuro di contare "quanti hanno votato" senza leggere
`sfide_voti` altrui. L'ho lasciato come passo esplicito invece di
deciderlo a priori perché la forma esatta (vista vs colonna
denormalizzata su `sfide_turni` aggiornata dalla stessa transazione di
chiusura) è un dettaglio che l'implementer di Task 5/6 può risolvere in
entrambi i modi senza cambiare nessun'altra interfaccia a valle (Task 8
la consuma comunque come una lettura in più nella stessa funzione).
