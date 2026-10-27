-- Edge Function schedulata genera-promemoria-impegni: genera le occorrenze
-- mancanti (orizzonte 90 giorni) e inserisce i promemoria in notifiche, che
-- il trigger esistente _invia_notifica_push() (migration 028) spinge come
-- push - stessa rete di sicurezza lato server già usata per le faccende,
-- qui anche per gli impegni di calendario.
--
-- GRANT a service_role: la funzione legge/scrive queste tabelle con la
-- SUPABASE_SERVICE_ROLE_KEY via PostgREST (supabase-js), non tramite una
-- RPC "security definer" come il resto del progetto - quella strada
-- bypassa i GRANT passando dal proprietario della funzione, questa no.
-- service_role bypassa la RLS ma non i GRANT di tabella: senza queste
-- righe la funzione fallirebbe al primo avvio con "permission denied for
-- table X" (stesso problema, stessa soluzione, di
-- 00000000000027_push_subscriptions_grant_service_role.sql).
grant select on public.impegni to service_role;
grant select, insert on public.occorrenze_impegni to service_role;
grant select on public.membri to service_role;
grant insert on public.notifiche to service_role;
-- Non richiesto dal piano originale: la funzione legge anche il fuso
-- orario del gruppo (stesso dato che legge il client in
-- leggiFusoOrarioGruppo, src/api/impegni.ts) per calcolare gli istanti
-- delle occorrenze nello stesso fuso usato dal client - senza questo
-- grant userebbe sempre 'Europe/Rome' e potrebbe generare un istante
-- diverso da quello del client per un gruppo con fuso orario
-- personalizzato, creando una riga duplicata in occorrenze_impegni
-- (il vincolo unique è sull'istante esatto).
grant select on public.impostazioni_faccende to service_role;

create extension if not exists pg_cron;

select cron.schedule(
  'genera-promemoria-impegni',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://iajucwiivgjguyowywwb.supabase.co/functions/v1/genera-promemoria-impegni',
    headers := jsonb_build_object('Content-Type', 'application/json')
  );
  $$
);
