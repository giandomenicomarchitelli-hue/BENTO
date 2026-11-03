# Personale — Note personali Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fase 2 del mondo "Personale" — note private dell'utente, con
testo in sintassi markdown leggera e foto allegate, raggiungibili dalla
tile "Note" già presente (oggi `badge="Presto"`) su `/personale`.

**Architecture:** stesso principio già usato per le Liste personali
(Fase 1): tabelle Postgres separate (`note_personali`,
`foto_note_personali`), scoped per `utente_id`, RLS banale
(`utente_id = auth.uid()` / appartenenza tramite la nota genitrice).
Il contenuto è testo semplice con sintassi `**grassetto**`/`*corsivo*`/
`- voce` digitato in un `TextInput` normale, reso in sola lettura con
`react-native-markdown-display` (nessun editor WYSIWYG — deciso in
Spec). Le foto vivono in un bucket Supabase Storage dedicato e sempre
privato (`note-personali`), stesso pattern RLS-su-percorso già usato per
il bucket `carte-buoni` (vedi `00000000000021_carte_buoni_storage.sql`),
adattato per percorso-per-utente invece che percorso-per-gruppo.

**Tech Stack:** React Native + Expo + TypeScript, Supabase (Postgres +
RLS + Realtime + Storage), TanStack React Query, componenti
`Bento*`/`Glass*` esistenti, `expo-image-picker` (nuova dipendenza,
installata via `npx expo install`), `react-native-markdown-display`
(nuova dipendenza, decisa in Spec).

**Spec:** `docs/superpowers/specs/2026-11-02-personale-gruppi-design.md`
(sezione "Fase 2 — Note personali")

## Global Constraints

- Tabelle separate da qualunque tabella di gruppo, scoped per
  `utente_id uuid references auth.users(id)` — mai `gruppo_id` — vedi
  Spec, "Decisione di modello dati".
- RLS: `utente_id = auth.uid()` su `note_personali`; su
  `foto_note_personali`, appartenenza tramite la nota genitrice
  (`exists (select 1 from note_personali where id = nota_id and
  utente_id = auth.uid())`).
- Bucket Storage `note-personali` sempre `public = false` — una foto
  personale non va mai esposta con un URL permanente. Lettura solo via
  URL firmati a scadenza (`createSignedUrls`, 3600s). Limite 10 MB,
  solo `image/jpeg|png|heic|webp` — stesso schema del bucket
  `carte-buoni`, RLS sul primo segmento del percorso
  (`storage.foldername(name)[1]`) confrontato con `auth.uid()` (non
  `e_membro_di`: qui non c'è alcuna nozione di gruppo).
- Markdown: solo sintassi leggera in un `TextInput` multilinea normale,
  resa in sola lettura con `react-native-markdown-display` — nessuna
  libreria WYSIWYG/WebView (decisione già presa in Spec, non
  ridiscussa qui).
- Nessun autosave/debounce: un bottone "Salva" esplicito per
  titolo+contenuto, coerente con lo stile ad azione esplicita già usato
  per liste/voci in questo progetto.
- Fuori scope (dalla Spec): "ponti" tra nota personale e contenuto di
  gruppo; condivisione/permessi su una nota.
- `src/types/database.types.ts` aggiornato a mano (nessun accesso
  Docker/DB locale in questo ambiente, stessa convenzione delle
  migration precedenti).

## Review Focus

- Una nota appena creata ha `contenuto = ''`: aprire l'Anteprima non
  deve far crashare il renderer markdown (Task 5).
- Eliminare una nota con foto allegate elimina le righe di
  `foto_note_personali` (cascade) ma NON gli oggetti nel bucket Storage
  — limite noto e documentato, non un bug silenzioso: nessun
  trigger/Edge Function di pulizia in questa fase (Task 2).
- Un upload foto che fallisce (rete assente, bucket irraggiungibile)
  deve lasciare un errore consultabile nello stato della mutation, non
  sparire silenziosamente (Task 5).
- Un doppio tap rapido su "Aggiungi foto" non deve avviare due upload
  della stessa foto: il controllo va disabilitato mentre la mutation
  è in corso (Task 5).
- Creare una nota con titolo vuoto o solo spazi va impedito lato
  client, stesso guard già usato per le liste personali (Task 5).

---

## File Structure

```
supabase/migrations/
  00000000000035_note_personali.sql           (nuovo)
  00000000000036_note_personali_storage.sql   (nuovo)

src/types/database.types.ts                    (modificato a mano)

src/api/notePersonali.ts                        (nuovo)
src/api/fotoNotePersonali.ts                    (nuovo)
src/hooks/useNotePersonali.ts                   (nuovo)
src/hooks/useFotoNotePersonali.ts               (nuovo)

app/(app)/personale/note/index.tsx              (nuovo)
app/(app)/personale/note/[id].tsx               (nuovo)
app/(app)/personale/index.tsx                   (modificato: tile "Note" reale)
app/(app)/_layout.tsx                           (modificato: 2 nuove rotte)

package.json                                    (modificato: 2 nuove dipendenze)
```

---

### Task 1: Database — tabelle note_personali e foto_note_personali

**Files:**
- Create: `supabase/migrations/00000000000035_note_personali.sql`
- Modify: `src/types/database.types.ts` (a mano)

**Interfaces:**
- Produces: tabelle `note_personali` (`id`, `utente_id`, `titolo`,
  `contenuto`, `creato_il`, `aggiornato_il`) e `foto_note_personali`
  (`id`, `nota_id`, `percorso`, `creato_il`). Consumato da Task 3.

- [ ] **Step 1: Scrivere la migration**

```sql
create table public.note_personali (
  id uuid primary key default gen_random_uuid(),
  utente_id uuid not null references auth.users(id) on delete cascade,
  titolo text not null check (char_length(trim(titolo)) > 0),
  contenuto text not null default '',
  creato_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now()
);
create index idx_note_personali_utente on public.note_personali(utente_id);

create trigger trg_note_personali_aggiornato_il
before update on public.note_personali
for each row execute function public.set_aggiornato_il();

create table public.foto_note_personali (
  id uuid primary key default gen_random_uuid(),
  nota_id uuid not null references public.note_personali(id) on delete cascade,
  percorso text not null,
  creato_il timestamptz not null default now()
);
create index idx_foto_note_personali_nota on public.foto_note_personali(nota_id);

alter table public.note_personali enable row level security;
alter table public.foto_note_personali enable row level security;

create policy note_personali_tutti on public.note_personali for all
  using (utente_id = auth.uid())
  with check (utente_id = auth.uid());

create policy foto_note_personali_tutti on public.foto_note_personali for all
  using (
    exists (
      select 1 from public.note_personali n
      where n.id = nota_id and n.utente_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.note_personali n
      where n.id = nota_id and n.utente_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.note_personali to authenticated;
grant select, insert, update, delete on public.foto_note_personali to authenticated;

alter publication supabase_realtime add table public.note_personali, public.foto_note_personali;
```

`public.set_aggiornato_il()` esiste già (vedi
`00000000000001_schema_iniziale.sql`) — riusato, non riscritto.

- [ ] **Step 2: Aggiornare `src/types/database.types.ts` a mano**

Aggiungere i blocchi `note_personali` e `foto_note_personali` (`Row`/
`Insert`/`Update`) sotto `public.Tables`, stessa forma delle tabelle
`liste_personali`/`voci_lista_personali` già presenti nello stesso
file, con i campi esatti sopra.

- [ ] **Step 3: Verificare**

Run: `npx tsc --noEmit`
Expected: 0 errori (nessun test automatico per una migration — nessun
accesso Docker/DB locale in questo ambiente).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/00000000000035_note_personali.sql src/types/database.types.ts
git commit -m "feat: tabelle note_personali e foto_note_personali"
```

---

### Task 2: Database — bucket Storage per le foto delle note

**Files:**
- Create: `supabase/migrations/00000000000036_note_personali_storage.sql`

**Interfaces:**
- Consumes: tabella `note_personali` del Task 1 (solo per il commento
  di contesto, nessuna FK diretta da Storage).
- Produces: bucket `note-personali` + RLS su `storage.objects` per
  quel bucket. Consumato da Task 3.

- [ ] **Step 1: Scrivere la migration**

Stesso pattern di `00000000000021_carte_buoni_storage.sql` (leggerlo
per lo stile esatto dei commenti e della funzione
`e_membro_di_percorso` da cui questa si discosta solo nel confronto
finale: qui non c'è `e_membro_di`, c'è solo `auth.uid()` diretto, come
già fanno le tabelle `*_personali`):

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'note-personali', 'note-personali', false,
  10485760,
  array['image/jpeg', 'image/png', 'image/heic', 'image/webp']
)
on conflict (id) do nothing;

create or replace function public.e_proprietario_percorso(percorso text)
returns boolean
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_utente_id uuid;
begin
  begin
    v_utente_id := ((storage.foldername(percorso))[1])::uuid;
  exception when others then
    return false;
  end;
  return v_utente_id = auth.uid();
end;
$$;

create policy note_personali_storage_select on storage.objects for select
  using (bucket_id = 'note-personali' and e_proprietario_percorso(name));

create policy note_personali_storage_insert on storage.objects for insert
  with check (bucket_id = 'note-personali' and e_proprietario_percorso(name));

create policy note_personali_storage_delete on storage.objects for delete
  using (bucket_id = 'note-personali' and e_proprietario_percorso(name));
```

Percorso di ogni file: `<utente_id>/<nota_id>/<timestamp>.<estensione>`
(vedi Task 3, `aggiungiFotoNota`) — il primo segmento è sempre
`utente_id`, mai `nota_id`, perché la RLS sopra controlla solo quel
primo segmento.

Commento da includere nel file (stessa cura già data al bucket
`carte-buoni`): eliminare una nota (Task 1, `on delete cascade` su
`foto_note_personali`) rimuove le righe ma NON gli oggetti nel bucket
— nessun trigger/Edge Function di pulizia in questa fase. Limite noto:
oggetti orfani restano nel bucket privato, invisibili all'utente,
nessun impatto funzionale. Un upgrade futuro (fuori scope qui) userebbe
una Edge Function che ascolta la cancellazione della nota e chiama
`storage.remove()` sul prefisso `<utente_id>/<nota_id>/`.

- [ ] **Step 2: Verificare**

Run: `npx tsc --noEmit`
Expected: 0 errori (migration SQL, nessun impatto TypeScript diretto —
la verifica è che il comando resti pulito dopo il file precedente).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/00000000000036_note_personali_storage.sql
git commit -m "feat: bucket Storage privato per le foto delle note personali"
```

---

### Task 3: API — notePersonali.ts e fotoNotePersonali.ts

**Files:**
- Create: `src/api/notePersonali.ts`
- Create: `src/api/fotoNotePersonali.ts`

**Interfaces:**
- Consumes: tabelle e bucket dei Task 1-2.
- Produces:
  - `NotaPersonale` (= `Row` di `note_personali`),
    `listaNotePersonali(utenteId: string): Promise<NotaPersonale[]>`,
    `creaNotaPersonale(params: { utenteId: string; titolo: string }): Promise<NotaPersonale>`,
    `aggiornaNotaPersonale(params: { id: string; titolo?: string; contenuto?: string }): Promise<void>`,
    `eliminaNotaPersonale(id: string): Promise<void>`.
  - `FotoNotaPersonale = { id: string; percorso: string; url: string; creatoIl: string }`,
    `listaFotoNota(notaId: string): Promise<FotoNotaPersonale[]>`,
    `aggiungiFotoNota(params: { utenteId: string; notaId: string; uri: string }): Promise<void>`,
    `eliminaFotoNota(params: { id: string; percorso: string }): Promise<void>`.
  - Consumato da Task 4.

- [ ] **Step 1: `src/api/notePersonali.ts`**

Stesso pattern di `src/api/listePersonali.ts` (leggerlo), con due
differenze: l'elenco è ordinato per `aggiornato_il` decrescente (nota
modificata più di recente prima — convenzione standard di un'app di
note), e `aggiornaNotaPersonale` aggiorna solo i campi passati (stesso
pattern "solo i campi passati" già usato per `aggiornaVocePersonale`
nelle liste personali — leggere `vociListaPersonali.ts` per quel
pattern).

```ts
export type NotaPersonale = Database['public']['Tables']['note_personali']['Row'];

export async function listaNotePersonali(utenteId: string): Promise<NotaPersonale[]>
// .eq('utente_id', utenteId).order('aggiornato_il', { ascending: false })

export async function creaNotaPersonale(params: { utenteId: string; titolo: string }): Promise<NotaPersonale>
// insert({ utente_id, titolo }).select().single() — contenuto resta '' di default

export async function aggiornaNotaPersonale(params: { id: string; titolo?: string; contenuto?: string }): Promise<void>
// update(solo i campi definiti in params, escluso id).eq('id', params.id)

export async function eliminaNotaPersonale(id: string): Promise<void>
// delete().eq('id', id)
```

- [ ] **Step 2: `src/api/fotoNotePersonali.ts`**

```ts
export type FotoNotaPersonale = { id: string; percorso: string; url: string; creatoIl: string };

export async function listaFotoNota(notaId: string): Promise<FotoNotaPersonale[]>

export async function aggiungiFotoNota(params: { utenteId: string; notaId: string; uri: string }): Promise<void>

export async function eliminaFotoNota(params: { id: string; percorso: string }): Promise<void>
```

`listaFotoNota`: legge le righe di `foto_note_personali` per
`nota_id`, poi genera gli URL firmati in un'unica chiamata batch:
`supabase.storage.from('note-personali').createSignedUrls(percorsi, 3600)`
(mai una chiamata per foto — stesso principio "codice deterministico,
nessun giro di rete evitabile" del resto del progetto). Se non ci sono
righe, ritorna `[]` senza chiamare Storage.

`aggiungiFotoNota`: costruisce `percorso = \`${utenteId}/${notaId}/${Date.now()}.${estensione}\``
(estensione presa dall'ultimo segmento di `uri` dopo il punto, `'jpg'`
come default se assente), legge `uri` con `fetch(uri)` e `.blob()`
(API standard React Native, nessuna dipendenza in più), carica con
`supabase.storage.from('note-personali').upload(percorso, blob, { contentType: blob.type })`,
poi — solo se l'upload riesce — inserisce la riga in
`foto_note_personali`. Se l'insert della riga fallisce dopo un upload
riuscito, il file resta orfano nel bucket: stesso limite noto già
documentato nel Task 2, non previene l'operazione.

`eliminaFotoNota`: prima `supabase.storage.from('note-personali').remove([percorso])`,
poi la riga — in quest'ordine, mai l'opposto, così una riga non punta
mai a un file già rimosso durante un errore a metà.

- [ ] **Step 3: Verificare**

Run: `npx tsc --noEmit`
Expected: 0 errori

- [ ] **Step 4: Commit**

```bash
git add src/api/notePersonali.ts src/api/fotoNotePersonali.ts
git commit -m "feat: API note personali e foto allegate"
```

---

### Task 4: Hook — useNotePersonali e useFotoNotePersonali

**Files:**
- Create: `src/hooks/useNotePersonali.ts`
- Create: `src/hooks/useFotoNotePersonali.ts`

**Interfaces:**
- Consumes: Task 3.
- Produces:
  - `useNotePersonali(utenteId: string | null)` → `{ note, isLoading,
    error, crea, aggiorna, elimina }`.
  - `useFotoNotePersonali(notaId: string | null, utenteId: string | null)` → `{ foto,
    isLoading, error, aggiungi, elimina }`.
  - Consumato da Task 5.

- [ ] **Step 1: `useNotePersonali.ts`**

Stesso pattern esatto di `src/hooks/useListePersonali.ts` (leggerlo):
chiave `['note-personali', utenteId]`, canale realtime
`note_personali` filtrato per `utente_id=eq.${utenteId}`, mutation
`crea` (→ `creaNotaPersonale`), `aggiorna` (→ `aggiornaNotaPersonale`,
parametro `{ id, titolo?, contenuto? }`), `elimina` (→
`eliminaNotaPersonale`).

- [ ] **Step 2: `useFotoNotePersonali.ts`**

Stesso pattern esatto di `src/hooks/useVociListaPersonali.ts`: chiave
`['foto-nota-personale', notaId]`, canale realtime
`foto_note_personali` filtrato per `nota_id=eq.${notaId}`. Mutation
`aggiungi`: prende una `uri: string` e chiama `aggiungiFotoNota({
utenteId: utenteId as string, notaId: notaId as string, uri })`.
Mutation `elimina`: prende una `FotoNotaPersonale` e chiama
`eliminaFotoNota({ id: foto.id, percorso: foto.percorso })`. Entrambe
disabilitate (query `enabled`) quando `notaId === null`.

- [ ] **Step 3: Verificare**

Run: `npx tsc --noEmit`
Expected: 0 errori

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useNotePersonali.ts src/hooks/useFotoNotePersonali.ts
git commit -m "feat: hook note personali e foto allegate"
```

---

### Task 5: UI — schermate note, foto allegate, collegamento da Personale

**Files:**
- Create: `app/(app)/personale/note/index.tsx`
- Create: `app/(app)/personale/note/[id].tsx`
- Modify: `app/(app)/personale/index.tsx`
- Modify: `app/(app)/_layout.tsx`
- Modify: `package.json` (via comandi di installazione, non a mano)

**Interfaces:**
- Consumes: hook del Task 4, `useAuthStore` per `utenteId` (stesso
  pattern di `personale/liste/index.tsx` — nessun redirect/guard legato
  a un gruppo).
- Produces: rotte `/personale/note` e `/personale/note/[id]`.

- [ ] **Step 1: Installare le dipendenze**

```bash
npx expo install expo-image-picker
npm install react-native-markdown-display
```

- [ ] **Step 2: Registrare le rotte**

In `_layout.tsx`, vicino a `personale/liste/[id]`:
```tsx
<Stack.Screen name="personale/note/index" options={{ title: 'Le mie note' }} />
<Stack.Screen name="personale/note/[id]" options={{ title: 'Nota' }} />
```

- [ ] **Step 3: `app/(app)/personale/note/index.tsx`**

Stesso comportamento di `app/(app)/personale/liste/index.tsx` (leggerlo
per la logica, non per il dominio): `utenteId` da `useAuthStore`,
`useNotePersonali(utenteId)`, form di creazione in una `GlassCard`
(campo "titolo" + `BentoButton` "Crea nota", disabilitato se
`titolo.trim() === ''` — Review Focus, guard lato client), elenco con
una `GlassCard` per nota (`titolo` + un'anteprima del `contenuto` su
massimo 2 righe con `numberOfLines={2}` — testo grezzo, non reso come
markdown, qui serve solo un'anteprima) + bottone testuale "Elimina" con
`confermaAzione` prima di `elimina.mutate`, stato vuoto come testo
centrato. Al tap su una nota: `router.push({ pathname:
'/personale/note/[id]', params: { id: nota.id, titolo: nota.titolo } })`.

- [ ] **Step 4: `app/(app)/personale/note/[id].tsx`**

`const { id, titolo: titoloIniziale } = useLocalSearchParams<{ id: string; titolo?: string }>()`,
titolo dello `Stack.Screen` da `titoloIniziale` (stesso pattern di
`personale/liste/[id].tsx`). Stato locale: `titolo` (inizializzato da
`titoloIniziale ?? ''`), `contenuto` (inizializzato UNA SOLA VOLTA da `nota.contenuto` non appena
la query di `useNotePersonali` restituisce la nota corrispondente — la
nota singola si ottiene filtrando l'array `note` per `id`, non serve un
hook separato per-nota; un `useEffect` con guardia, es. un flag
`inizializzato`, evita che un refetch successivo sovrascriva il testo
che l'utente sta scrivendo), `modalitaAnteprima: boolean` (default
`false`).

- Un `TextInput` multilinea per `contenuto` quando
  `modalitaAnteprima === false`; un componente `Markdown` (da
  `react-native-markdown-display`, import default) con `{contenuto}`
  come children quando `modalitaAnteprima === true` — passare uno
  `style` minimo che usa i colori di `tokens.ts` già in uso nel resto
  della schermata (es. `body: { color: bento.testoPrimario }`).
- Un `Pressable`/testo per alternare `modalitaAnteprima` (es.
  "Anteprima" quando `false`, "Modifica" quando `true`).
- Un `TextInput` a riga singola per `titolo`, sopra al contenuto.
- Un `BentoButton` "Salva" che chiama
  `aggiorna.mutate({ id, titolo, contenuto })`, disabilitato se
  `titolo.trim() === ''` o `aggiorna.isPending`.
- Una riga orizzontale (`ScrollView horizontal`) con una miniatura
  `Image` (`source={{ uri: foto.url }}`) per ogni elemento di
  `useFotoNotePersonali(id, utenteId).foto`, ciascuna con un piccolo
  bottone "Elimina" che apre `confermaAzione` e poi `elimina.mutate(foto)`;
  in coda, una tile "+" che:
  1. richiede il permesso con
     `ImagePicker.requestMediaLibraryPermissionsAsync()` (se non
     concesso, interrompe senza avviare il picker);
  2. apre `ImagePicker.launchImageLibraryAsync({ mediaTypes: ...Images, quality: 0.7 })`;
  3. usa l'API corrente del risultato (`result.canceled`,
     `result.assets[0].uri`) — se `canceled`, non fa nulla;
  4. altrimenti chiama `aggiungi.mutate(result.assets[0].uri)`.
  La tile "+" è disabilitata mentre `aggiungi.isPending === true`
  (Review Focus: nessun doppio upload da doppio tap).
- Un bottone testuale "Elimina nota" in fondo, con `confermaAzione`,
  poi `elimina.mutate(id)` (dalla mutation note, non foto) seguito da
  `router.back()`.
- Mostrare `aggiungi.error`/`aggiorna.error` (se presenti) come testo
  visibile nella schermata, non silenziati (Review Focus).

- [ ] **Step 5: `app/(app)/personale/index.tsx`**

Sostituire la `GlassTile` "Note" (oggi `badge="Presto"`, nessun
`onPress`) con una reale: `onPress={() => router.push('/personale/note')}`,
nessun `badge`. Lasciare inalterata la tile "Calendario" (Fase 3, non
questo piano).

- [ ] **Step 6: Verificare**

Run: `npx tsc --noEmit`
Expected: 0 errori

Run: `npm run lint`
Expected: pulito

- [ ] **Step 7: Verificare manualmente**

Run: `npm start`
Expected: `/personale` → tile "Note" (non più "Presto") → crea una
nota, apri, scrivi testo con `**grassetto**`/`- voce`, passa ad
"Anteprima" e verifica che sia renderizzato, torna a "Modifica",
salva, aggiungi una foto dalla libreria, verificala in miniatura,
eliminala, elimina la nota. Nessun redirect legato al gruppo attivo in
nessun momento.

- [ ] **Step 8: Commit**

```bash
git add "app/(app)/personale" "app/(app)/_layout.tsx" package.json package-lock.json
git commit -m "feat: schermate note personali con markdown leggero e foto allegate"
```

---

## Self-Review

**Copertura dello spec:** la Fase 2 (Note personali) della Spec è
interamente coperta: tabella separata scoped per utente (Task 1),
bucket Storage privato con RLS su percorso (Task 2), API/hook che
rispecchiano il pattern già stabilito per le liste personali (Task
3-4), UI con editing in sintassi markdown leggera + anteprima + foto
allegate (Task 5). La decisione "non bloccante per la Fase 1" sulla
libreria markdown (`react-native-markdown-display`) è qui confermata,
non ridiscussa. Le Fasi 3-4 (Calendario unificato, già fatta la nuova
Home) restano fuori da questo piano.

**Proporzione:** i blocchi di codice completi sono lo schema SQL (Task
1-2, dato pinnato, con RLS copiata per analogia diretta da un bucket
già esistente nel progetto) e le firme esatte delle funzioni API (Task
3); il resto — logica di hook, struttura UI — è descritto per
comportamento/pattern da rispecchiare da file gemelli già nel
codebase, coerente con la Fase 1 di questo stesso mondo "Personale".
