-- GRANT dimenticato nella migration 26: l'Edge Function legge/scrive
-- push_subscriptions con la service_role key (via PostgREST, non una RPC
-- "security definer" come il resto del progetto - quella strada bypassa i
-- GRANT passando dal proprietario della funzione). service_role bypassa
-- la RLS ma non i GRANT di tabella: senza questo, ogni chiamata falliva
-- con "permission denied for table push_subscriptions".

grant select, insert, update, delete on public.push_subscriptions to service_role;
