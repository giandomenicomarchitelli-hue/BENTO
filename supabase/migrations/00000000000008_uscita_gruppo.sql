-- "Esci dal gruppo" non puo' cancellare la riga membro: spese.pagato_da e
-- quote_spesa.membro_id la referenziano con on delete restrict apposta per
-- proteggere lo storico finanziario, quindi la delete fallisce sempre se
-- il membro ha gia' pagato o condiviso una spesa. Si marca invece come
-- uscito con un timestamp: il nome resta leggibile nelle spese passate, ma
-- perde l'accesso al gruppo.
alter table public.membri add column uscito_il timestamptz;

-- e_membro_di deve contare solo i membri ancora attivi: una volta usciti
-- si perde l'accesso a tutto cio' che dipende da questa funzione (gruppi,
-- articoli_spesa, spese, quote_spesa, liste, voci_lista, membri stessi).
create or replace function public.e_membro_di(p_gruppo_id uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from public.membri m
    where m.gruppo_id = p_gruppo_id and m.utente_id = auth.uid() and m.uscito_il is null
  );
$$;

-- L'uscita passa ora da un update (gia' coperto da membri_update_self),
-- non da una delete: la delete diretta del proprio membro non serve piu'
-- e fallirebbe comunque in presenza di spese collegate.
drop policy if exists membri_delete_self on public.membri;
