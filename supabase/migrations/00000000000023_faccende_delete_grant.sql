-- Grant delete su faccende: era stato omesso per errore nella migration 13.
-- La RLS policy "faccende_tutti for all" già copriva il DELETE a livello di
-- policy, ma PostgreSQL richiede anche il privilegio di tabella: senza
-- GRANT DELETE il database restituisce "permission denied" prima ancora di
-- valutare la RLS.
grant delete on public.faccende to authenticated;
