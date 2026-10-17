-- Modulo "Faccende di casa": faccende ricorrenti, le singole occorrenze
-- generate dal calendario, lo storico eventi (completamenti/annullamenti,
-- fonte di verità per la classifica) e le impostazioni per gruppo (fuso
-- orario). Stesso pattern di permessi/RLS già usato per articoli_spesa e
-- liste: e_membro_di() è definita in 00000000000001/00000000000008.
--
-- Nota di progettazione: la generazione delle occorrenze è calcolata in
-- TypeScript puro e testato (src/calcolo/ricorrenzaFaccende.ts), non in
-- PL/pgSQL - stesso approccio già usato per i saldi (calcolaSaldi).
-- Il database resta comunque l'unica fonte di verità sulla persistenza:
-- il vincolo unique(faccenda_id, periodo_inizio) qui sotto rende
-- l'inserimento delle occorrenze idempotente anche se più membri aprono
-- l'app contemporaneamente (upsert con ON CONFLICT DO NOTHING lato client).

create table public.faccende (
  id uuid primary key default gen_random_uuid(),
  gruppo_id uuid not null references public.gruppi (id) on delete cascade,
  nome text not null check (char_length(trim(nome)) > 0),
  descrizione text,
  frequenza text not null
    check (frequenza in ('giornaliera', 'settimanale', 'mensile', 'personalizzata', 'una_tantum')),
  -- "Ogni N giorni" per frequenza = 'personalizzata'; null per le altre frequenze.
  intervallo_ricorrenza integer check (intervallo_ricorrenza is null or intervallo_ricorrenza > 0),
  -- Dettagli specifici della frequenza, es. {"giorno_settimana": 2} (1=lunedì..7=domenica)
  -- per 'settimanale', {"giorno_mese": 15} per 'mensile'. Vuoto per le altre.
  parametri_ricorrenza jsonb not null default '{}'::jsonb,
  durata_stimata_minuti integer check (durata_stimata_minuti is null or durata_stimata_minuti > 0),
  sforzo text not null default 'medio' check (sforzo in ('basso', 'medio', 'alto')),
  punti integer not null check (punti > 0),
  -- 'stima_automatica' = calcolato da src/calcolo/puntiFaccende.ts (mai da un
  -- LLM in questa fase: nessun provider AI è configurato nel progetto - vedi
  -- commento in quel file), 'manuale' = valore scelto/modificato a mano.
  origine_punteggio text not null default 'stima_automatica'
    check (origine_punteggio in ('stima_automatica', 'manuale')),
  -- null = disponibile per chiunque nel gruppo, non assegnata a un membro specifico.
  assegnata_a uuid references public.membri (id) on delete set null,
  -- L'archiviazione (attiva = false) ferma la generazione di nuove occorrenze
  -- senza cancellare occorrenze/storico già esistenti - mai una delete qui.
  attiva boolean not null default true,
  creato_da uuid references public.membri (id) on delete set null,
  creato_il timestamptz not null default now(),
  aggiornata_il timestamptz not null default now()
);
create index idx_faccende_gruppo_attiva on public.faccende (gruppo_id) where attiva;

-- set_aggiornato_il() è già definita in 00000000000001_schema_iniziale.sql
create trigger trg_faccende_aggiornata_il
before update on public.faccende
for each row execute function public.set_aggiornato_il();

create table public.occorrenze_faccende (
  id uuid primary key default gen_random_uuid(),
  faccenda_id uuid not null references public.faccende (id) on delete cascade,
  -- Denormalizzato da faccende.gruppo_id (stesso pattern di spese/articoli_spesa):
  -- semplifica le policy RLS e gli indici, evita un join su ogni query.
  gruppo_id uuid not null references public.gruppi (id) on delete cascade,
  periodo_inizio date not null,
  periodo_fine date not null check (periodo_fine >= periodo_inizio),
  scadenza timestamptz not null,
  -- Istantanea di faccende.punti al momento della generazione: il punteggio
  -- di un'occorrenza già creata resta stabile anche se la faccenda ricorrente
  -- cambia punteggio in seguito.
  punti_previsti integer not null check (punti_previsti > 0),
  stato text not null default 'da_fare' check (stato in ('da_fare', 'completata', 'scaduta')),
  completata_da uuid references public.membri (id) on delete set null,
  completata_il timestamptz,
  creato_il timestamptz not null default now(),
  -- Idempotenza della generazione: la stessa faccenda non può avere due
  -- occorrenze per lo stesso periodo, anche sotto richieste concorrenti
  -- (vedi ON CONFLICT DO NOTHING nell'upsert lato client).
  unique (faccenda_id, periodo_inizio)
);
create index idx_occorrenze_gruppo_stato on public.occorrenze_faccende (gruppo_id, stato);
create index idx_occorrenze_gruppo_scadenza on public.occorrenze_faccende (gruppo_id, scadenza);
create index idx_occorrenze_faccenda on public.occorrenze_faccende (faccenda_id);

-- Eventi di completamento/annullamento: fonte di verità per la classifica,
-- MAI un contatore separato che potrebbe disallinearsi. punti è con segno:
-- positivo per 'completata', negativo per 'annullata' - sommare questa
-- tabella per membro/periodo dà sempre il totale corretto.
create table public.storico_faccende (
  id uuid primary key default gen_random_uuid(),
  occorrenza_id uuid not null references public.occorrenze_faccende (id) on delete cascade,
  gruppo_id uuid not null references public.gruppi (id) on delete cascade,
  tipo_evento text not null check (tipo_evento in ('completata', 'annullata')),
  membro_id uuid references public.membri (id) on delete set null,
  punti integer not null,
  creato_il timestamptz not null default now()
);
create index idx_storico_gruppo_creato on public.storico_faccende (gruppo_id, creato_il);
create index idx_storico_membro on public.storico_faccende (membro_id);
create index idx_storico_occorrenza on public.storico_faccende (occorrenza_id);

-- Impostazioni del modulo per gruppo. La sua sola esistenza per un gruppo
-- indica che il modulo è stato attivato (vedi attiva_modulo_faccende() /
-- la pagina Faccende, che mostra un invito ad attivare se la riga manca).
create table public.impostazioni_faccende (
  gruppo_id uuid primary key references public.gruppi (id) on delete cascade,
  -- Nome di fuso orario IANA (es. "Europe/Rome"), per calcolare giorni/
  -- settimane/mesi e cambi d'ora in modo corretto per il gruppo.
  fuso_orario text not null default 'Europe/Rome',
  creato_il timestamptz not null default now()
);

alter table public.faccende enable row level security;
alter table public.occorrenze_faccende enable row level security;
alter table public.storico_faccende enable row level security;
alter table public.impostazioni_faccende enable row level security;

-- FACCENDE: libera per tutti i membri attivi del gruppo (stesso pattern di
-- articoli_spesa/liste - nessun ruolo "admin" esiste in questo progetto).
create policy faccende_tutti on public.faccende for all
  using (e_membro_di(gruppo_id)) with check (e_membro_di(gruppo_id));

-- OCCORRENZE_FACCENDE: lettura/inserimento/aggiornamento per i membri del
-- gruppo (la generazione calcolata lato client scrive qui direttamente).
-- Nessuna policy di delete: storico immutabile, un'occorrenza si annulla
-- con uno stato, mai con una cancellazione.
create policy occorrenze_select on public.occorrenze_faccende for select
  using (e_membro_di(gruppo_id));
create policy occorrenze_insert on public.occorrenze_faccende for insert
  with check (e_membro_di(gruppo_id));
create policy occorrenze_update on public.occorrenze_faccende for update
  using (e_membro_di(gruppo_id)) with check (e_membro_di(gruppo_id));

-- STORICO_FACCENDE: solo select + insert diretti da RLS (i membri possono
-- vedere lo storico del gruppo); le scritture "ufficiali" di completamento/
-- annullamento passano dalle RPC qui sotto, che inseriscono riga per riga
-- in modo atomico insieme all'aggiornamento dell'occorrenza. Niente
-- update/delete: evento storico immutabile una volta registrato.
create policy storico_select on public.storico_faccende for select
  using (e_membro_di(gruppo_id));
create policy storico_insert on public.storico_faccende for insert
  with check (e_membro_di(gruppo_id));

-- IMPOSTAZIONI_FACCENDE: libera per i membri del gruppo (attivazione e
-- lettura/modifica del fuso orario).
create policy impostazioni_faccende_tutti on public.impostazioni_faccende for all
  using (e_membro_di(gruppo_id)) with check (e_membro_di(gruppo_id));

grant select, insert, update on public.faccende to authenticated;
grant select, insert, update on public.occorrenze_faccende to authenticated;
grant select, insert on public.storico_faccende to authenticated;
grant select, insert, update on public.impostazioni_faccende to authenticated;

alter publication supabase_realtime add table
  public.faccende, public.occorrenze_faccende, public.storico_faccende;
