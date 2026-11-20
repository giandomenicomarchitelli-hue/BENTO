-- Preferenza di gruppo su quali catene di supermercato mostrare tra le
-- offerte (src/calcolo/offerteProdotti.ts): con sempre più catene coperte
-- da volantini-platform, un gruppo vuole vedere solo i prezzi dei
-- supermercati che usa davvero, non tutti. Stesso pattern di
-- impostazioni_faccende (migration 00000000000029): la riga è opzionale,
-- null/assente = nessun filtro, mostra le offerte di tutte le catene.
create table public.impostazioni_spesa (
  gruppo_id uuid primary key references public.gruppi (id) on delete cascade,
  catene_preferite text[],
  creato_il timestamptz not null default now()
);

alter table public.impostazioni_spesa enable row level security;

-- Libera per i membri del gruppo, stesso pattern di impostazioni_faccende:
-- nessun ruolo "admin" esiste in questo progetto.
create policy impostazioni_spesa_tutti on public.impostazioni_spesa for all
  using (e_membro_di(gruppo_id)) with check (e_membro_di(gruppo_id));

grant select, insert, update on public.impostazioni_spesa to authenticated;
