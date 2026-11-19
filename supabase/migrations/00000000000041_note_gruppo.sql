-- Note di gruppo: stesso modello delle note personali (titolo, contenuto
-- markdown, foto) ma condivise tra i membri invece che private a un
-- utente. Nessuna proprietà per riga - come liste/articoli_spesa, chi è
-- membro del gruppo può modificare o eliminare qualsiasi nota, non solo
-- quella creata da lui.

create table public.note_gruppo (
  id uuid primary key default gen_random_uuid(),
  gruppo_id uuid not null references public.gruppi(id) on delete cascade,
  titolo text not null check (char_length(trim(titolo)) > 0),
  contenuto text not null default '',
  creato_da uuid references public.membri(id) on delete set null,
  creato_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now()
);
create index idx_note_gruppo_gruppo on public.note_gruppo(gruppo_id);

create trigger trg_note_gruppo_aggiornato_il
before update on public.note_gruppo
for each row execute function public.set_aggiornato_il();

create table public.foto_note_gruppo (
  id uuid primary key default gen_random_uuid(),
  nota_id uuid not null references public.note_gruppo(id) on delete cascade,
  percorso text not null,
  creato_il timestamptz not null default now()
);
create index idx_foto_note_gruppo_nota on public.foto_note_gruppo(nota_id);

alter table public.note_gruppo enable row level security;
alter table public.foto_note_gruppo enable row level security;

create policy note_gruppo_tutti on public.note_gruppo for all
  using (e_membro_di(gruppo_id)) with check (e_membro_di(gruppo_id));

create policy foto_note_gruppo_tutti on public.foto_note_gruppo for all
  using (
    exists (
      select 1 from public.note_gruppo n
      where n.id = nota_id and e_membro_di(n.gruppo_id)
    )
  )
  with check (
    exists (
      select 1 from public.note_gruppo n
      where n.id = nota_id and e_membro_di(n.gruppo_id)
    )
  );

grant select, insert, update, delete on public.note_gruppo to authenticated;
grant select, insert, update, delete on public.foto_note_gruppo to authenticated;

alter publication supabase_realtime add table public.note_gruppo, public.foto_note_gruppo;
