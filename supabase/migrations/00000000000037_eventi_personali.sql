create table public.eventi_personali (
  id uuid primary key default gen_random_uuid(),
  utente_id uuid not null references auth.users(id) on delete cascade,
  titolo text not null check (char_length(trim(titolo)) > 0),
  descrizione text,
  data date not null,
  ora text,
  creato_il timestamptz not null default now()
);
create index idx_eventi_personali_utente_data on public.eventi_personali(utente_id, data);

alter table public.eventi_personali enable row level security;

create policy eventi_personali_tutti on public.eventi_personali for all
  using (utente_id = auth.uid())
  with check (utente_id = auth.uid());

grant select, insert, update, delete on public.eventi_personali to authenticated;

alter publication supabase_realtime add table public.eventi_personali;
