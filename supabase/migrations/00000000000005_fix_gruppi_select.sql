-- Bug: gruppi_select richiedeva e_membro_di(id), ma il creatore di un
-- gruppo non è ancora membro nell'istante in cui lo crea (l'insert in
-- membri avviene subito dopo, come seconda chiamata separata). Questo
-- bloccava con RLS la RETURNING clause di "insert into gruppi ... select()",
-- anche se l'insert stesso andava a buon fine.
drop policy gruppi_select on public.gruppi;

create policy gruppi_select on public.gruppi for select
  using (e_membro_di(id) or creato_da = auth.uid());
