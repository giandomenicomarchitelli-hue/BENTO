-- Modulo "Carte e buoni": foto di carte fedeltà e buoni sconto,
-- condivise con tutto il gruppo. Stesso pattern di permessi/RLS già
-- usato per liste/voci_lista: e_membro_di() è definita in
-- 00000000000001/00000000000008.
--
-- Niente data di scadenza, niente modifica dopo la creazione (solo
-- insert/select/delete): per scelta esplicita del design doc, una fase
-- futura con riconoscimento AI della scadenza dalla foto non deve
-- essere anticipata qui.

create table public.carte_buoni (
  id uuid primary key default gen_random_uuid(),
  gruppo_id uuid not null references public.gruppi (id) on delete cascade,
  tipo text not null check (tipo in ('carta', 'buono')),
  etichetta text not null check (char_length(trim(etichetta)) > 0),
  -- Percorso nel bucket di storage "carte-buoni" (vedi
  -- 00000000000021), sempre nella forma "<gruppo_id>/<nome>.<estensione>"
  -- - vedi src/calcolo/archiviazioneFile.ts.
  percorso_file text not null unique,
  creato_da uuid references public.membri (id) on delete set null,
  creato_il timestamptz not null default now()
);
create index idx_carte_buoni_gruppo_tipo on public.carte_buoni (gruppo_id, tipo);

alter table public.carte_buoni enable row level security;

-- Stesso pattern di liste_tutti/voci_lista_tutti (00000000000006):
-- libero per ogni membro del gruppo, nessun ruolo "admin" in questo
-- progetto. Niente update: una carta/un buono non si modifica dopo la
-- creazione in questa fase, solo insert/select/delete.
create policy carte_buoni_tutti on public.carte_buoni for all
  using (e_membro_di(gruppo_id)) with check (e_membro_di(gruppo_id));

grant select, insert, delete on public.carte_buoni to authenticated;

alter publication supabase_realtime add table public.carte_buoni;
