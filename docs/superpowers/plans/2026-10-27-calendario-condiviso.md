# Calendario condiviso Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere ai gruppi una sezione Calendario condivisa (griglia
mensile) dove qualsiasi membro crea impegni/scadenze, singoli o
ricorrenti, con promemoria push configurabile e permesso di modifica
deciso alla creazione.

**Architecture:** Stesso schema a livelli già usato nei moduli
Faccende/Sfide: calcolo puro e testato in `src/calcolo/` (ricorrenza,
griglia mensile), API typed su Supabase con RLS come unico controllo di
permesso (nessuna RPC: qui non serve atomicità multi-tabella, è CRUD
diretto), hook React Query + Realtime per la UI, e in più — novità per
questo modulo — una Edge Function schedulata (`pg_cron`) perché i
promemoria devono scattare anche senza che nessuno apra l'app. La
generazione delle occorrenze avviene in **due punti che condividono lo
stesso calcolo puro**: lato client, subito dopo aver creato/modificato un
impegno (così l'utente lo vede comparire sulla griglia senza aspettare);
e lato server nella Edge Function schedulata, come rete di sicurezza che
estende la finestra generata anche se nessuno apre più l'app.

**Tech Stack:** React Native + Expo Router, TypeScript, Supabase
(Postgres + RLS + Realtime + `pg_cron` + Edge Functions), TanStack React
Query, Jest. Nessuna libreria nuova (la griglia mensile si costruisce con
i componenti RN esistenti).

**Spec:** `docs/superpowers/specs/2026-10-27-calendario-condiviso-design.md`
(questo piano assume quel documento letto per intero: schema, RLS,
permessi, scelte sul fuso orario e sull'istante degli impegni "tutto il
giorno" vivono lì; qui solo l'interfaccia esatta di ogni file e cosa
testare — con alcune semplificazioni rispetto allo schizzo di schema del
design doc, segnalate sotto dove rilevante).

## Global Constraints

- Non toccare nessuna migration esistente (`00000000000001` ...
  `00000000000028`), né `src/calcolo/saldi.ts`, `divisioni.ts`, `tipi.ts`,
  `puntiFaccende.ts`. Unica modifica a codice esistente: esportare
  `dataLocaleInUtc` da `src/calcolo/ricorrenzaFaccende.ts` (Task 1) —
  nessun'altra riga di quel file cambia, e tutti i test esistenti di
  quel file devono continuare a passare inalterati.
- Nessuna nuova dipendenza: la griglia mensile è un layout a 7 colonne
  costruito con `View`/`Pressable` e i token del tema Bento già
  esistenti (`bento`, `accenti`, `spaziatura`, `tipografia`).
- Fuso orario: sempre quello di `impostazioni_faccende.fuso_orario` per
  il gruppo; se quella riga non esiste (modulo Faccende non attivato),
  default `'Europe/Rome'` — il calendario non dipende dall'attivazione
  del modulo Faccende.
- RLS come unico meccanismo di permesso, nessuna RPC: tutte le operazioni
  su `impegni`/`occorrenze_impegni` sono insert/update/delete diretti
  protetti da policy (vedi Task 2), coerente con "nessun ruolo admin" già
  stabilito per Faccende/Lista spesa.
- Niente Postgres locale disponibile in questo progetto (stesso limite
  già incontrato nei moduli Faccende/Sfide): ogni task di migration
  finisce con una "verifica statica" (rilettura + confronto con lo
  schema), non con `supabase db push`. L'applicazione al progetto
  Supabase reale, e il deploy della Edge Function, richiedono
  autorizzazione esplicita in chat — fuori da questo piano.
- Semplificazione rispetto allo schizzo del design doc: niente colonna
  `parametri_ricorrenza` (jsonb) su `impegni`. A differenza di una
  faccenda (dove il "giorno preferito" è solo indicativo, il periodo
  reale è la settimana/mese intero), un impegno è un singolo istante: il
  giorno della settimana o del mese su cui si ripete è già determinato da
  `data_inizio`, non serve un parametro separato. Non cambia nulla di
  visibile per l'utente, solo meno colonne.
- Niente punti, sforzo, durata stimata, assegnazione a un membro
  specifico, stato di completamento sulle occorrenze: tutto fuori scope
  per esplicito non-goal del design doc.
- Branch `feature/calendario-condiviso`, creato da `feature/faccende-casa`
  (branch corrente); mai merge né push diretto su `main`.
- Testi dell'interfaccia in italiano (CLAUDE.md).

## Review Focus

- Impegno ricorrente mensile con `data_inizio` il 31 (es. 31 gennaio): a
  febbraio deve produrre il 28 (o 29 bisestile), non saltare il mese né
  sforare a marzo (Task 1).
- `promemoria_minuti_prima = 0` ("avvisa esattamente all'ora
  dell'impegno") non deve essere trattato come "nessun promemoria" (che è
  `null`) — un controllo tipo `if (promemoria)` scambierebbe 0 per falsy
  (Task 5, Task 8, Task 11).
- Creare/modificare lo stesso impegno ricorrente da due dispositivi (o
  due tap rapidi) non deve generare occorrenze duplicate per lo stesso
  istante — garantito da `unique(impegno_id, data_ora)` + upsert
  `ignoreDuplicates`, verificato a livello di calcolo puro (stesso input
  due volte → stesso risultato, nessun side effect) (Task 1, Task 5).
- Un impegno "modificabile solo da chi l'ha creato" il cui creatore è
  uscito dal gruppo non deve restare bloccato per sempre: la policy deve
  renderlo di nuovo modificabile da chiunque nel gruppo (Task 2,
  verificabile solo a revisione statica della migration).
- La Edge Function schedulata, girando ogni 15 minuti, non deve rimandare
  due volte il promemoria della stessa occorrenza anche se la finestra di
  invio (promemoria più breve del periodo fra due esecuzioni) viene
  attraversata da più tick del cron — garantito dall'`evento_idempotenza`
  univoco su `notifiche` (Task 3, Task 11).

---

## File Structure

```
src/calcolo/
  ricorrenzaFaccende.ts        (modificato: esporta dataLocaleInUtc)
  ricorrenzaImpegni.ts          (nuovo, puro)
  ricorrenzaImpegni.test.ts
  griglioMensile.ts             (nuovo, puro)
  griglioMensile.test.ts

supabase/migrations/
  00000000000029_impegni.sql               (nuovo: tabelle, RLS, grant, realtime)
  00000000000030_impegni_notifiche.sql     (nuovo: estende notifiche + trigger push)
  00000000000031_impegni_promemoria_cron.sql (nuovo: pg_cron)

supabase/functions/
  genera-promemoria-impegni/index.ts        (nuovo)

src/types/database.types.ts    (modificato: tabelle impegni/occorrenze_impegni, notifiche.impegno_id)

src/api/
  impegni.ts                    (nuovo)

src/hooks/
  useImpegni.ts                  (nuovo)

src/components/
  CalendarioGriglia.tsx          (nuovo)
  ModificaImpegno.tsx             (nuovo)

app/(app)/
  _layout.tsx                    (modificato: nuova rotta)
  dashboard.tsx                   (modificato: nuova GlassTile)
  calendario/index.tsx             (nuovo)
```

---

### Task 1: Calcolo — ricorrenza degli impegni

**Files:**
- Modify: `src/calcolo/ricorrenzaFaccende.ts` (esportare `dataLocaleInUtc`)
- Create: `src/calcolo/ricorrenzaImpegni.ts`
- Test: `src/calcolo/ricorrenzaImpegni.test.ts`

**Interfaces:**
- Consumes: `Frequenza`, `dataLocaleInUtc`, `dataLocaleISO`,
  `aggiungiGiorni`, `MAX_PERIODI_PER_SINCRONIZZAZIONE` da
  `ricorrenzaFaccende.ts`.
- Produces:
  - `aggiungiMesiStessoGiorno(dataISO: string, mesi: number): string`
  - `istanteImpegno(dataISO: string, oraHHmm: string | null, fusoOrario: string): string`
  - `interface DefinizioneRicorrenzaImpegno { frequenza: Frequenza; intervalloRicorrenza: number | null; dataInizio: string; ora: string | null }`
  - `interface OccorrenzaImpegnoCalcolata { dataISO: string; istanteISO: string }`
  - `calcolaOccorrenzeMancantiImpegno(definizione: DefinizioneRicorrenzaImpegno, ultimaDataGenerata: string | null, orizzonteISO: string, fusoOrario: string): OccorrenzaImpegnoCalcolata[]`

- [ ] **Step 1: Esportare `dataLocaleInUtc` da `ricorrenzaFaccende.ts`**

Aggiungere `export` davanti a `function dataLocaleInUtc(...)`. Nessun'altra
modifica al file.

- [ ] **Step 2: Verificare che i test esistenti passino ancora**

Run: `npx jest ricorrenzaFaccende.test.ts`
Expected: PASS, stesso numero di test di prima.

- [ ] **Step 3: Scrivere i test di `aggiungiMesiStessoGiorno`**

```ts
import { aggiungiMesiStessoGiorno } from './ricorrenzaImpegni';

describe('aggiungiMesiStessoGiorno', () => {
  it('somma un mese mantenendo lo stesso giorno', () => {
    expect(aggiungiMesiStessoGiorno('2026-03-15', 1)).toBe('2026-04-15');
  });

  it('clampa al 28 quando il giorno 31 cade in febbraio (anno non bisestile)', () => {
    expect(aggiungiMesiStessoGiorno('2027-01-31', 1)).toBe('2027-02-28');
  });

  it('clampa al 29 quando il giorno 31 cade in febbraio bisestile', () => {
    expect(aggiungiMesiStessoGiorno('2028-01-31', 1)).toBe('2028-02-29');
  });

  it('torna al 31 quando il mese successivo è di nuovo lungo', () => {
    expect(aggiungiMesiStessoGiorno('2026-01-31', 2)).toBe('2026-03-31');
  });
});
```

- [ ] **Step 4: Eseguire e verificare che fallisca**

Run: `npx jest ricorrenzaImpegni.test.ts`
Expected: FAIL con "Cannot find module './ricorrenzaImpegni'"

- [ ] **Step 5: Implementare `aggiungiMesiStessoGiorno`**

Stesso stile di `aggiungiMesi` già in `ricorrenzaFaccende.ts`: calcolare
l'ultimo giorno del mese di destinazione e usare `Math.min(giornoOriginale,
ultimoGiornoDestinazione)`.

- [ ] **Step 6: Eseguire e verificare che passi**

Run: `npx jest ricorrenzaImpegni.test.ts -t aggiungiMesiStessoGiorno`
Expected: PASS

- [ ] **Step 7: Scrivere i test di `istanteImpegno`**

```ts
import { istanteImpegno } from './ricorrenzaImpegni';

describe('istanteImpegno', () => {
  it('con ora nulla restituisce la mezzanotte locale del fuso orario', () => {
    const istante = istanteImpegno('2026-06-15', null, 'Europe/Rome');
    // 2026-06-15 00:00 CEST (UTC+2) = 2026-06-14T22:00:00.000Z
    expect(istante).toBe('2026-06-14T22:00:00.000Z');
  });

  it('con ora impostata restituisce quell\'istante locale esatto', () => {
    const istante = istanteImpegno('2026-06-15', '14:30', 'Europe/Rome');
    expect(istante).toBe('2026-06-15T12:30:00.000Z');
  });
});
```

- [ ] **Step 8: Eseguire e verificare che fallisca, poi implementare**

`istanteImpegno` chiama `dataLocaleInUtc(anno, mese, giorno, ora, minuto, 0, fusoOrario)`
con `ora = 0, minuto = 0` se `oraHHmm === null`, altrimenti i componenti
parsati da `oraHHmm.split(':')`. Restituisce `.toISOString()`.

- [ ] **Step 9: Eseguire e verificare che passi**

Run: `npx jest ricorrenzaImpegni.test.ts -t istanteImpegno`
Expected: PASS

- [ ] **Step 10: Scrivere i test di `calcolaOccorrenzeMancantiImpegno`**

```ts
import { calcolaOccorrenzeMancantiImpegno } from './ricorrenzaImpegni';

const FUSO = 'Europe/Rome';

describe('calcolaOccorrenzeMancantiImpegno', () => {
  it('una_tantum genera una sola occorrenza alla data di inizio', () => {
    const def = { frequenza: 'una_tantum' as const, intervalloRicorrenza: null, dataInizio: '2026-11-15', ora: null };
    const risultato = calcolaOccorrenzeMancantiImpegno(def, null, '2026-12-31', FUSO);
    expect(risultato.map((r) => r.dataISO)).toEqual(['2026-11-15']);
  });

  it('una_tantum non genera nulla se già generata', () => {
    const def = { frequenza: 'una_tantum' as const, intervalloRicorrenza: null, dataInizio: '2026-11-15', ora: null };
    expect(calcolaOccorrenzeMancantiImpegno(def, '2026-11-15', '2026-12-31', FUSO)).toEqual([]);
  });

  it('settimanale genera ogni 7 giorni a partire dalla data di inizio, non dalla settimana contenente', () => {
    const def = { frequenza: 'settimanale' as const, intervalloRicorrenza: null, dataInizio: '2026-11-04', ora: null }; // un mercoledì
    const risultato = calcolaOccorrenzeMancantiImpegno(def, null, '2026-11-25', FUSO);
    expect(risultato.map((r) => r.dataISO)).toEqual(['2026-11-04', '2026-11-11', '2026-11-18', '2026-11-25']);
  });

  it('mensile mantiene il giorno del mese e clampa nei mesi corti', () => {
    const def = { frequenza: 'mensile' as const, intervalloRicorrenza: null, dataInizio: '2026-12-31', ora: null };
    const risultato = calcolaOccorrenzeMancantiImpegno(def, null, '2027-03-01', FUSO);
    expect(risultato.map((r) => r.dataISO)).toEqual(['2026-12-31', '2027-01-31', '2027-02-28']);
  });

  it('personalizzata rispetta intervalloRicorrenza in giorni', () => {
    const def = { frequenza: 'personalizzata' as const, intervalloRicorrenza: 10, dataInizio: '2026-11-01', ora: null };
    const risultato = calcolaOccorrenzeMancantiImpegno(def, null, '2026-11-25', FUSO);
    expect(risultato.map((r) => r.dataISO)).toEqual(['2026-11-01', '2026-11-11', '2026-11-21']);
  });

  it('chiamare due volte con lo stesso ultimaDataGenerata produce lo stesso risultato (idempotenza del calcolo)', () => {
    const def = { frequenza: 'giornaliera' as const, intervalloRicorrenza: null, dataInizio: '2026-11-01', ora: null };
    const a = calcolaOccorrenzeMancantiImpegno(def, '2026-11-05', '2026-11-10', FUSO);
    const b = calcolaOccorrenzeMancantiImpegno(def, '2026-11-05', '2026-11-10', FUSO);
    expect(a).toEqual(b);
  });

  it('rispetta il tetto MAX_PERIODI_PER_SINCRONIZZAZIONE', () => {
    const def = { frequenza: 'giornaliera' as const, intervalloRicorrenza: null, dataInizio: '2020-01-01', ora: null };
    const risultato = calcolaOccorrenzeMancantiImpegno(def, null, '2026-12-31', FUSO);
    expect(risultato.length).toBeLessThanOrEqual(60);
  });

  it('ogni occorrenza porta anche l\'istante calcolato con istanteImpegno', () => {
    const def = { frequenza: 'una_tantum' as const, intervalloRicorrenza: null, dataInizio: '2026-11-15', ora: '09:00' };
    const [occorrenza] = calcolaOccorrenzeMancantiImpegno(def, null, '2026-12-31', FUSO);
    expect(occorrenza.istanteISO).toBe('2026-11-15T08:00:00.000Z');
  });
});
```

- [ ] **Step 11: Eseguire e verificare che falliscano**

Run: `npx jest ricorrenzaImpegni.test.ts -t calcolaOccorrenzeMancantiImpegno`
Expected: FAIL (funzione non definita)

- [ ] **Step 12: Implementare `calcolaOccorrenzeMancantiImpegno`**

Per `frequenza`:
- `'una_tantum'`: se `ultimaDataGenerata !== null` → `[]`; altrimenti
  `[{dataISO: dataInizio, ...}]` se `dataInizio <= orizzonteISO`, altrimenti `[]`.
- `'giornaliera'` / `'personalizzata'`: passo = 1 o
  `Math.max(1, intervalloRicorrenza ?? 1)`; cursore iniziale =
  `ultimaDataGenerata !== null ? aggiungiGiorni(ultimaDataGenerata, passo) : dataInizio`;
  avanzare con `aggiungiGiorni(cursore, passo)` finché `cursore <=
  orizzonteISO`, con lo stesso tetto `MAX_PERIODI_PER_SINCRONIZZAZIONE`
  importato da `ricorrenzaFaccende.ts`.
- `'settimanale'`: stesso schema con passo 7 giorni, cursore ancorato a
  `dataInizio` (mai a `inizioSettimanaISO`).
- `'mensile'`: cursore iniziale = `ultimaDataGenerata !== null ?
  aggiungiMesiStessoGiorno(ultimaDataGenerata, 1) : dataInizio`; avanzare
  con `aggiungiMesiStessoGiorno(cursore, 1)`.

Per ogni data risultante, calcolare `istanteISO = istanteImpegno(dataISO,
ora, fusoOrario)`.

- [ ] **Step 13: Eseguire e verificare che tutti i test del file passino**

Run: `npx jest ricorrenzaImpegni.test.ts`
Expected: PASS, tutti i test verdi

- [ ] **Step 14: Commit**

```bash
git add src/calcolo/ricorrenzaFaccende.ts src/calcolo/ricorrenzaImpegni.ts src/calcolo/ricorrenzaImpegni.test.ts
git commit -m "feat: motore di ricorrenza puro per gli impegni di calendario"
```

---

### Task 2: Migration — schema `impegni` e `occorrenze_impegni`

**Files:**
- Create: `supabase/migrations/00000000000029_impegni.sql`

**Interfaces:**
- Consumes: `e_membro_di(p_gruppo_id uuid)` (da `00000000000008`),
  `set_aggiornato_il()` (da `00000000000001`).
- Produces: tabelle `public.impegni`, `public.occorrenze_impegni`.

- [ ] **Step 1: Scrivere la migration**

```sql
create table public.impegni (
  id uuid primary key default gen_random_uuid(),
  gruppo_id uuid not null references public.gruppi (id) on delete cascade,
  titolo text not null check (char_length(trim(titolo)) > 0),
  descrizione text,
  data_inizio date not null,
  ora time,
  frequenza text not null
    check (frequenza in ('giornaliera', 'settimanale', 'mensile', 'personalizzata', 'una_tantum')),
  intervallo_ricorrenza integer check (intervallo_ricorrenza is null or intervallo_ricorrenza > 0),
  promemoria_minuti_prima integer check (promemoria_minuti_prima is null or promemoria_minuti_prima >= 0),
  modificabile_da_tutti boolean not null default true,
  creato_da uuid references public.membri (id) on delete set null,
  attiva boolean not null default true,
  creato_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now()
);
create index idx_impegni_gruppo_attiva on public.impegni (gruppo_id) where attiva;

create trigger trg_impegni_aggiornato_il
before update on public.impegni
for each row execute function public.set_aggiornato_il();

create table public.occorrenze_impegni (
  id uuid primary key default gen_random_uuid(),
  impegno_id uuid not null references public.impegni (id) on delete cascade,
  gruppo_id uuid not null references public.gruppi (id) on delete cascade,
  data_ora timestamptz not null,
  creato_il timestamptz not null default now(),
  unique (impegno_id, data_ora)
);
create index idx_occorrenze_impegni_gruppo_data on public.occorrenze_impegni (gruppo_id, data_ora);
create index idx_occorrenze_impegni_impegno on public.occorrenze_impegni (impegno_id);

alter table public.impegni enable row level security;
alter table public.occorrenze_impegni enable row level security;

create policy impegni_select on public.impegni for select
  using (e_membro_di(gruppo_id));
create policy impegni_insert on public.impegni for insert
  with check (e_membro_di(gruppo_id));

-- Modificabile/cancellabile da chiunque nel gruppo SE modificabile_da_tutti,
-- oppure se chi l'ha creato non è (più) un membro attivo del gruppo (evita
-- un impegno bloccato per sempre quando il creatore esce), oppure da chi
-- l'ha creato.
create policy impegni_update on public.impegni for update
  using (
    e_membro_di(gruppo_id)
    and (
      modificabile_da_tutti
      or creato_da is null
      or not exists (select 1 from public.membri m where m.id = impegni.creato_da and m.uscito_il is null)
      or creato_da = (select id from public.membri where utente_id = auth.uid() and gruppo_id = impegni.gruppo_id and uscito_il is null)
    )
  )
  with check (e_membro_di(gruppo_id));
create policy impegni_delete on public.impegni for delete
  using (
    e_membro_di(gruppo_id)
    and (
      modificabile_da_tutti
      or creato_da is null
      or not exists (select 1 from public.membri m where m.id = impegni.creato_da and m.uscito_il is null)
      or creato_da = (select id from public.membri where utente_id = auth.uid() and gruppo_id = impegni.gruppo_id and uscito_il is null)
    )
  );

-- OCCORRENZE_IMPEGNI: generate lato client/Edge Function, mai modificate
-- dopo l'inserimento (niente stato da aggiornare) - nessuna policy di
-- update/delete, stesso principio di occorrenze_faccende/storico_faccende.
create policy occorrenze_impegni_select on public.occorrenze_impegni for select
  using (e_membro_di(gruppo_id));
create policy occorrenze_impegni_insert on public.occorrenze_impegni for insert
  with check (e_membro_di(gruppo_id));

grant select, insert, update, delete on public.impegni to authenticated;
grant select, insert on public.occorrenze_impegni to authenticated;

alter publication supabase_realtime add table public.impegni, public.occorrenze_impegni;
```

- [ ] **Step 2: Verifica statica**

Nessuna istanza Postgres locale disponibile in questo progetto (stesso
limite dei moduli Faccende/Sfide): rileggere il file per intero
confrontandolo con lo schema di
`docs/superpowers/specs/2026-10-27-calendario-condiviso-design.md` e con
le convenzioni delle migration esistenti (`00000000000013_faccende.sql`
per lo stile, `00000000000008_uscita_gruppo.sql` per `e_membro_di`).
Verificare in particolare che la condizione di `impegni_update`/
`impegni_delete` coincida esattamente in entrambe le policy. Non
eseguire `supabase db push`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/00000000000029_impegni.sql
git commit -m "feat: schema, RLS e realtime per il modulo Calendario"
```

---

### Task 3: Migration — promemoria in `notifiche` + pipeline push

**Files:**
- Create: `supabase/migrations/00000000000030_impegni_notifiche.sql`
- Modify: `supabase/functions/invia-push-notifica/index.ts`

**Interfaces:**
- Consumes: tabella `notifiche` (da `00000000000015`), funzione
  `_invia_notifica_push()` (da `00000000000028`), tabella `impegni`
  (Task 2).
- Produces: colonna `notifiche.impegno_id`, valore `'impegno_promemoria'`
  in `notifiche.tipo`, branch `impegno_id` nel payload/URL della Edge
  Function.

- [ ] **Step 1: Scrivere la migration**

```sql
alter table public.notifiche add column impegno_id uuid references public.impegni (id) on delete cascade;

alter table public.notifiche drop constraint notifiche_tipo_check;
alter table public.notifiche add constraint notifiche_tipo_check check (tipo in (
  'sfida_invito', 'sfida_promemoria', 'sfida_tutti_votato',
  'sfida_spareggio', 'sfida_vincitore', 'sfida_senza_accordo', 'sfida_scaduta',
  'impegno_promemoria'
));

create or replace function public._invia_notifica_push()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_utente_id uuid;
  v_silenziate boolean;
begin
  select utente_id, notifiche_silenziate into v_utente_id, v_silenziate
  from public.membri where id = new.destinatario_membro_id;

  if v_utente_id is null or v_silenziate then
    return new;
  end if;

  perform net.http_post(
    url := 'https://iajucwiivgjguyowywwb.supabase.co/functions/v1/invia-push-notifica',
    body := jsonb_build_object(
      'notifica_id', new.id,
      'utente_id', v_utente_id,
      'titolo', new.titolo,
      'corpo', new.corpo,
      'sfida_id', new.sfida_id,
      'impegno_id', new.impegno_id
    ),
    headers := jsonb_build_object('Content-Type', 'application/json')
  );
  return new;
end;
$$;
```

- [ ] **Step 2: Modificare `invia-push-notifica/index.ts`**

Aggiungere `impegno_id: string | null` all'interfaccia `Payload`; la
`urlDestinazione` diventa:

```ts
const urlDestinazione =
  payload.impegno_id !== null
    ? '/calendario'
    : payload.sfida_id !== null
      ? `/sfide/${payload.sfida_id}`
      : '/notifiche';
```

- [ ] **Step 3: Verifica statica**

Rileggere entrambi i file confrontandoli con `00000000000028_push_notifiche_per_utente.sql`
(stessa struttura del trigger) e con il design doc (sezione "Promemoria
push"). Nessun framework di test per le Edge Function in questo progetto
oggi: verifica a vista, non automatica. Non eseguire `supabase db push`
né `supabase functions deploy`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/00000000000030_impegni_notifiche.sql supabase/functions/invia-push-notifica/index.ts
git commit -m "feat: promemoria impegni nella pipeline notifiche push"
```

---

### Task 4: Tipi database

**Files:**
- Modify: `src/types/database.types.ts`

**Interfaces:**
- Consumes: schema esatto di Task 2/3.
- Produces: `Database['public']['Tables']['impegni'|'occorrenze_impegni']`,
  `notifiche.Row/Insert/Update.impegno_id`.

- [ ] **Step 1: Aggiungere le tabelle `impegni` e `occorrenze_impegni`**

Stesso stile già usato per Faccende in questo file (campi alfabetici
dentro `Row`/`Insert`/`Update`, blocco `Relationships` con una entry per
foreign key, tabelle in ordine alfabetico fra quelle esistenti). Nessun
campo `parametri_ricorrenza` (vedi Global Constraints).

- [ ] **Step 2: Aggiungere `impegno_id` a `notifiche`**

Stesso trattamento già riservato a `sfida_id` in quella tabella (nullable
in `Row`/`Insert`/`Update`, nuova entry in `Relationships` verso
`impegni`).

- [ ] **Step 3: Verificare**

Run: `npx tsc --noEmit`
Expected: 0 errori

- [ ] **Step 4: Commit**

```bash
git add src/types/database.types.ts
git commit -m "feat: tipi database per il modulo Calendario"
```

---

### Task 5: API — impegni e generazione occorrenze

**Files:**
- Create: `src/api/impegni.ts`

**Interfaces:**
- Consumes: `supabase` (`src/lib/supabase.ts`); tipi di Task 4;
  `calcolaOccorrenzeMancantiImpegno` (Task 1); `leggiImpostazioniFaccende`
  (`src/api/faccende.ts`, già esistente).
- Produces:
  - `type Impegno = Database['public']['Tables']['impegni']['Row']`
  - `type OccorrenzaImpegno = Database['public']['Tables']['occorrenze_impegni']['Row']`
  - `listaImpegni(gruppoId: string): Promise<Impegno[]>` (solo `attiva = true`)
  - `listaOccorrenzeImpegni(gruppoId: string): Promise<OccorrenzaImpegno[]>` (ordinate per `data_ora` asc)
  - `leggiFusoOrarioGruppo(gruppoId: string): Promise<string>` (da `impostazioni_faccende.fuso_orario`, `'Europe/Rome'` se assente)
  - `creaImpegno(params: { gruppoId: string; membroId: string; titolo: string; descrizione: string | null; dataInizio: string; ora: string | null; frequenza: Frequenza; intervalloRicorrenza: number | null; promemoriaMinutiPrima: number | null; modificabileDaTutti: boolean }): Promise<string>`
  - `modificaImpegno(impegnoId: string, params: Omit<Parametri sopra, 'gruppoId' | 'membroId'>): Promise<void>`
  - `cancellaImpegno(impegnoId: string): Promise<void>` (soft: `attiva = false`)
  - `eliminaOccorrenzeFuture(impegnoId: string): Promise<void>` (`delete ... where impegno_id = ... and data_ora > now()`)
  - `sincronizzaOccorrenzeImpegni(gruppoId: string, fusoOrario: string, orizzonteGiorni?: number): Promise<void>` (default `orizzonteGiorni = 90`)

Nessun file di test per questo task: nel progetto l'API layer
(`src/api/*.ts`) non ha test propri — la logica che vale la pena
testare è il calcolo puro, già coperto a fondo in Task 1 (vedi che non
esiste nessun `src/api/*.test.ts` oggi). Questo task è un adattatore
sottile su quel calcolo.

- [ ] **Step 1: Implementare `src/api/impegni.ts`**

`sincronizzaOccorrenzeImpegni`: legge tutti gli `impegni` attivi del
gruppo + tutte le `occorrenze_impegni` esistenti, calcola per ciascun
impegno `ultimaDataGenerata` (massimo `data_ora` esistente, convertito a
data locale col fuso orario dato) e una `DefinizioneRicorrenzaImpegno`
da `frequenza`/`intervallo_ricorrenza`/`data_inizio`/`ora`, chiama
`calcolaOccorrenzeMancantiImpegno` con
`orizzonteISO = aggiungiGiorni(oggiISO, orizzonteGiorni)`, e fa
`upsert(..., { onConflict: 'impegno_id,data_ora', ignoreDuplicates: true })`
sulle righe risultanti — stesso schema di `sincronizzaOccorrenze` in
`src/api/occorrenzeFaccende.ts`. `creaImpegno`/`modificaImpegno` sono
insert/update diretti sulla tabella `impegni` con i campi mappati in
snake_case, passando `promemoria_minuti_prima` (anche quando è `0`) senza
nessun controllo di verità (`0` è un valore valido e diverso da `null`).

- [ ] **Step 2: Verificare**

Run: `npx tsc --noEmit`
Expected: 0 errori

- [ ] **Step 3: Commit**

```bash
git add src/api/impegni.ts
git commit -m "feat: API impegni e generazione occorrenze lato client"
```

---

### Task 6: Hook — `useImpegni`

**Files:**
- Create: `src/hooks/useImpegni.ts`

**Interfaces:**
- Consumes: tutte le funzioni di Task 5; `supabase` per Realtime.
- Produces: `useImpegni(gruppoId: string | null)` → `{ impegni: Impegno[]; occorrenze: OccorrenzaImpegno[]; fusoOrario: string; isLoading: boolean; error: unknown; crea: UseMutationResult<...>; modifica: UseMutationResult<...>; cancella: UseMutationResult<...> }`

- [ ] **Step 1: Implementare l'hook**

Due `useQuery` (impegni, occorrenze) + una `useQuery` per il fuso orario
(`leggiFusoOrarioGruppo`); un `useEffect` che, quando `gruppoId` e
`fusoOrario` sono pronti, chiama `sincronizzaOccorrenzeImpegni` una volta
(stesso ruolo del bottone/effetto di sincronizzazione già usato per
Faccende, ma qui automatico perché non c'è un'azione utente equivalente
a "completa" che la renderebbe naturale). Sottoscrizione Realtime su
`impegni` e `occorrenze_impegni` filtrata per `gruppo_id`, che invalida le
due query (stesso pattern di `useOccorrenzeFaccende.ts`). `crea` chiama
`creaImpegno` poi invalida+risincronizza; `modifica` chiama
`modificaImpegno`, poi `eliminaOccorrenzeFuture`, poi risincronizza (le
occorrenze future vengono rigenerate da zero con i nuovi parametri);
`cancella` chiama `cancellaImpegno` poi invalida.

- [ ] **Step 2: Verificare**

Run: `npx tsc --noEmit`
Expected: 0 errori

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useImpegni.ts
git commit -m "feat: hook useImpegni con sincronizzazione e Realtime"
```

---

### Task 7: Calcolo + componente — griglia mensile

**Files:**
- Create: `src/calcolo/griglioMensile.ts`
- Test: `src/calcolo/griglioMensile.test.ts`
- Create: `src/components/CalendarioGriglia.tsx`

**Interfaces:**
- Consumes: `aggiungiGiorni`, `inizioSettimanaISO`, `fineSettimanaISO`,
  `inizioMeseISO`, `fineMeseISO`, `giornoSettimanaISO` da
  `ricorrenzaFaccende.ts`.
- Produces:
  - `interface CellaGriglia { dataISO: string; delMeseCorrente: boolean }`
  - `celleGrigliaMese(annoMeseISO: string): CellaGriglia[]` (`annoMeseISO` = `YYYY-MM-01`; ritorna tutte le settimane lun-dom che coprono il mese)
  - `<CalendarioGriglia annoMeseISO={string} occorrenzePerGiorno={Record<string, number>} giornoSelezionato={string | null} onSelezionaGiorno={(dataISO: string) => void} />`

- [ ] **Step 1: Scrivere i test di `celleGrigliaMese`**

```ts
import { celleGrigliaMese } from './griglioMensile';

describe('celleGrigliaMese', () => {
  // Novembre 2026: il 1° è domenica, il 30 è lunedì - mese scelto apposta
  // perché nessuno dei due estremi cade di lunedì/domenica, così la
  // griglia deve davvero aggiungere giorni di ottobre e dicembre.
  it('copre tutto novembre 2026 con settimane complete lun-dom', () => {
    const celle = celleGrigliaMese('2026-11-01');
    expect(celle[0].dataISO).toBe('2026-10-26'); // lunedì della settimana che contiene il 1 novembre
    expect(celle[celle.length - 1].dataISO).toBe('2026-12-06'); // domenica della settimana che contiene il 30 novembre
    expect(celle.length % 7).toBe(0);
  });

  it('marca correttamente i giorni fuori dal mese corrente', () => {
    const celle = celleGrigliaMese('2026-11-01');
    expect(celle.find((c) => c.dataISO === '2026-11-01')?.delMeseCorrente).toBe(true);
    expect(celle.find((c) => c.dataISO === '2026-11-30')?.delMeseCorrente).toBe(true);
    expect(celle[0].delMeseCorrente).toBe(false); // 2026-10-26, ottobre
    expect(celle[celle.length - 1].delMeseCorrente).toBe(false); // 2026-12-06, dicembre
  });
});
```

- [ ] **Step 2: Eseguire e verificare che fallisca**

Run: `npx jest griglioMensile.test.ts`
Expected: FAIL (funzione non definita)

- [ ] **Step 3: Implementare `celleGrigliaMese`**

`primoGiorno = inizioMeseISO(annoMeseISO)`, `ultimoGiorno =
fineMeseISO(annoMeseISO)`; cursore da `inizioSettimanaISO(primoGiorno)` a
`fineSettimanaISO(ultimoGiorno)` inclusi, un giorno alla volta con
`aggiungiGiorni`; `delMeseCorrente` = il mese di `dataISO` coincide con
quello di `annoMeseISO`.

- [ ] **Step 4: Eseguire e verificare che passi**

Run: `npx jest griglioMensile.test.ts`
Expected: PASS

- [ ] **Step 5: Implementare `CalendarioGriglia.tsx`**

Intestazione con le 7 iniziali dei giorni (Lun...Dom), poi righe di 7
celle da `celleGrigliaMese`; ogni cella è un `Pressable` con il numero
del giorno, opacità/colore ridotti se `!delMeseCorrente`, un puntino
colorato (token `accenti.indaco`, coerente con la tile della Dashboard —
Task 10) se `occorrenzePerGiorno[dataISO] > 0`, e un contorno/sfondo
diverso se `dataISO === giornoSelezionato`. `onPress` chiama
`onSelezionaGiorno(dataISO)` per qualsiasi cella, anche fuori mese
(permette di scorrere al mese adiacente toccando un giorno di contorno —
il cambio di `annoMeseISO` lo decide lo schermo chiamante, Task 9, non
questo componente).

- [ ] **Step 6: Verificare**

Run: `npx tsc --noEmit`
Expected: 0 errori

- [ ] **Step 7: Commit**

```bash
git add src/calcolo/griglioMensile.ts src/calcolo/griglioMensile.test.ts src/components/CalendarioGriglia.tsx
git commit -m "feat: griglia mensile del calendario"
```

---

### Task 8: Componente — form impegno

**Files:**
- Create: `src/components/ModificaImpegno.tsx`

**Interfaces:**
- Consumes: nessuna dipendenza da Task precedenti oltre ai tipi; stesso
  pattern "controllato" di `ModificaVoceDaFare.tsx` (props in, `onSalva`
  out, nessuna chiamata API dentro il componente).
- Produces:
  ```ts
  type ValoriImpegno = {
    titolo: string;
    descrizione: string | null;
    dataInizio: string;       // YYYY-MM-DD
    ora: string | null;       // HH:MM
    frequenza: Frequenza;
    intervalloRicorrenza: number | null;
    promemoriaMinutiPrima: number | null;
    modificabileDaTutti: boolean;
  };
  ```
  `<ModificaImpegno valoriIniziali={ValoriImpegno | null} salvando={boolean} onSalva={(valori: ValoriImpegno) => void} />`
  (`valoriIniziali = null` per la creazione, precompilato per la
  modifica).

- [ ] **Step 1: Implementare il componente**

Campi: `titolo` (`TextInput`, obbligatorio), `descrizione` (`TextInput`
opzionale), `dataInizio` (selettore data nativo o campo testo
`YYYY-MM-DD` — nessuna libreria di date-picker nuova: usare
`@react-native-community/datetimepicker` solo se già nelle dipendenze,
altrimenti un semplice `TextInput` validato, a scelta
dell'implementatore), `ora` (switch "tutto il giorno" sì/no + campo ora
se no), ricorrenza (righe di scelta: Nessuna/Giornaliera/Settimanale/
Mensile/Personalizzata, con campo numerico per l'intervallo solo se
Personalizzata), promemoria (preset "Nessuno / All'ora dell'impegno / 1
ora prima / 1 giorno prima / 1 settimana prima" che impostano
`promemoriaMinutiPrima` a `null`/`0`/`60`/`1440`/`10080`), switch
"Modificabile da chiunque nel gruppo" (default `true`, coerente con lo
schema). Bottone "Salva" disabilitato se `titolo.trim() === ''` o
`salvando`.

- [ ] **Step 2: Verificare**

Run: `npx tsc --noEmit`
Expected: 0 errori

- [ ] **Step 3: Commit**

```bash
git add src/components/ModificaImpegno.tsx
git commit -m "feat: form di creazione/modifica impegno"
```

---

### Task 9: Schermata Calendario

**Files:**
- Create: `app/(app)/calendario/index.tsx`
- Modify: `app/(app)/_layout.tsx`

**Interfaces:**
- Consumes: `useImpegni` (Task 6), `CalendarioGriglia` (Task 7),
  `ModificaImpegno` (Task 8), `useGruppoAttivoStore`, `confermaAzione`.
- Produces: rotta `/calendario`.

- [ ] **Step 1: Registrare la rotta**

In `_layout.tsx`, aggiungere
`<Stack.Screen name="calendario/index" options={{ title: 'Calendario' }} />`
nella stessa posizione alfabetica delle altre voci di gruppo.

- [ ] **Step 2: Implementare la schermata**

Stato locale: `annoMeseISO` (mese visualizzato, default il mese
corrente), `giornoSelezionato` (default oggi), `modaleAperto: 'crea' |
'modifica' | null`, `impegnoInModifica: Impegno | null`. Header con
freccia mese precedente/successivo (cambia `annoMeseISO` con
`aggiungiMesi`, già esportata da `ricorrenzaFaccende.ts`). `occorrenzePerGiorno`
derivato da `occorrenze.occorrenze` raggruppando per data locale (stesso
fuso orario dell'hook). Sotto la griglia, elenco delle occorrenze del
`giornoSelezionato` con, per ciascuna, titolo/descrizione/ora
dell'impegno collegato e — se `impegni_update`/`delete` lo permettono
lato RLS, cioè sempre tentabile dal client, che riceverà un errore se
non permesso — bottoni Modifica/Elimina (Elimina chiama `cancella` dopo
`confermaAzione`). Bottone "Nuovo impegno" apre il form (Task 8) con
`dataInizio` precompilata al `giornoSelezionato`.

- [ ] **Step 3: Verificare manualmente**

Run: `npm start` (Expo Go o simulatore)
Expected: la schermata `/calendario` si apre senza errori a console;
creare un impegno singolo e uno ricorrente mensile li mostra entrambi
sulla griglia nel giorno giusto.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/calendario/index.tsx" "app/(app)/_layout.tsx"
git commit -m "feat: schermata Calendario con griglia mensile"
```

---

### Task 10: Dashboard — tile Calendario

**Files:**
- Modify: `app/(app)/dashboard.tsx`

**Interfaces:**
- Consumes: `useImpegni` (Task 6, solo per il sottotitolo "prossimo
  impegno"), `accenti.indaco` (`src/theme/tokens.ts`, finora inutilizzato).

- [ ] **Step 1: Aggiungere la tile**

Nuova `GlassTile` nella griglia esistente (terza riga, insieme a
"Sfide", o riga propria — a scelta dell'implementatore): `icona="calendar"`,
`accento={accenti.indaco}`, `titolo="Calendario"`, `sottotitolo` = titolo
della prossima occorrenza futura (`occorrenze` ordinate per `data_ora`,
la prima con `data_ora > now()`) se presente, altrimenti `"Nessun
impegno in programma"`; `onPress={() => router.push('/calendario')}`.

- [ ] **Step 2: Verificare manualmente**

Run: `npm start`
Expected: la tile compare nella Dashboard del gruppo e naviga a
`/calendario` al tocco.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/dashboard.tsx"
git commit -m "feat: tile Calendario nella Dashboard"
```

---

### Task 11: Edge Function schedulata — generazione + promemoria

**Files:**
- Create: `supabase/functions/genera-promemoria-impegni/index.ts`
- Create: `supabase/migrations/00000000000031_impegni_promemoria_cron.sql`

**Interfaces:**
- Consumes: stessa logica di `calcolaOccorrenzeMancantiImpegno` (Task 1,
  riportata/adattata in Deno — vedi Step 1), tabelle `impegni`/
  `occorrenze_impegni`/`notifiche`/`membri`, `net.http_post` (già usato in
  `00000000000026`).
- Produces: Edge Function HTTP, job `pg_cron` ogni 15 minuti.

- [ ] **Step 1: Implementare `genera-promemoria-impegni/index.ts`**

Stesso schema di `invia-push-notifica/index.ts` (client Supabase con
`SUPABASE_SERVICE_ROLE_KEY`, nessun utente autenticato). Due fasi:

1. **Generazione**: per ogni `impegni` con `attiva = true`, calcolare le
   occorrenze mancanti fino a un orizzonte di 90 giorni (stessa funzione
   di Task 1 — portarla in questo file o in un modulo Deno condiviso,
   è codice puro senza dipendenze da React Native, quindi letteralmente
   copiabile) e `upsert` su `occorrenze_impegni` con
   `onConflict: 'impegno_id,data_ora'`, `ignoreDuplicates: true`.
2. **Promemoria**: `select` su `occorrenze_impegni` join `impegni` dove
   `impegni.promemoria_minuti_prima is not null` (0 incluso — attenzione
   a non scrivere `if (promemoria_minuti_prima)`), `data_ora - (
   promemoria_minuti_prima * interval '1 minute') <= now()`, `data_ora >
   now()`, e per ogni membro attivo del gruppo (`membri` con
   `uscito_il is null`) fare `insert` in `notifiche` con
   `tipo = 'impegno_promemoria'`, `impegno_id`, `destinatario_membro_id`,
   `evento_idempotenza = 'impegno:' || occorrenza.id || ':promemoria:' ||
   membro.id`, ignorando il conflitto se la riga esiste già (constraint
   unique su `evento_idempotenza`, già presente). L'insert in `notifiche`
   fa scattare da solo il trigger push esistente (Task 3): questa
   funzione non chiama mai direttamente `invia-push-notifica`.

- [ ] **Step 2: Scrivere la migration del cron**

```sql
create extension if not exists pg_cron;

select cron.schedule(
  'genera-promemoria-impegni',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://iajucwiivgjguyowywwb.supabase.co/functions/v1/genera-promemoria-impegni',
    headers := jsonb_build_object('Content-Type', 'application/json')
  );
  $$
);
```

- [ ] **Step 3: Verifica statica**

Rileggere entrambi i file. Verificare esplicitamente: (a) la query dei
promemoria non esclude `promemoria_minuti_prima = 0`; (b) l'idempotenza
copre sia "stesso tick rilanciato" sia "due tick consecutivi dentro la
stessa finestra di preavviso" (entrambi bloccati dallo stesso
`evento_idempotenza`); (c) `data_ora > now()` evita di avvisare per
impegni già passati se il job fosse stato fermo a lungo. Annotare nel
commit se il piano Supabase del progetto richiede di abilitare `pg_cron`
anche da dashboard (verificarlo prima di autorizzare il deploy — fuori
da questo task). Non eseguire `supabase db push` né `supabase functions
deploy`.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/genera-promemoria-impegni/index.ts supabase/migrations/00000000000031_impegni_promemoria_cron.sql
git commit -m "feat: generazione occorrenze e promemoria impegni via pg_cron"
```

---

## Self-Review

**Copertura dello spec:** goal 1-4 del design doc coperti (griglia:
Task 7/9; CRUD + permessi: Task 2/5/6/8/9; notifiche: Task 3/11;
concorrenza/idempotenza: Task 1/2/11). Entry point Bento: Task 10. Le tre
scelte segnate "mia" nel design doc (ancoraggio su `data_inizio`,
mezzanotte per "tutto il giorno", creatore uscito dal gruppo) sono
rispettivamente in Task 1, Task 1, Task 2.

**Proporzione:** i blocchi di codice sono quasi tutti migration SQL (dati
pinnati dal design doc, non inventabili dall'implementatore) o test con
asserzioni esatte; le funzioni applicative sono descritte per firma e
algoritmo in prosa, non trascritte.
