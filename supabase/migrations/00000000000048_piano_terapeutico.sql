-- Piano terapeutico personale: un farmaco da prendere a orari fissi per un
-- numero di giorni, con avviso quando la confezione sta per esaurirsi.
-- Le dosi previste si generano tutte in anticipo alla creazione del piano
-- (durata_giorni * numero di orari, poche decine al massimo: una terapia
-- dura giorni/settimane, non è ricorrente all'infinito come un allenamento)
-- e si spuntano una per una - niente stima a tempo, il conteggio delle
-- dosi rimaste è sempre esatto.
create table public.piani_terapeutici (
  id uuid primary key default gen_random_uuid(),
  utente_id uuid not null references auth.users(id) on delete cascade,
  nome text not null check (char_length(trim(nome)) > 0),
  -- Orari delle dosi giornaliere, es. ["08:00","21:00"] - il numero di
  -- elementi è "quante dosi al giorno".
  orari text[] not null check (array_length(orari, 1) > 0),
  data_inizio date not null,
  durata_giorni integer not null check (durata_giorni > 0),
  quantita_confezione integer not null check (quantita_confezione > 0),
  attivo boolean not null default true,
  creato_il timestamptz not null default now()
);
create index idx_piani_terapeutici_utente on public.piani_terapeutici (utente_id) where attivo;

create table public.dosi_piano_terapeutico (
  id uuid primary key default gen_random_uuid(),
  piano_id uuid not null references public.piani_terapeutici (id) on delete cascade,
  -- Denormalizzato da piani_terapeutici.utente_id (stesso pattern di
  -- occorrenze_impegni.gruppo_id): semplifica la policy RLS, evita un join.
  utente_id uuid not null references auth.users(id) on delete cascade,
  data date not null,
  orario text not null,
  assunta boolean not null default false,
  assunta_il timestamptz,
  creato_il timestamptz not null default now(),
  unique (piano_id, data, orario)
);
create index idx_dosi_piano_terapeutico_piano on public.dosi_piano_terapeutico (piano_id, data);

alter table public.piani_terapeutici enable row level security;
alter table public.dosi_piano_terapeutico enable row level security;

create policy piani_terapeutici_tutti on public.piani_terapeutici for all
  using (utente_id = auth.uid()) with check (utente_id = auth.uid());
create policy dosi_piano_terapeutico_tutti on public.dosi_piano_terapeutico for all
  using (utente_id = auth.uid()) with check (utente_id = auth.uid());

grant select, insert, update, delete on public.piani_terapeutici to authenticated;
grant select, insert, update, delete on public.dosi_piano_terapeutico to authenticated;

alter publication supabase_realtime add table
  public.piani_terapeutici, public.dosi_piano_terapeutico;
