create table public.impegni (
  id uuid primary key default gen_random_uuid(),
  gruppo_id uuid not null references public.gruppi (id) on delete cascade,
  titolo text not null check (char_length(trim(titolo)) > 0),
  descrizione text,
  data_inizio date not null,
  ora time,
  frequenza text not null
    check (frequenza in ('giornaliera', 'settimanale', 'mensile', 'personalizzata', 'una_tantum')),
  intervallo_ricorrenza integer check (intervallo_ricorrenza is null or intervallo_ricorrenza > 0),
  promemoria_minuti_prima integer check (promemoria_minuti_prima is null or promemoria_minuti_prima >= 0),
  modificabile_da_tutti boolean not null default true,
  creato_da uuid references public.membri (id) on delete set null,
  attiva boolean not null default true,
  creato_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now()
);
create index idx_impegni_gruppo_attiva on public.impegni (gruppo_id) where attiva;

create trigger trg_impegni_aggiornato_il
before update on public.impegni
for each row execute function public.set_aggiornato_il();

create table public.occorrenze_impegni (
  id uuid primary key default gen_random_uuid(),
  impegno_id uuid not null references public.impegni (id) on delete cascade,
  gruppo_id uuid not null references public.gruppi (id) on delete cascade,
  data_ora timestamptz not null,
  creato_il timestamptz not null default now(),
  unique (impegno_id, data_ora)
);
create index idx_occorrenze_impegni_gruppo_data on public.occorrenze_impegni (gruppo_id, data_ora);
create index idx_occorrenze_impegni_impegno on public.occorrenze_impegni (impegno_id);

alter table public.impegni enable row level security;
alter table public.occorrenze_impegni enable row level security;

create policy impegni_select on public.impegni for select
  using (e_membro_di(gruppo_id));
create policy impegni_insert on public.impegni for insert
  with check (e_membro_di(gruppo_id));

-- Modificabile/cancellabile da chiunque nel gruppo SE modificabile_da_tutti,
-- oppure se chi l'ha creato non è (più) un membro attivo del gruppo (evita
-- un impegno bloccato per sempre quando il creatore esce), oppure da chi
-- l'ha creato.
create policy impegni_update on public.impegni for update
  using (
    e_membro_di(gruppo_id)
    and (
      modificabile_da_tutti
      or creato_da is null
      or not exists (select 1 from public.membri m where m.id = impegni.creato_da and m.uscito_il is null)
      or creato_da = (select id from public.membri where utente_id = auth.uid() and gruppo_id = impegni.gruppo_id and uscito_il is null)
    )
  )
  with check (e_membro_di(gruppo_id));
create policy impegni_delete on public.impegni for delete
  using (
    e_membro_di(gruppo_id)
    and (
      modificabile_da_tutti
      or creato_da is null
      or not exists (select 1 from public.membri m where m.id = impegni.creato_da and m.uscito_il is null)
      or creato_da = (select id from public.membri where utente_id = auth.uid() and gruppo_id = impegni.gruppo_id and uscito_il is null)
    )
  );

-- OCCORRENZE_IMPEGNI: generate lato client/Edge Function, mai modificate
-- dopo l'inserimento (niente stato da aggiornare) - nessuna policy di
-- update, stesso principio di occorrenze_faccende/storico_faccende. Il
-- DELETE invece serve davvero: eliminaOccorrenzeFuture in src/api/impegni.ts
-- lo usa per rigenerare le occorrenze future dopo una modifica alla
-- ricorrenza, quindi la policy è necessaria (stessa dimenticanza già
-- corretta per faccende, vedi migration 00000000000023).
create policy occorrenze_impegni_select on public.occorrenze_impegni for select
  using (e_membro_di(gruppo_id));
create policy occorrenze_impegni_insert on public.occorrenze_impegni for insert
  with check (e_membro_di(gruppo_id));
create policy occorrenze_impegni_delete on public.occorrenze_impegni for delete
  using (
    e_membro_di(gruppo_id)
    and exists (
      select 1 from public.impegni i
      where i.id = occorrenze_impegni.impegno_id
        and (i.modificabile_da_tutti or i.creato_da is null
             or not exists (select 1 from public.membri m where m.id = i.creato_da and m.uscito_il is null)
             or i.creato_da = (select id from public.membri where utente_id = auth.uid() and gruppo_id = i.gruppo_id and uscito_il is null))
    )
  );

grant select, insert, update, delete on public.impegni to authenticated;
grant select, insert, delete on public.occorrenze_impegni to authenticated;

alter publication supabase_realtime add table public.impegni, public.occorrenze_impegni;
