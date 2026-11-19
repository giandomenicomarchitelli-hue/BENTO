-- Offerte prodotto importate dai volantini dei supermercati (piattaforma
-- esterna "volantini-platform", separata da questo repo). Dato di
-- riferimento globale, non legato a un gruppo: serve per confrontare le
-- voci della lista della spesa con i prezzi in offerta della settimana.
-- Scritta solo dallo script di import (service role, bypassa la RLS);
-- gli utenti autenticati la leggono soltanto.

create table public.offerte_prodotti (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(trim(nome)) > 0),
  marca text,
  categoria text,
  prezzo_centesimi integer not null check (prezzo_centesimi > 0),
  prezzo_riferimento text,
  sconto_tipo text,
  catena text not null check (char_length(trim(catena)) > 0),
  gruppo text not null check (char_length(trim(gruppo)) > 0),
  valido_dal date not null,
  valido_al date not null check (valido_al >= valido_dal),
  fonte_url text not null,
  creato_il timestamptz not null default now()
);
create index idx_offerte_prodotti_valido_al on public.offerte_prodotti (valido_al);

alter table public.offerte_prodotti enable row level security;

create policy offerte_prodotti_lettura on public.offerte_prodotti for select
  using (true);

grant select on public.offerte_prodotti to authenticated;
