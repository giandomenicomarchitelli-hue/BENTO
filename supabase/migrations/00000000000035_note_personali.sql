create table public.note_personali (
  id uuid primary key default gen_random_uuid(),
  utente_id uuid not null references auth.users(id) on delete cascade,
  titolo text not null check (char_length(trim(titolo)) > 0),
  contenuto text not null default '',
  creato_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now()
);
create index idx_note_personali_utente on public.note_personali(utente_id);

create trigger trg_note_personali_aggiornato_il
before update on public.note_personali
for each row execute function public.set_aggiornato_il();

create table public.foto_note_personali (
  id uuid primary key default gen_random_uuid(),
  nota_id uuid not null references public.note_personali(id) on delete cascade,
  percorso text not null,
  creato_il timestamptz not null default now()
);
create index idx_foto_note_personali_nota on public.foto_note_personali(nota_id);

alter table public.note_personali enable row level security;
alter table public.foto_note_personali enable row level security;

create policy note_personali_tutti on public.note_personali for all
  using (utente_id = auth.uid())
  with check (utente_id = auth.uid());

create policy foto_note_personali_tutti on public.foto_note_personali for all
  using (
    exists (
      select 1 from public.note_personali n
      where n.id = nota_id and n.utente_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.note_personali n
      where n.id = nota_id and n.utente_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.note_personali to authenticated;
grant select, insert, update, delete on public.foto_note_personali to authenticated;

alter publication supabase_realtime add table public.note_personali, public.foto_note_personali;
