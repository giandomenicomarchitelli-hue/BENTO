-- Row Level Security: ogni dato è visibile/modificabile solo da chi è membro
-- del gruppo a cui appartiene. Helper "security definer" per evitare che la
-- policy su "membri" diventi ricorsiva quando controlla l'appartenenza.

create or replace function public.e_membro_di(p_gruppo_id uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from public.membri m
    where m.gruppo_id = p_gruppo_id and m.utente_id = auth.uid()
  );
$$;

alter table public.gruppi enable row level security;
alter table public.membri enable row level security;
alter table public.articoli_spesa enable row level security;
alter table public.spese enable row level security;
alter table public.quote_spesa enable row level security;

-- GRUPPI
create policy gruppi_select on public.gruppi for select
  using (e_membro_di(id));
create policy gruppi_insert on public.gruppi for insert
  with check (creato_da = auth.uid());
create policy gruppi_update on public.gruppi for update
  using (e_membro_di(id)) with check (e_membro_di(id));

-- MEMBRI: select per chi è già membro del gruppo. L'inserimento diretto è
-- permesso solo al creatore del gruppo, per iscrivere se stesso come primo
-- membro; l'adesione successiva tramite codice invito passa dalla funzione
-- unisciti_a_gruppo() (vedi migration RPC), che bypassa RLS in modo
-- controllato — non esiste nessuna policy di insert "libera".
create policy membri_select on public.membri for select
  using (e_membro_di(gruppo_id));
create policy membri_insert_creatore on public.membri for insert
  with check (
    utente_id = auth.uid()
    and exists (
      select 1 from public.gruppi g
      where g.id = gruppo_id and g.creato_da = auth.uid()
    )
  );
create policy membri_update_self on public.membri for update
  using (utente_id = auth.uid()) with check (utente_id = auth.uid());
create policy membri_delete_self on public.membri for delete
  using (utente_id = auth.uid());

-- ARTICOLI_SPESA: libera per tutti i membri del gruppo (lista condivisa).
create policy articoli_tutti on public.articoli_spesa for all
  using (e_membro_di(gruppo_id)) with check (e_membro_di(gruppo_id));

-- SPESE: nessuna policy di delete -> storico immutabile; una spesa errata
-- si annulla con un update (annullata = true), mai con una delete.
create policy spese_select on public.spese for select
  using (e_membro_di(gruppo_id));
create policy spese_insert on public.spese for insert
  with check (e_membro_di(gruppo_id));
create policy spese_update_annulla on public.spese for update
  using (e_membro_di(gruppo_id)) with check (e_membro_di(gruppo_id));

-- QUOTE_SPESA: solo select + insert, mai update/delete -> storico immutabile.
create policy quote_select on public.quote_spesa for select
  using (
    exists (
      select 1 from public.spese s
      where s.id = spesa_id and e_membro_di(s.gruppo_id)
    )
  );
create policy quote_insert on public.quote_spesa for insert
  with check (
    exists (
      select 1 from public.spese s
      where s.id = spesa_id and e_membro_di(s.gruppo_id)
    )
  );
