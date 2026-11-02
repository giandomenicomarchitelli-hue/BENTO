# Personale — Liste personali Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** prima sezione del nuovo mondo "Personale" — liste private
dell'utente (non condivise con nessun gruppo), stesso concetto delle
liste generiche di gruppo ma scoped per persona invece che per gruppo.

**Architecture:** tabelle Postgres separate da `liste`/`voci_lista`
(vedi Spec, "Decisione di modello dati"), stesso pattern di API/hook/UI
già usato per le liste di gruppo ma scoped per `utente_id` invece di
`gruppo_id`, senza i campi specifici di gruppo che non si applicano
(`creato_da` — c'è un solo possibile autore, il proprietario — e
`mostra_in_home`/`con_prezzi`, mai richiesti per questa sezione). Nessuna
nuova Home in questa fase: una tile temporanea sulla Dashboard esistente
dà accesso diretto per poter testare, verrà rimossa quando arriva la
Fase 4 (nuova Home a due mondi).

**Tech Stack:** React Native + Expo + TypeScript, Supabase (Postgres +
RLS + Realtime), TanStack React Query, componenti `Bento*`/`Glass*`
esistenti in `src/components` e `src/theme/tokens.ts`.

**Spec:** `docs/superpowers/specs/2026-11-02-personale-gruppi-design.md`

## Global Constraints

- Tabelle separate da `liste`/`voci_lista`, scoped per `utente_id uuid
  references auth.users(id)`, mai per `gruppo_id` — vedi Spec per il
  perché.
- RLS: `utente_id = auth.uid()` su `liste_personali`; su
  `voci_lista_personali`, appartenenza tramite la lista genitrice
  (`exists (select 1 from liste_personali where id = lista_id and
  utente_id = auth.uid())`) — stesso principio di `voci_lista`/`liste`,
  nessuna nozione di gruppo/membro coinvolta.
- Nessun campo specifico di gruppo: niente `creato_da` (il proprietario
  è già `utente_id`), niente `mostra_in_home`/`con_prezzi`, niente
  `note`/`prezzo_centesimi` sulle voci — nessuno di questi è stato
  richiesto per le liste personali, aggiungerli ora sarebbe costruire
  per un caso d'uso ipotetico.
- Stile: `BentoScreen`/`GlassCard`/`BentoButton`/`tokens.ts` — **non**
  lo stile dei file `app/(app)/prototipo-*.tsx` (restano prototipi
  isolati, non toccare).
- Fuori scope: condivisione di una lista personale con un gruppo (il
  "ponte" è esplicitamente rimandato, vedi Spec); modifica/nota/prezzo
  sulle voci.
- `src/types/database.types.ts` va aggiornato a mano (stessa convenzione
  già usata per le migration precedenti in questo progetto — nessun
  accesso Docker/DB locale in questo ambiente).

## Review Focus

- Una voce aggiunta a una lista personale di un utente non deve mai
  essere visibile o modificabile da un altro utente, nemmeno se nello
  stesso gruppo — verificare che la RLS non lasci alcun varco (prova
  mentale: utente B tenta di leggere/scrivere la riga di utente A usando
  l'id della lista, deve fallire sempre) (Task 1).
- Eliminare una lista personale deve eliminare anche le sue voci (nessun
  orfano in `voci_lista_personali`) — `on delete cascade`, verificato
  nella migration, non lasciato all'applicazione (Task 1).
- La tile temporanea sulla Dashboard non deve richiedere un gruppo
  attivo per funzionare (le liste personali non dipendono da nessun
  gruppo) — verificare che la rotta `/personale/liste` non faccia mai
  un redirect legato a `gruppoAttivoId` (Task 4).

---

## File Structure

```
supabase/migrations/
  00000000000034_liste_personali.sql   (nuovo)

src/types/database.types.ts             (modificato a mano)

src/api/listePersonali.ts               (nuovo)
src/api/vociListaPersonali.ts           (nuovo)
src/hooks/useListePersonali.ts          (nuovo)
src/hooks/useVociListaPersonali.ts      (nuovo)

app/(app)/personale/liste/index.tsx     (nuovo)
app/(app)/personale/liste/[id].tsx      (nuovo)
app/(app)/_layout.tsx                   (modificato: 2 nuove rotte)
app/(app)/dashboard.tsx                 (modificato: tile temporanea)
```

---

### Task 1: Database — tabelle liste_personali e voci_lista_personali

**Files:**
- Create: `supabase/migrations/00000000000034_liste_personali.sql`
- Modify: `src/types/database.types.ts` (a mano)

**Interfaces:**
- Produces: tabelle `liste_personali` (`id`, `utente_id`, `nome`,
  `creato_il`) e `voci_lista_personali` (`id`, `lista_id`, `testo`,
  `fatto`, `creato_il`). Consumato da Task 2.

- [ ] **Step 1: Scrivere la migration**

```sql
create table public.liste_personali (
  id uuid primary key default gen_random_uuid(),
  utente_id uuid not null references auth.users(id) on delete cascade,
  nome text not null check (char_length(trim(nome)) > 0),
  creato_il timestamptz not null default now()
);
create index idx_liste_personali_utente on public.liste_personali(utente_id);

create table public.voci_lista_personali (
  id uuid primary key default gen_random_uuid(),
  lista_id uuid not null references public.liste_personali(id) on delete cascade,
  testo text not null check (char_length(trim(testo)) > 0),
  fatto boolean not null default false,
  creato_il timestamptz not null default now()
);
create index idx_voci_lista_personali_lista on public.voci_lista_personali(lista_id);

alter table public.liste_personali enable row level security;
alter table public.voci_lista_personali enable row level security;

create policy liste_personali_tutti on public.liste_personali for all
  using (utente_id = auth.uid())
  with check (utente_id = auth.uid());

create policy voci_lista_personali_tutti on public.voci_lista_personali for all
  using (
    exists (
      select 1 from public.liste_personali l
      where l.id = lista_id and l.utente_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.liste_personali l
      where l.id = lista_id and l.utente_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.liste_personali to authenticated;
grant select, insert, update, delete on public.voci_lista_personali to authenticated;

alter publication supabase_realtime add table public.liste_personali, public.voci_lista_personali;
```

- [ ] **Step 2: Aggiornare `src/types/database.types.ts` a mano**

Aggiungere i blocchi `liste_personali` e `voci_lista_personali` (`Row`/
`Insert`/`Update`) sotto `public.Tables`, stessa forma di `liste`/
`voci_lista` già presenti nello stesso file, con i campi esatti sopra
(niente `creato_da`, `mostra_in_home`, `con_prezzi`, `note`,
`prezzo_centesimi`).

- [ ] **Step 3: Verificare**

Run: `npx tsc --noEmit`
Expected: 0 errori (nessun test automatico per una migration — nessun
accesso Docker/DB locale in questo ambiente).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/00000000000034_liste_personali.sql src/types/database.types.ts
git commit -m "feat: tabelle liste_personali e voci_lista_personali"
```

---

### Task 2: API — listePersonali.ts e vociListaPersonali.ts

**Files:**
- Create: `src/api/listePersonali.ts`
- Create: `src/api/vociListaPersonali.ts`

**Interfaces:**
- Consumes: tabelle del Task 1.
- Produces: `listaListePersonali(utenteId)`, `creaListaPersonale({utenteId, nome})`,
  `eliminaListaPersonale(id)`; `listaVociPersonali(listaId)`,
  `aggiungiVocePersonale(listaId, testo)`, `aggiornaVocePersonale(id, {testo?, fatto?})`,
  `eliminaVocePersonale(id)`. Consumato da Task 3.

- [ ] **Step 1: `src/api/listePersonali.ts`**

Stesso pattern di `src/api/liste.ts` (leggerlo per lo stile esatto),
scoped per `utente_id` invece di `gruppo_id`, senza `creatoDaMembroId`/
`mostraInHome`/`conPrezzi`:

```ts
export type ListaPersonale = Database['public']['Tables']['liste_personali']['Row'];

export async function listaListePersonali(utenteId: string): Promise<ListaPersonale[]>
// .eq('utente_id', utenteId).order('creato_il', { ascending: true })

export async function creaListaPersonale(params: { utenteId: string; nome: string }): Promise<ListaPersonale>
// insert({ utente_id, nome }).select().single()

export async function eliminaListaPersonale(listaId: string): Promise<void>
// delete().eq('id', listaId)
```

- [ ] **Step 2: `src/api/vociListaPersonali.ts`**

Stesso pattern di `src/api/vociLista.ts`, senza `creatoDaMembroId`/
`note`/`prezzoCentesimi`:

```ts
export type VoceListaPersonale = Database['public']['Tables']['voci_lista_personali']['Row'];

export async function listaVociPersonali(listaId: string): Promise<VoceListaPersonale[]>
// .eq('lista_id', listaId).order('creato_il', { ascending: true })

export async function aggiungiVocePersonale(listaId: string, testo: string): Promise<VoceListaPersonale>
// insert({ lista_id: listaId, testo }).select().single()

export async function aggiornaVocePersonale(voceId: string, campi: { testo?: string; fatto?: boolean }): Promise<void>
// stesso pattern "solo i campi passati" di aggiornaVoce

export async function eliminaVocePersonale(voceId: string): Promise<void>
// delete().eq('id', voceId)
```

- [ ] **Step 3: Verificare**

Run: `npx tsc --noEmit`
Expected: 0 errori

- [ ] **Step 4: Commit**

```bash
git add src/api/listePersonali.ts src/api/vociListaPersonali.ts
git commit -m "feat: API liste personali"
```

---

### Task 3: Hook — useListePersonali e useVociListaPersonali

**Files:**
- Create: `src/hooks/useListePersonali.ts`
- Create: `src/hooks/useVociListaPersonali.ts`

**Interfaces:**
- Consumes: Task 2.
- Produces: `useListePersonali(utenteId: string | null)` → `{ liste,
  isLoading, error, crea, elimina }`; `useVociListaPersonali(listaId:
  string | null)` → `{ voci, isLoading, error, aggiungi, aggiorna,
  elimina }`. Consumato da Task 4.

- [ ] **Step 1: `useListePersonali.ts`**

Stesso pattern esatto di `src/hooks/useListe.ts` (leggerlo): query React
Query con chiave `['liste-personali', utenteId]`, sottoscrizione
realtime sul canale `liste_personali` filtrato per `utente_id=eq.
${utenteId}`, mutation `crea`/`elimina`.

- [ ] **Step 2: `useVociListaPersonali.ts`**

Stesso pattern esatto di `src/hooks/useVociLista.ts`: chiave
`['voci-lista-personali', listaId]`, canale `voci_lista_personali`
filtrato per `lista_id=eq.${listaId}`, mutation `aggiungi`/`aggiorna`/
`elimina`.

- [ ] **Step 3: Verificare**

Run: `npx tsc --noEmit`
Expected: 0 errori

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useListePersonali.ts src/hooks/useVociListaPersonali.ts
git commit -m "feat: hook liste personali"
```

---

### Task 4: UI — schermate liste personali + accesso temporaneo

**Files:**
- Create: `app/(app)/personale/liste/index.tsx`
- Create: `app/(app)/personale/liste/[id].tsx`
- Modify: `app/(app)/_layout.tsx`
- Modify: `app/(app)/dashboard.tsx`

**Interfaces:**
- Consumes: Task 3's hook, `useAuthStore` per `utenteId`.
- Produces: rotte `/personale/liste` e `/personale/liste/[id]`.

- [ ] **Step 1: Registrare le rotte**

In `_layout.tsx`, aggiungere (vicino a `liste/index`):
```tsx
<Stack.Screen name="personale/liste/index" options={{ title: 'Le mie liste' }} />
<Stack.Screen name="personale/liste/[id]" options={{ title: 'Lista' }} />
```

- [ ] **Step 2: `app/(app)/personale/liste/index.tsx`**

Stesso comportamento di `app/(app)/liste/index.tsx` (leggerlo per la
logica, non per lo stile), ma:
- nessun redirect/guard legato a un gruppo — basta `utenteId` da
  `useAuthStore`; se `undefined` (non dovrebbe succedere dentro
  `(app)/`), trattarlo come lista vuota/non ancora pronta, non reindirizzare.
- stile Bento: `BentoScreen`, form di creazione in una `GlassCard` (solo
  campo nome + `BentoButton` "Crea lista", niente chip
  "mostra in home"/"con prezzi" — non esistono per le liste personali),
  elenco con una riga per lista dentro una `GlassCard` (nome + bottone
  testuale "Elimina" che apre `confermaAzione` prima di
  `elimina.mutate`, stesso pattern già usato in `liste/index.tsx`),
  stato vuoto come testo centrato.
- al tap su una lista: `router.push({ pathname: '/personale/liste/[id]', params: { id: lista.id, nome: lista.nome } })`.

- [ ] **Step 3: `app/(app)/personale/liste/[id].tsx`**

Stesso comportamento di `app/(app)/liste/[id].tsx` per la parte
semplice (niente "con prezzi"/note/modifica — qui non esistono): un
campo testo + bottone "Aggiungi" per una nuova voce, elenco voci con
checkbox (tap per `aggiorna.mutate({id, fatto: !voce.fatto})`) + bottone
"Elimina" per voce (con `confermaAzione`), stile `BentoScreen`/
`GlassCard`.

- [ ] **Step 4: Tile temporanea sulla Dashboard**

In `app/(app)/dashboard.tsx`, aggiungere una `GlassTile` nella griglia
esistente (stesso pattern delle altre tile, es. `icona="list"`, un
colore `accenti.*` già riusato altrove come fu deciso per la tile
"Scrivi"), `titolo="Personale"`, `onPress={() => router.push('/personale/liste')}`.
Commento che segnala che è temporanea, da rimuovere quando arriva la
Fase 4 (nuova Home a due mondi).

- [ ] **Step 5: Verificare**

Run: `npx tsc --noEmit`
Expected: 0 errori

- [ ] **Step 6: Verificare manualmente**

Run: `npm start`
Expected: Dashboard → tile "Personale" → "Le mie liste" → crea una
lista, apri, aggiungi/spunta/elimina una voce, elimina la lista. Nessun
redirect legato al gruppo attivo in nessun momento.

- [ ] **Step 7: Commit**

```bash
git add "app/(app)/personale" "app/(app)/_layout.tsx" "app/(app)/dashboard.tsx"
git commit -m "feat: schermate liste personali"
```

---

## Self-Review

**Copertura dello spec:** la Fase 1 (Liste personali) della Spec è
interamente coperta: tabella separata scoped per utente (Task 1), API/
hook che rispecchiano il pattern di gruppo (Task 2-3), UI nello stile
Bento esistente con accesso temporaneo pre-Fase-4 (Task 4). Le Fasi 2-4
restano esplicitamente fuori da questo piano (piani separati).

**Proporzione:** gli unici blocchi di codice completi sono lo schema SQL
(Task 1, dato pinnato) e le firme esatte delle funzioni API (Task 2, con
il corpo lasciato al builder per analogia diretta col file gemello già
nel codebase); il resto è descritto per comportamento/pattern da
rispecchiare, coerente con le fasi precedenti di questo progetto.
