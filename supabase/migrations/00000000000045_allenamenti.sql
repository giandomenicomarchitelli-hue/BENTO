-- Calendario allenamenti personale: una scheda ricorrente ("Palestra - Petto
-- e bicipiti" ogni mercoledì e sabato) + le sessioni effettive registrate
-- quando l'utente apre un giorno e segna gli esercizi fatti.
--
-- Niente generazione/materializzazione in anticipo come occorrenze_impegni:
-- "quali giorni della settimana corrispondono a questa scheda" è puro
-- calcolo lato client (giorni_settimana + il giorno della settimana della
-- data, vedi src/calcolo/ricorrenzaAllenamenti.ts), non c'è una scadenza o
-- un promemoria da calcolare in anticipo come per gli impegni. Una riga in
-- occorrenze_allenamento esiste solo per una sessione che l'utente ha
-- davvero aperto (creata al bisogno, upsert idempotente).
--
-- Dato personale, non di gruppo: stesso pattern di eventi_personali
-- (ownership diretta per utente_id, RLS "for all", nessun soft-delete).
create table public.allenamenti (
  id uuid primary key default gen_random_uuid(),
  utente_id uuid not null references auth.users(id) on delete cascade,
  titolo text not null check (char_length(trim(titolo)) > 0),
  -- 1=lunedì..7=domenica (ISO), stesso schema di faccende.giorni_settimana.
  giorni_settimana integer[] not null check (array_length(giorni_settimana, 1) > 0),
  attiva boolean not null default true,
  creato_il timestamptz not null default now()
);
create index idx_allenamenti_utente on public.allenamenti (utente_id) where attiva;

create table public.occorrenze_allenamento (
  id uuid primary key default gen_random_uuid(),
  allenamento_id uuid not null references public.allenamenti (id) on delete cascade,
  -- Denormalizzato da allenamenti.utente_id (stesso pattern di
  -- occorrenze_impegni.gruppo_id): semplifica la policy RLS, evita un join.
  utente_id uuid not null references auth.users(id) on delete cascade,
  data date not null,
  creato_il timestamptz not null default now(),
  unique (allenamento_id, data)
);
create index idx_occorrenze_allenamento_utente_data on public.occorrenze_allenamento (utente_id, data);

create table public.esercizi_allenamento (
  id uuid primary key default gen_random_uuid(),
  occorrenza_id uuid not null references public.occorrenze_allenamento (id) on delete cascade,
  -- Denormalizzato per lo stesso motivo delle due tabelle sopra.
  utente_id uuid not null references auth.users(id) on delete cascade,
  nome text not null check (char_length(trim(nome)) > 0),
  serie integer check (serie is null or serie > 0),
  -- Testo libero e non un intero: schemi tipo "10,10,8" (ripetizioni
  -- diverse tra le serie) sono normali in palestra, un numero solo
  -- costringerebbe ad arrotondare o a spezzare l'esercizio in più righe.
  ripetizioni text,
  peso_kg numeric(6,2) check (peso_kg is null or peso_kg >= 0),
  ordine integer not null default 0,
  creato_il timestamptz not null default now()
);
create index idx_esercizi_allenamento_occorrenza on public.esercizi_allenamento (occorrenza_id, ordine);

alter table public.allenamenti enable row level security;
alter table public.occorrenze_allenamento enable row level security;
alter table public.esercizi_allenamento enable row level security;

create policy allenamenti_tutti on public.allenamenti for all
  using (utente_id = auth.uid()) with check (utente_id = auth.uid());
create policy occorrenze_allenamento_tutti on public.occorrenze_allenamento for all
  using (utente_id = auth.uid()) with check (utente_id = auth.uid());
create policy esercizi_allenamento_tutti on public.esercizi_allenamento for all
  using (utente_id = auth.uid()) with check (utente_id = auth.uid());

grant select, insert, update, delete on public.allenamenti to authenticated;
grant select, insert, update, delete on public.occorrenze_allenamento to authenticated;
grant select, insert, update, delete on public.esercizi_allenamento to authenticated;

alter publication supabase_realtime add table
  public.allenamenti, public.occorrenze_allenamento, public.esercizi_allenamento;
