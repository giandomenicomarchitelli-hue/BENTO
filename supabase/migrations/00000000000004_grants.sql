-- Le policy RLS filtrano le righe, ma Postgres richiede comunque il
-- privilegio di base sulla tabella: senza GRANT, anche un utente che
-- supererebbe la RLS riceve "permission denied". L'app richiede sempre il
-- login, quindi i privilegi vanno al ruolo "authenticated", non "anon".

grant usage on schema public to authenticated;

grant select, insert, update on public.gruppi to authenticated;
grant select, insert, update, delete on public.membri to authenticated;
grant select, insert, update, delete on public.articoli_spesa to authenticated;
grant select, insert, update on public.spese to authenticated;
grant select, insert on public.quote_spesa to authenticated;
