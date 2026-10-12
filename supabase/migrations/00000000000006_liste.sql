-- Liste generiche per gruppo (to-do, film da vedere, ecc.), separate dalla
-- lista della spesa (articoli_spesa), che resta dedicata e collegata alle
-- spese. Stesso pattern di permessi/RLS gia' usato per articoli_spesa.

create table public.liste (
  id uuid primary key default gen_random_uuid(),
  gruppo_id uuid not null references public.gruppi(id) on delete cascade,
  nome text not null check (char_length(trim(nome)) > 0),
  creato_da uuid references public.membri(id) on delete set null,
  creato_il timestamptz not null default now()
);
create index idx_liste_gruppo on public.liste(gruppo_id);

create table public.voci_lista (
  id uuid primary key default gen_random_uuid(),
  lista_id uuid not null references public.liste(id) on delete cascade,
  testo text not null check (char_length(trim(testo)) > 0),
  fatto boolean not null default false,
  creato_da uuid references public.membri(id) on delete set null,
  creato_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now()
);
create index idx_voci_lista_lista on public.voci_lista(lista_id);

-- set_aggiornato_il() e' gia' definita in 00000000000001_schema_iniziale.sql
create trigger trg_voci_lista_aggiornato_il
before update on public.voci_lista
for each row execute function public.set_aggiornato_il();

alter table public.liste enable row level security;
alter table public.voci_lista enable row level security;

create policy liste_tutti on public.liste for all
  using (e_membro_di(gruppo_id)) with check (e_membro_di(gruppo_id));

create policy voci_lista_tutti on public.voci_lista for all
  using (
    exists (select 1 from public.liste l where l.id = lista_id and e_membro_di(l.gruppo_id))
  )
  with check (
    exists (select 1 from public.liste l where l.id = lista_id and e_membro_di(l.gruppo_id))
  );

grant select, insert, update, delete on public.liste to authenticated;
grant select, insert, update, delete on public.voci_lista to authenticated;

alter publication supabase_realtime add table public.liste, public.voci_lista;
