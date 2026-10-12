-- Due opzioni per ogni lista, scelte alla creazione:
-- - mostra_in_home: se mostrare una scorciatoia nella home del gruppo,
--   oltre che nell'elenco liste
-- - con_prezzi: se le sue voci sono collegate a una spesa (come la lista
--   della spesa) - segnare una voce "fatta" apre il form per registrare
--   quanto e' stato pagato, con la possibilita' di saltarlo
alter table public.liste
  add column mostra_in_home boolean not null default false,
  add column con_prezzi boolean not null default false;
