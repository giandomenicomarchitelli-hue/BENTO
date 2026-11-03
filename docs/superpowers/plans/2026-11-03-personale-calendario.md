# Personale — Calendario personale Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fase 3 del mondo "Personale" — un calendario privato per
eventi dell'utente, raggiungibile dalla tile "Calendario" già presente
(oggi `badge="Presto"`) su `/personale`. Versione semplificata decisa
esplicitamente ora: solo eventi personali, **nessuna aggregazione con
gli impegni dei gruppi** (quella parte della Spec originale — unire le
occorrenze di tutti i gruppi dell'utente — resta fuori da questo piano).

**Architecture:** stesso principio già usato per Liste e Note
personali: una tabella separata (`eventi_personali`) scoped per
`utente_id`, RLS banale. A differenza di `impegni` (gruppo), qui non
serve nessun motore di ricorrenza né una tabella di occorrenze
generate: un evento personale è una singola riga con una sua data —
niente `frequenza`/`intervallo_ricorrenza`/tabella `occorrenze_*`,
niente concetto di "membro assegnato" (il proprietario è già
`utente_id`, non c'è nessun altro). La UI riusa `CalendarioGriglia` e
`celleGrigliaMese` così come sono (nessuna dipendenza da gruppo in
quei due), con un form di creazione/modifica nuovo e più semplice di
`ModificaImpegno` (niente campi che qui non si applicano).

**Tech Stack:** React Native + Expo + TypeScript, Supabase (Postgres +
RLS + Realtime), TanStack React Query, componenti `Bento*`/`Glass*` e
`CalendarioGriglia`/`SectionHeader` già esistenti.

**Spec:** `docs/superpowers/specs/2026-11-02-personale-gruppi-design.md`
(sezione "Fase 3 — Calendario unificato" — qui implementata solo per
la parte "eventi personali propri"; l'aggregazione cross-gruppo
descritta in quella sezione è esplicitamente rimandata)

## Global Constraints

- Tabella separata da `impegni`/`occorrenze_impegni`, scoped per
  `utente_id uuid references auth.users(id)` — mai `gruppo_id` — vedi
  Spec, "Decisione di modello dati".
- RLS: `utente_id = auth.uid()` su `eventi_personali`, nessuna tabella
  figlia da gestire (a differenza delle note, qui non ci sono foto).
- Niente ricorrenza, niente promemoria/notifiche push per questi
  eventi, niente campo "assegnato a" — nessuno di questi è stato
  richiesto per questa fase; costruirli ora sarebbe andare oltre
  quanto chiesto.
- Niente aggregazione con `occorrenze_impegni` dei gruppi — esplicito,
  decisione dell'utente per questa fase. La tile "Calendario" porta
  SOLO agli eventi personali.
- Riuso diretto, non reimplementazione: `CalendarioGriglia`
  (`src/components/CalendarioGriglia.tsx`) e `celleGrigliaMese`
  (`src/calcolo/griglioMensile.ts`) sono già indipendenti da qualunque
  gruppo — nessuna modifica a quei file.
- Stile form: stesso pattern già in uso in `ModificaImpegno.tsx` per
  data (`TextInput` libero "AAAA-MM-GG" validato con
  `/^\d{4}-\d{2}-\d{2}$/`, messaggio "Formato: AAAA-MM-GG") e per ora
  (toggle "Tutto il giorno" che azzera `ora` a `null`, altrimenti un
  campo "HH:MM" con una bozza preservata quando il toggle si riattiva)
  — non riusare `ModificaImpegno` stesso (porta campi che qui non
  esistono: `frequenza`, `assegnatoA`, `modificabileDaTutti`).
- `src/types/database.types.ts` aggiornato a mano (nessun accesso
  Docker/DB locale in questo ambiente, stessa convenzione delle
  migration precedenti).

## Review Focus

- Creare un evento con titolo vuoto o solo spazi va impedito lato
  client, stesso guard già usato per liste/note personali (Task 4).
- Una data in un formato diverso da AAAA-MM-GG blocca il salvataggio
  con un messaggio leggibile, stesso comportamento già validato in
  `ModificaImpegno` (Task 4).
- Riattivare un orario specifico dopo aver spuntato "Tutto il giorno"
  non deve perdere l'ultimo orario scritto (stessa bozza-ora già
  corretta in `ModificaImpegno` — qui va riprodotta, non data per
  scontata) (Task 4).
- Toccare un giorno fuori dal mese visualizzato nella griglia deve
  scorrere al mese adiacente, stesso comportamento già presente nel
  calendario di gruppo (Task 4).
- Nessun redirect o guard legato a un gruppo in nessun momento su
  questa schermata (coerenza con tutto il resto della sezione
  Personale) (Task 4).

---

## File Structure

```
supabase/migrations/
  00000000000037_eventi_personali.sql   (nuovo)

src/types/database.types.ts              (modificato a mano)

src/api/eventiPersonali.ts               (nuovo)
src/hooks/useEventiPersonali.ts          (nuovo)

app/(app)/personale/calendario/index.tsx (nuovo)
app/(app)/personale/index.tsx            (modificato: tile "Calendario" reale)
app/(app)/_layout.tsx                    (modificato: 1 nuova rotta)
```

---

### Task 1: Database — tabella eventi_personali

**Files:**
- Create: `supabase/migrations/00000000000037_eventi_personali.sql`
- Modify: `src/types/database.types.ts` (a mano)

**Interfaces:**
- Produces: tabella `eventi_personali` (`id`, `utente_id`, `titolo`,
  `descrizione`, `data`, `ora`, `creato_il`). Consumato da Task 2.

- [ ] **Step 1: Scrivere la migration**

```sql
create table public.eventi_personali (
  id uuid primary key default gen_random_uuid(),
  utente_id uuid not null references auth.users(id) on delete cascade,
  titolo text not null check (char_length(trim(titolo)) > 0),
  descrizione text,
  data date not null,
  ora text,
  creato_il timestamptz not null default now()
);
create index idx_eventi_personali_utente_data on public.eventi_personali(utente_id, data);

alter table public.eventi_personali enable row level security;

create policy eventi_personali_tutti on public.eventi_personali for all
  using (utente_id = auth.uid())
  with check (utente_id = auth.uid());

grant select, insert, update, delete on public.eventi_personali to authenticated;

alter publication supabase_realtime add table public.eventi_personali;
```

`ora` è testo libero in formato "HH:MM" (come `impegni.ora`), `null`
per un evento "tutto il giorno" — stessa convenzione, non un
`time`/`timestamptz` Postgres: evita qualunque conversione di fuso
orario, che per un evento personale a una singola data non serve.

- [ ] **Step 2: Aggiornare `src/types/database.types.ts` a mano**

Aggiungere il blocco `eventi_personali` (`Row`/`Insert`/`Update`) sotto
`public.Tables`, stessa forma di `note_personali` già presente nello
stesso file, con i campi esatti sopra (`descrizione`/`ora` nullable,
`data: string`).

- [ ] **Step 3: Verificare**

Run: `npx tsc --noEmit`
Expected: 0 errori (nessun test automatico per una migration — nessun
accesso Docker/DB locale in questo ambiente).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/00000000000037_eventi_personali.sql src/types/database.types.ts
git commit -m "feat: tabella eventi_personali"
```

---

### Task 2: API — eventiPersonali.ts

**Files:**
- Create: `src/api/eventiPersonali.ts`

**Interfaces:**
- Consumes: tabella del Task 1.
- Produces:
  - `EventoPersonale` (= `Row` di `eventi_personali`),
    `listaEventiPersonali(utenteId: string): Promise<EventoPersonale[]>`,
    `creaEventoPersonale(params: { utenteId: string; titolo: string; data: string; ora?: string | null; descrizione?: string | null }): Promise<EventoPersonale>`,
    `aggiornaEventoPersonale(params: { id: string; titolo?: string; data?: string; ora?: string | null; descrizione?: string | null }): Promise<void>`,
    `eliminaEventoPersonale(id: string): Promise<void>`.
  - Consumato da Task 3.

- [ ] **Step 1: `src/api/eventiPersonali.ts`**

Stesso pattern di `src/api/notePersonali.ts` (leggerlo per lo stile
esatto):

```ts
export type EventoPersonale = Database['public']['Tables']['eventi_personali']['Row'];

export async function listaEventiPersonali(utenteId: string): Promise<EventoPersonale[]>
// .eq('utente_id', utenteId).order('data', { ascending: true })

export async function creaEventoPersonale(params: { utenteId: string; titolo: string; data: string; ora?: string | null; descrizione?: string | null }): Promise<EventoPersonale>
// insert({ utente_id, titolo, data, ora: params.ora ?? null, descrizione: params.descrizione ?? null }).select().single()

export async function aggiornaEventoPersonale(params: { id: string; titolo?: string; data?: string; ora?: string | null; descrizione?: string | null }): Promise<void>
// update(solo i campi definiti in params, escluso id).eq('id', params.id) — stesso pattern "solo i campi passati" di aggiornaNotaPersonale

export async function eliminaEventoPersonale(id: string): Promise<void>
// delete().eq('id', id)
```

- [ ] **Step 2: Verificare**

Run: `npx tsc --noEmit`
Expected: 0 errori

- [ ] **Step 3: Commit**

```bash
git add src/api/eventiPersonali.ts
git commit -m "feat: API eventi personali"
```

---

### Task 3: Hook — useEventiPersonali

**Files:**
- Create: `src/hooks/useEventiPersonali.ts`

**Interfaces:**
- Consumes: Task 2.
- Produces: `useEventiPersonali(utenteId: string | null)` → `{ eventi,
  isLoading, error, crea, aggiorna, elimina }`. Consumato da Task 4.

- [ ] **Step 1: `useEventiPersonali.ts`**

Stesso pattern esatto di `src/hooks/useNotePersonali.ts` (leggerlo):
chiave `['eventi-personali', utenteId]`, canale realtime
`eventi_personali` filtrato per `utente_id=eq.${utenteId}`, mutation
`crea` (→ `creaEventoPersonale`), `aggiorna` (→
`aggiornaEventoPersonale`, parametro `{ id, titolo?, data?, ora?,
descrizione? }`), `elimina` (→ `eliminaEventoPersonale`, prende
`id: string` direttamente, non un oggetto).

- [ ] **Step 2: Verificare**

Run: `npx tsc --noEmit`
Expected: 0 errori

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useEventiPersonali.ts
git commit -m "feat: hook eventi personali"
```

---

### Task 4: UI — schermata calendario personale, collegamento da Personale

**Files:**
- Create: `app/(app)/personale/calendario/index.tsx`
- Modify: `app/(app)/personale/index.tsx`
- Modify: `app/(app)/_layout.tsx`

**Interfaces:**
- Consumes: Task 3, `useAuthStore` per `utenteId` (stesso pattern di
  `personale/liste/index.tsx` e `personale/note/index.tsx` — nessun
  redirect/guard legato a un gruppo), `CalendarioGriglia` (Props:
  `annoMeseISO: string`, `occorrenzePerGiorno: Record<string, number>`,
  `giornoSelezionato: string | null`, `onSelezionaGiorno: (dataISO: string) => void`),
  `celleGrigliaMese`/`aggiungiMesi`/`dataLocaleISO` da
  `src/calcolo/ricorrenzaFaccende.ts` e `src/calcolo/griglioMensile.ts`.
- Produces: rotta `/personale/calendario`.

- [ ] **Step 1: Registrare la rotta**

In `_layout.tsx`, vicino a `personale/note/[id]`:
```tsx
<Stack.Screen name="personale/calendario/index" options={{ title: 'Il mio calendario' }} />
```

- [ ] **Step 2: `app/(app)/personale/calendario/index.tsx`**

Stessa struttura della schermata di gruppo
`app/(app)/calendario/index.tsx` (leggerla per la logica di griglia +
giorno selezionato, non per i campi del form), ma: `utenteId` da
`useAuthStore` (nessun `useGruppoAttivo`), `useEventiPersonali(utenteId)`
al posto di `useImpegni`, niente concetto di "occorrenze" separate da
"eventi" — `eventi` stessi sono già la lista da raggruppare per
`data`.

- `annoMeseISO` iniziale dal mese corrente: usare
  `dataLocaleISO(new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone)`
  (fuso orario del dispositivo — non c'è un fuso orario di gruppo qui)
  per ottenere la data di oggi, poi `` `${oggiISO.slice(0, 7)}-01` ``
  come nel calendario di gruppo.
- `eventiPerGiorno: Record<string, number>` calcolato direttamente da
  `eventi` raggruppando per il campo `data` (già una stringa
  AAAA-MM-GG, nessuna conversione di fuso orario necessaria — a
  differenza del calendario di gruppo, che raggruppa `data_ora`
  timestamptz).
- `eventiDelGiorno = eventi.filter((e) => e.data === giornoSelezionato)`.
- `CalendarioGriglia` con `occorrenzePerGiorno={eventiPerGiorno}` —
  stesso componente del calendario di gruppo, nessuna modifica.
- Intestazione mese con frecce `aggiungiMesi(annoMeseISO, ±1)`, stesso
  pattern del calendario di gruppo.
- Sezione "eventi del giorno selezionato": una `GlassCard` per evento
  (titolo, orario o "Tutto il giorno", descrizione se presente),
  bottoni "Modifica"/"Elimina" (con `confermaAzione` prima di
  `elimina.mutate(evento.id)`), stato vuoto come testo centrato.
- Sezione "Nuovo evento / Modifica" (mostrata/nascosta con lo stesso
  pattern `SectionHeader` + `azione` del calendario di gruppo): un
  form con `titolo` (TextInput), `data` (TextInput "AAAA-MM-GG",
  precompilato con `giornoSelezionato` in creazione, validato con
  `/^\d{4}-\d{2}-\d{2}$/`, messaggio "Formato: AAAA-MM-GG" se non
  valido — Review Focus), un toggle "Tutto il giorno" (default `true`
  in creazione) che quando disattivato mostra un campo "HH:MM" la cui
  bozza resta preservata riattivando il toggle (stesso pattern
  `bozzaOra` di `ModificaImpegno.tsx:64-68` — Review Focus),
  `descrizione` (TextInput opzionale). `BentoButton` "Salva"
  disabilitato se titolo vuoto o data non valida; in creazione chiama
  `crea.mutate({ titolo, data, ora, descrizione })`, in modifica
  `aggiorna.mutate({ id, titolo, data, ora, descrizione })`.
- Messaggi di errore di `crea`/`aggiorna` mostrati come testo visibile
  (stesso pattern `messaggioErrore` del calendario di gruppo — può
  essere copiato identico, è una funzione pura senza dipendenze di
  gruppo).

- [ ] **Step 3: `app/(app)/personale/index.tsx`**

Sostituire la `GlassTile` "Calendario" (oggi `badge="Presto"`, nessun
`onPress`) con una reale: `onPress={() => router.push('/personale/calendario')}`,
nessun `badge`.

- [ ] **Step 4: Verificare**

Run: `npx tsc --noEmit`
Expected: 0 errori

Run: `npm run lint`
Expected: pulito

- [ ] **Step 5: Verificare manualmente**

Run: `npm start`
Expected: `/personale` → tile "Calendario" (non più "Presto") → crea un
evento su un giorno, verificalo nella griglia (puntino sul giorno),
aprilo/modificalo, prova il toggle "Tutto il giorno" avanti e indietro
senza perdere l'orario scritto, elimina l'evento. Nessun redirect
legato al gruppo attivo in nessun momento.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/personale/calendario" "app/(app)/personale/index.tsx" "app/(app)/_layout.tsx"
git commit -m "feat: calendario personale (senza aggregazione con i gruppi)"
```

---

## Self-Review

**Copertura dello spec:** la parte di Fase 3 qui coperta (eventi
personali propri, nessuna ricorrenza) è completa: tabella separata
scoped per utente (Task 1), API/hook che rispecchiano il pattern già
stabilito per liste e note personali (Task 2-3), UI che riusa
`CalendarioGriglia` invariato con un form su misura (Task 4).
L'aggregazione cross-gruppo descritta nella Spec per la Fase 3 è
esplicitamente esclusa da questo piano, per scelta dell'utente — non
un'omissione.

**Proporzione:** il blocco di codice completo è lo schema SQL (Task 1,
dato pinnato); il resto — firme API (Task 2, corpo lasciato per
analogia diretta con `notePersonali.ts`), hook (Task 3, mirror
esplicito di `useNotePersonali.ts`), UI (Task 4) — è descritto per
comportamento/pattern da rispecchiare da file gemelli già nel
codebase (il calendario di gruppo per la struttura, `ModificaImpegno`
per i dettagli di data/ora, liste/note personali per lo stile di
CRUD), coerente con le fasi precedenti di questo stesso mondo
"Personale".
