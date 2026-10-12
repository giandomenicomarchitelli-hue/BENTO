-- Schema iniziale: gruppi, membri, lista della spesa, spese, quote_spesa.
-- Fase 1: gruppo da 2 persone, ma il modello supporta N membri.

create table public.gruppi (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(trim(nome)) > 0),
  tipo text not null default 'casa' check (tipo in ('casa', 'viaggio', 'ufficio', 'altro')),
  codice_invito text not null unique
    default substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
  creato_da uuid not null references auth.users (id) on delete restrict,
  creato_il timestamptz not null default now()
);

create table public.membri (
  id uuid primary key default gen_random_uuid(),
  gruppo_id uuid not null references public.gruppi (id) on delete cascade,
  utente_id uuid not null references auth.users (id) on delete cascade,
  nome text not null check (char_length(trim(nome)) > 0),
  creato_il timestamptz not null default now(),
  unique (gruppo_id, utente_id)
);
create index idx_membri_gruppo on public.membri (gruppo_id);
create index idx_membri_utente on public.membri (utente_id);

create table public.articoli_spesa (
  id uuid primary key default gen_random_uuid(),
  gruppo_id uuid not null references public.gruppi (id) on delete cascade,
  nome text not null check (char_length(trim(nome)) > 0),
  stato text not null default 'da_comprare' check (stato in ('da_comprare', 'comprato')),
  creato_da uuid references public.membri (id) on delete set null,
  creato_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now()
);
create index idx_articoli_gruppo_stato on public.articoli_spesa (gruppo_id, stato);

create or replace function public.set_aggiornato_il()
returns trigger
language plpgsql
as $$
begin
  new.aggiornato_il = now();
  return new;
end;
$$;

create trigger trg_articoli_spesa_aggiornato_il
before update on public.articoli_spesa
for each row execute function public.set_aggiornato_il();

-- Importo sempre in centesimi, intero: mai float per i soldi.
create table public.spese (
  id uuid primary key default gen_random_uuid(),
  gruppo_id uuid not null references public.gruppi (id) on delete cascade,
  pagato_da uuid not null references public.membri (id) on delete restrict,
  importo_centesimi integer not null check (importo_centesimi > 0),
  descrizione text not null default '',
  data date not null default current_date,
  annullata boolean not null default false, -- soft-delete: storico immutabile e annullabile
  creato_il timestamptz not null default now()
);
create index idx_spese_gruppo_attive on public.spese (gruppo_id) where not annullata;

create table public.quote_spesa (
  spesa_id uuid not null references public.spese (id) on delete cascade,
  membro_id uuid not null references public.membri (id) on delete restrict,
  quota_centesimi integer not null check (quota_centesimi >= 0),
  primary key (spesa_id, membro_id)
);
create index idx_quote_membro on public.quote_spesa (membro_id);

-- Un CHECK di riga non basta a validare un aggregato su più righe: la somma
-- delle quote di una spesa deve sempre uguagliare il suo importo. Trigger
-- differito, verificato a fine transazione (così insert spesa + insert quote
-- possono avvenire in ordine qualsiasi all'interno della stessa transazione).
create or replace function public.verifica_quote_spesa()
returns trigger
language plpgsql
as $$
declare
  v_spesa_id uuid;
  v_importo integer;
  v_somma integer;
begin
  v_spesa_id := coalesce(new.spesa_id, old.spesa_id);
  select importo_centesimi into v_importo from public.spese where id = v_spesa_id;
  select coalesce(sum(quota_centesimi), 0) into v_somma
    from public.quote_spesa where spesa_id = v_spesa_id;

  if v_somma <> v_importo then
    raise exception
      'La somma delle quote (%) non corrisponde all''importo della spesa (%)',
      v_somma, v_importo;
  end if;

  return null;
end;
$$;

create constraint trigger trg_verifica_quote_spesa
  after insert or update or delete on public.quote_spesa
  deferrable initially deferred
  for each row execute function public.verifica_quote_spesa();

-- Realtime: lista della spesa e spese reattive tra i membri del gruppo.
alter publication supabase_realtime add table
  public.articoli_spesa, public.spese, public.quote_spesa, public.membri;
