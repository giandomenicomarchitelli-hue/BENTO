-- GRANT dimenticato nella migration 39: lo script di import usa la
-- service_role key via PostgREST. service_role bypassa la RLS ma non i
-- GRANT di tabella: senza questo, l'import falliva con "permission denied
-- for table offerte_prodotti" (stesso caso gia' visto nella migration 27).

grant select, insert, update, delete on public.offerte_prodotti to service_role;
