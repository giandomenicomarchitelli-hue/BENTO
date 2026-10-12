-- Funzioni RPC per operazioni che toccano più tabelle in una sola transazione.

-- Crea una spesa e le sue quote insieme. Valida la somma delle quote prima
-- del commit con un messaggio d'errore leggibile (oltre al trigger differito
-- su quote_spesa, che resta come rete di sicurezza).
create or replace function public.crea_spesa(
  p_gruppo_id uuid,
  p_pagato_da uuid,
  p_importo_centesimi integer,
  p_descrizione text,
  p_data date,
  p_quote jsonb -- [{"membro_id": "...", "quota_centesimi": 500}, ...]
)
returns uuid
language plpgsql security invoker -- rispetta le RLS del chiamante, nessun bypass
as $$
declare
  v_spesa_id uuid;
  v_somma integer;
begin
  if p_importo_centesimi <= 0 then
    raise exception 'importo_centesimi deve essere positivo';
  end if;

  select coalesce(sum((q ->> 'quota_centesimi')::integer), 0) into v_somma
  from jsonb_array_elements(p_quote) as q;

  if v_somma <> p_importo_centesimi then
    raise exception 'La somma delle quote (%) non corrisponde all''importo (%)',
      v_somma, p_importo_centesimi;
  end if;

  insert into public.spese (gruppo_id, pagato_da, importo_centesimi, descrizione, data)
  values (
    p_gruppo_id, p_pagato_da, p_importo_centesimi,
    coalesce(p_descrizione, ''), coalesce(p_data, current_date)
  )
  returning id into v_spesa_id;

  insert into public.quote_spesa (spesa_id, membro_id, quota_centesimi)
  select v_spesa_id, (q ->> 'membro_id')::uuid, (q ->> 'quota_centesimi')::integer
  from jsonb_array_elements(p_quote) as q;

  return v_spesa_id;
end;
$$;

-- Adesione a un gruppo esistente tramite codice invito. Serve un privilegio
-- elevato (security definer) perché chi si unisce non è ancora "membro" al
-- momento dell'insert, quindi non supererebbe la RLS di membri altrimenti.
create or replace function public.unisciti_a_gruppo(
  p_codice_invito text,
  p_nome text
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_gruppo_id uuid;
  v_membro_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Devi essere autenticato';
  end if;

  select id into v_gruppo_id from public.gruppi where codice_invito = p_codice_invito;
  if v_gruppo_id is null then
    raise exception 'Codice invito non valido';
  end if;

  insert into public.membri (gruppo_id, utente_id, nome)
  values (v_gruppo_id, auth.uid(), p_nome)
  on conflict (gruppo_id, utente_id) do nothing
  returning id into v_membro_id;

  return coalesce(
    v_membro_id,
    (select id from public.membri where gruppo_id = v_gruppo_id and utente_id = auth.uid())
  );
end;
$$;

-- Nota: annullare una spesa non richiede una RPC — è un semplice
-- `update spese set annullata = true where id = ...` lato client, già
-- coperto dalla policy spese_update_annulla.
