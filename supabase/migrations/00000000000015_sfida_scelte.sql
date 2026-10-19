-- Modulo "Sfida delle scelte": votazione di gruppo a partire da una lista
-- condivisa. Stesso pattern di permessi/RLS già usato per liste/faccende:
-- e_membro_di() è definita in 00000000000001/00000000000008. Vedi design
-- doc docs/superpowers/specs/2026-10-19-sfida-scelte-design.md §1 per il
-- ragionamento completo dietro ogni scelta di schema qui sotto.
--
-- Nota di progettazione: il vincitore/pareggio/spareggio è calcolato in
-- TypeScript puro e testato (src/calcolo/risultatoSfida.ts), mai da un
-- LLM - stesso approccio già usato per saldi e punti delle faccende.
-- sfide_turno_risultati è l'unica eccezione alla regola "non salvare
-- contatori derivabili" in questo intero progetto: serve a mostrare i
-- conteggi aggregati di un turno concluso SENZA mai rendere leggibile
-- sfide_voti, che lega membro_id a opzione_id e deve restare privata per
-- sempre, anche a turno concluso (il brief vieta di rivelare chi ha
-- votato cosa).

create table public.sfide_scelta (
  id uuid primary key default gen_random_uuid(),
  gruppo_id uuid not null references public.gruppi (id) on delete cascade,
  lista_id uuid not null references public.liste (id) on delete cascade,
  -- Chiave di idempotenza lato client (es. retry di rete sulla creazione).
  richiesta_id uuid unique,
  titolo text not null check (char_length(trim(titolo)) > 0),
  -- Dedotta dal nome della lista al momento della creazione, solo per
  -- scegliere l'emoji/il tono della domanda e delle notifiche - mai usata
  -- per logica di voto.
  categoria text,
  attivita_precisione text not null check (attivita_precisione in ('giorno', 'fascia', 'orario')),
  attivita_inizio timestamptz not null,
  attivita_fine timestamptz,
  -- Riferimento informativo: la vera scadenza del voto vive sul turno
  -- corrente (sfide_turni.scadenza), questa colonna rispecchia quella del
  -- turno iniziale per comodità di lista/notifica.
  votazione_scade_il timestamptz not null,
  -- Rispecchia sempre l'esito del turno corrente: 'in_corso' finché il
  -- turno corrente è 'in_corso', altrimenti copia 1:1 il suo esito finché
  -- non si apre un turno successivo (spareggio/nuovo tentativo).
  stato text not null default 'in_corso'
    check (stato in ('in_corso', 'conclusa_vincitore', 'conclusa_senza_accordo', 'conclusa_scaduta', 'annullata')),
  opzione_vincente_id uuid,
  creata_da uuid not null references public.membri (id) on delete restrict,
  creata_il timestamptz not null default now(),
  conclusa_il timestamptz
);
create index idx_sfide_scelta_gruppo_stato on public.sfide_scelta (gruppo_id, stato);

-- Roster FISSO allo snapshot iniziale: chi partecipa a una sfida è deciso
-- alla sua creazione e non cambia più, anche se qualcuno lascia il gruppo
-- in seguito (vedi design doc §9 per la politica sui membri usciti).
-- Nessun campo "votato_il": si deriva contando sfide_voti per il turno
-- corrente, mai salvato a parte.
create table public.sfide_partecipanti (
  id uuid primary key default gen_random_uuid(),
  sfida_id uuid not null references public.sfide_scelta (id) on delete cascade,
  membro_id uuid not null references public.membri (id) on delete restrict,
  unique (sfida_id, membro_id)
);
create index idx_sfide_partecipanti_sfida on public.sfide_partecipanti (sfida_id);

-- Pool CONDIVISO fra tutti i turni della stessa sfida (uno spareggio pesca
-- dalle stesse righe, non le duplica).
create table public.sfide_opzioni (
  id uuid primary key default gen_random_uuid(),
  sfida_id uuid not null references public.sfide_scelta (id) on delete cascade,
  voce_lista_id uuid references public.voci_lista (id) on delete set null,
  testo_opzione text not null check (char_length(trim(testo_opzione)) > 0),
  -- Normalizzato con src/calcolo/normalizzazioneTesto.ts per deduplicare
  -- le proposte personalizzate senza fondere testi semanticamente diversi.
  testo_normalizzato text not null,
  personalizzata boolean not null default false,
  proposta_da uuid references public.membri (id) on delete set null,
  creata_il timestamptz not null default now(),
  unique (sfida_id, testo_normalizzato)
);
create index idx_sfide_opzioni_sfida on public.sfide_opzioni (sfida_id);

create table public.sfide_turni (
  id uuid primary key default gen_random_uuid(),
  sfida_id uuid not null references public.sfide_scelta (id) on delete cascade,
  numero_turno int not null,
  tipo_turno text not null check (tipo_turno in ('iniziale', 'spareggio', 'nuovo_tentativo')),
  -- 'concluso_senza_accordo' (tutti hanno votato ma senza preferenza
  -- condivisa) e 'scaduto_incompleto' (il tempo e' scaduto prima che tutti
  -- votassero) sono stati DISTINTI: stessa gestione "puoi riprovare" lato
  -- UI, ma storico diverso, da non confondere.
  stato text not null default 'in_corso'
    check (stato in ('in_corso', 'concluso_vincitore', 'concluso_pareggio', 'concluso_senza_accordo', 'scaduto_incompleto')),
  -- Per uno spareggio: solo le opzioni pari merito del turno precedente.
  -- Per iniziale/nuovo_tentativo: tutto il pool di sfide_opzioni.
  opzioni_in_gara uuid[] not null default '{}',
  scadenza timestamptz not null,
  iniziato_il timestamptz not null default now(),
  concluso_il timestamptz,
  unique (sfida_id, numero_turno)
);
create index idx_sfide_turni_sfida on public.sfide_turni (sfida_id);

-- Scritte SOLO dalla RPC conferma_voti, mai una riga alla volta dal
-- client: il conteggio esatto di 3 voti (1 per uno spareggio) per persona
-- non è un vincolo di riga, lo applica quella RPC in una transazione.
create table public.sfide_voti (
  id uuid primary key default gen_random_uuid(),
  turno_id uuid not null references public.sfide_turni (id) on delete cascade,
  membro_id uuid not null references public.membri (id) on delete restrict,
  opzione_id uuid not null references public.sfide_opzioni (id) on delete restrict,
  creato_il timestamptz not null default now(),
  unique (turno_id, membro_id, opzione_id)
);
create index idx_sfide_voti_turno on public.sfide_voti (turno_id);

-- ECCEZIONE motivata alla regola "non salvare classifiche derivabili" (vedi
-- commento di testa del file): scritta una sola volta, dalla stessa RPC
-- che chiude il turno, mai modificabile dopo.
create table public.sfide_turno_risultati (
  turno_id uuid not null references public.sfide_turni (id) on delete cascade,
  opzione_id uuid not null references public.sfide_opzioni (id) on delete cascade,
  voti_ricevuti int not null check (voti_ricevuti >= 0),
  primary key (turno_id, opzione_id)
);
create index idx_sfide_turno_risultati_turno on public.sfide_turno_risultati (turno_id);

create table public.notifiche (
  id uuid primary key default gen_random_uuid(),
  gruppo_id uuid not null references public.gruppi (id) on delete cascade,
  destinatario_membro_id uuid not null references public.membri (id) on delete cascade,
  tipo text not null check (tipo in (
    'sfida_invito', 'sfida_promemoria', 'sfida_tutti_votato',
    'sfida_spareggio', 'sfida_vincitore', 'sfida_senza_accordo', 'sfida_scaduta'
  )),
  titolo text not null check (char_length(trim(titolo)) > 0),
  corpo text not null default '',
  sfida_id uuid references public.sfide_scelta (id) on delete cascade,
  -- Es. "sfida:<id>:promemoria:<turno_id>" - unique, evita duplicati anche
  -- sotto richieste concorrenti (upsert con ON CONFLICT DO NOTHING).
  evento_idempotenza text not null unique,
  letta_il timestamptz,
  creata_il timestamptz not null default now()
);
create index idx_notifiche_destinatario on public.notifiche (gruppo_id, destinatario_membro_id, letta_il);

-- Postgres non permette un riferimento forward a una tabella non ancora
-- creata: sfide_scelta.opzione_vincente_id punta a una riga di
-- sfide_opzioni, definita più sotto nel file. Vincolo aggiunto qui a fine
-- file invece di riordinare le tabelle, più facile da leggere in sequenza.
alter table public.sfide_scelta
  add constraint sfide_scelta_opzione_vincente_id_fkey
  foreign key (opzione_vincente_id) references public.sfide_opzioni (id) on delete set null;

alter table public.sfide_scelta enable row level security;
alter table public.sfide_partecipanti enable row level security;
alter table public.sfide_opzioni enable row level security;
alter table public.sfide_turni enable row level security;
alter table public.sfide_voti enable row level security;
alter table public.sfide_turno_risultati enable row level security;
alter table public.notifiche enable row level security;

-- SFIDE_SCELTA: libera in lettura/scrittura per i membri del gruppo
-- (le RPC fanno comunque i controlli fini su chi puo' creare/concludere).
-- Nessuna policy di delete: storico immutabile, mai una cancellazione.
create policy sfide_scelta_select on public.sfide_scelta for select
  using (e_membro_di(gruppo_id));
create policy sfide_scelta_insert on public.sfide_scelta for insert
  with check (e_membro_di(gruppo_id));
create policy sfide_scelta_update on public.sfide_scelta for update
  using (e_membro_di(gruppo_id)) with check (e_membro_di(gruppo_id));

-- SFIDE_PARTECIPANTI: solo lettura diretta dal client, il roster si scrive
-- unicamente dalla RPC di creazione della sfida (snapshot immutabile).
-- sfide_partecipanti non ha gruppo_id diretto: la regola e' verificata
-- via join su sfide_scelta, che lo porta.
create policy sfide_partecipanti_select on public.sfide_partecipanti for select
  using (exists (
    select 1 from public.sfide_scelta s
    where s.id = sfide_partecipanti.sfida_id and e_membro_di(s.gruppo_id)
  ));

-- SFIDE_OPZIONI: select con la regola di visibilita' del design doc §1 -
-- una proposta personalizzata (personalizzata = true) e' visibile solo a
-- chi l'ha proposta finche' il turno in cui e' stata proposta non si
-- conclude; dopo la chiusura del turno diventa visibile a tutti i
-- partecipanti. Le opzioni non personalizzate (snapshot della lista) sono
-- sempre visibili a tutti i partecipanti della sfida. Nessun
-- insert/update/delete diretto dal client: solo dalle RPC.
create policy sfide_opzioni_select on public.sfide_opzioni for select
  using (
    exists (select 1 from public.sfide_scelta s where s.id = sfide_opzioni.sfida_id and e_membro_di(s.gruppo_id))
    and (
      not personalizzata
      or proposta_da = (select id from public.membri where utente_id = auth.uid())
      or exists (
        select 1 from public.sfide_turni t
        where t.sfida_id = sfide_opzioni.sfida_id and t.stato <> 'in_corso'
      )
    )
  );

-- SFIDE_TURNI: lettura per i membri del gruppo della sfida; nessun
-- insert/update diretto dal client, solo dalle RPC.
create policy sfide_turni_select on public.sfide_turni for select
  using (exists (
    select 1 from public.sfide_scelta s where s.id = sfide_turni.sfida_id and e_membro_di(s.gruppo_id)
  ));

-- SFIDE_VOTI: ciascuno vede SOLO le proprie righe, mai quelle altrui -
-- neppure a turno concluso (vedi commento di testa del file). Nessun
-- insert/update/delete diretto dal client: solo dalla RPC conferma_voti.
create policy sfide_voti_select on public.sfide_voti for select
  using (membro_id = (select id from public.membri where utente_id = auth.uid()));

-- SFIDE_TURNO_RISULTATI: lettura per i membri del gruppo della sfida
-- (join fino a sfide_scelta); nessun insert/update/delete diretto, solo
-- dalla stessa RPC che chiude il turno.
create policy sfide_turno_risultati_select on public.sfide_turno_risultati for select
  using (exists (
    select 1 from public.sfide_turni t
    join public.sfide_scelta s on s.id = t.sfida_id
    where t.id = sfide_turno_risultati.turno_id and e_membro_di(s.gruppo_id)
  ));

-- NOTIFICHE: ciascuno vede solo le proprie; update permesso solo per
-- segnare letta_il sulle proprie righe; nessun insert diretto dal client,
-- solo dalle RPC.
create policy notifiche_select on public.notifiche for select
  using (destinatario_membro_id = (select id from public.membri where utente_id = auth.uid()));
create policy notifiche_update on public.notifiche for update
  using (destinatario_membro_id = (select id from public.membri where utente_id = auth.uid()))
  with check (destinatario_membro_id = (select id from public.membri where utente_id = auth.uid()));

grant select, insert, update on public.sfide_scelta to authenticated;
grant select on public.sfide_partecipanti to authenticated;
grant select on public.sfide_opzioni to authenticated;
grant select on public.sfide_turni to authenticated;
grant select, insert on public.sfide_voti to authenticated;
grant select on public.sfide_turno_risultati to authenticated;
grant select, update on public.notifiche to authenticated;

-- sfide_voti e le proposte personalizzate in sfide_opzioni non entrano in
-- questa pubblicazione: di norma Supabase Realtime rispetta le RLS per i
-- broadcast autenticati, ma per questa fase e' piu' prudente escludere le
-- due tabelle piu' sensibili e far leva sull'invalidation dei canali gia'
-- inclusi (sfide_turni/sfide_turno_risultati cambiano stato quando un voto
-- arriva, che e' il segnale che la UI deve comunque ricaricare).
alter publication supabase_realtime add table
  public.sfide_scelta, public.sfide_turni, public.sfide_turno_risultati, public.notifiche;
