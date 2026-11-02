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
