-- Migliora il testo delle notifiche di invito per le sfide:
-- - titolo: "[Nome] ti ha invitato a una sfida" (invece della domanda)
-- - corpo: la domanda della sfida (es. "Cosa mangiamo stasera?")
-- Così l'utente sa subito chi l'ha invitato aprendo la lista notifiche,
-- e leggendo il corpo capisce di cosa tratta la sfida prima di aprirla.
--
-- Stesso miglioramento per ripeti_sfida: "[Nome] ha riproposto la sfida".

create or replace function public.crea_sfida(
  p_lista_id uuid,
  p_richiesta_id uuid,
  p_titolo text,
  p_categoria text,
  p_attivita_precisione text,
  p_attivita_inizio timestamptz,
  p_attivita_fine timestamptz,
  p_votazione_scade_il timestamptz,
  p_opzioni_scelte uuid[],
  p_proposta_personalizzata text
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_gruppo_id uuid;
  v_membro_id uuid;
  v_nome_organizzatore text;
  v_attivi integer;
  v_sfida_id uuid;
  v_turno_id uuid;
  v_opzione_id uuid;
  v_opzioni_create uuid[] := '{}';
  v_numero_scelte integer;
  v_distinte integer;
  v_scelte_da_lista uuid[];
  v_proposta_id uuid;
  v_scelte_finali uuid[];
  rec record;
begin
  if auth.uid() is null then
    raise exception 'Devi essere autenticato';
  end if;

  select id into v_sfida_id from public.sfide_scelta where richiesta_id = p_richiesta_id;
  if found then
    return v_sfida_id;
  end if;

  select gruppo_id into v_gruppo_id from public.liste where id = p_lista_id;
  if not found then
    raise exception 'Lista non trovata';
  end if;
  if not e_membro_di(v_gruppo_id) then
    raise exception 'Non sei un membro di questo gruppo';
  end if;

  select id into v_membro_id
  from public.membri
  where gruppo_id = v_gruppo_id and utente_id = auth.uid() and uscito_il is null;
  if v_membro_id is null then
    raise exception 'Non sei un membro attivo di questo gruppo';
  end if;

  select nome into v_nome_organizzatore from public.membri where id = v_membro_id;

  select count(*) into v_attivi from public.membri where gruppo_id = v_gruppo_id and uscito_il is null;
  if v_attivi < 2 then
    raise exception 'Serve almeno un altro membro nel gruppo per avviare una sfida';
  end if;

  if p_votazione_scade_il <= now() then
    raise exception 'La scadenza del voto deve essere nel futuro';
  end if;
  if p_attivita_precisione = 'orario' and p_votazione_scade_il > p_attivita_inizio then
    raise exception 'La scadenza del voto deve precedere l''orario scelto per l''attività';
  end if;

  v_numero_scelte := coalesce(array_length(p_opzioni_scelte, 1), 0);
  select count(distinct x) into v_distinte from unnest(p_opzioni_scelte) x;
  if v_numero_scelte > 0 and v_distinte <> v_numero_scelte then
    raise exception 'Le opzioni scelte dalla lista non possono contenere duplicati';
  end if;
  if p_proposta_personalizzata is not null then
    if v_numero_scelte <> 2 then
      raise exception 'Con una proposta personalizzata servono esattamente 2 scelte dalla lista';
    end if;
  elsif v_numero_scelte <> 3 then
    raise exception 'Vanno scelte esattamente 3 opzioni dalla lista';
  end if;
  if coalesce((select count(*) from public.voci_lista where id = any(p_opzioni_scelte) and lista_id = p_lista_id), 0) <> v_numero_scelte then
    raise exception 'Una o più voci scelte non appartengono a questa lista';
  end if;

  insert into public.sfide_scelta (
    gruppo_id, lista_id, richiesta_id, titolo, categoria, attivita_precisione,
    attivita_inizio, attivita_fine, votazione_scade_il, stato, creata_da
  ) values (
    v_gruppo_id, p_lista_id, p_richiesta_id, p_titolo, p_categoria, p_attivita_precisione,
    p_attivita_inizio, p_attivita_fine, p_votazione_scade_il, 'in_corso', v_membro_id
  ) returning id into v_sfida_id;

  for rec in select id, testo from public.voci_lista where lista_id = p_lista_id loop
    insert into public.sfide_opzioni (sfida_id, voce_lista_id, testo_opzione, testo_normalizzato, personalizzata)
    values (
      v_sfida_id, rec.id, rec.testo,
      lower(regexp_replace(normalize(trim(rec.testo), nfkc), '\s+', ' ', 'g')), false
    )
    on conflict (sfida_id, testo_normalizzato) do update set id = sfide_opzioni.id
    returning id into v_opzione_id;
    v_opzioni_create := array_append(v_opzioni_create, v_opzione_id);
  end loop;

  select array_agg(id) into v_scelte_da_lista
  from public.sfide_opzioni
  where sfida_id = v_sfida_id and voce_lista_id = any(p_opzioni_scelte);

  if coalesce(array_length(v_scelte_da_lista, 1), 0) <> v_numero_scelte then
    raise exception 'Una o più voci scelte non appartengono a questa lista';
  end if;

  if p_proposta_personalizzata is not null then
    insert into public.sfide_opzioni (sfida_id, testo_opzione, testo_normalizzato, personalizzata, proposta_da)
    values (
      v_sfida_id, p_proposta_personalizzata,
      lower(regexp_replace(normalize(trim(p_proposta_personalizzata), nfkc), '\s+', ' ', 'g')), true, v_membro_id
    )
    on conflict (sfida_id, testo_normalizzato) do update set id = sfide_opzioni.id
    returning id into v_proposta_id;
    v_opzioni_create := array_append(v_opzioni_create, v_proposta_id);
    v_scelte_finali := array_append(v_scelte_da_lista, v_proposta_id);
  else
    v_scelte_finali := v_scelte_da_lista;
  end if;

  v_opzioni_create := array(select distinct unnest(v_opzioni_create));

  insert into public.sfide_partecipanti (sfida_id, membro_id)
  select v_sfida_id, id from public.membri where gruppo_id = v_gruppo_id and uscito_il is null;

  insert into public.sfide_turni (sfida_id, numero_turno, tipo_turno, stato, opzioni_in_gara, scadenza)
  values (v_sfida_id, 1, 'iniziale', 'in_corso', v_opzioni_create, p_votazione_scade_il)
  returning id into v_turno_id;

  if p_proposta_personalizzata is not null then
    update public.sfide_opzioni set turno_proposto_id = v_turno_id
    where id = v_proposta_id and turno_proposto_id is null;
  end if;

  insert into public.sfide_voti (turno_id, membro_id, opzione_id)
  select v_turno_id, v_membro_id, unnest(v_scelte_finali);

  perform public._chiudi_turno_se_completo(v_turno_id);

  -- titolo: chi ha creato la sfida, per riconoscerla nella lista notifiche
  -- corpo: la domanda (es. "Cosa mangiamo stasera?"), per capire di cosa tratta
  insert into public.notifiche (gruppo_id, destinatario_membro_id, tipo, titolo, corpo, sfida_id, evento_idempotenza)
  select v_gruppo_id, p.membro_id, 'sfida_invito',
    v_nome_organizzatore || ' ti ha invitato a una sfida',
    p_titolo,
    v_sfida_id,
    'sfida:' || v_sfida_id || ':invito:' || p.membro_id
  from public.sfide_partecipanti p
  where p.sfida_id = v_sfida_id and p.membro_id <> v_membro_id
  on conflict (evento_idempotenza) do nothing;

  return v_sfida_id;
end;
$$;

create or replace function public.ripeti_sfida(p_sfida_id uuid)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_gruppo_id uuid;
  v_stato text;
  v_titolo text;
  v_membro_id uuid;
  v_nome_organizzatore text;
  v_numero_turno integer;
  v_turno_id uuid;
  v_opzioni uuid[];
  v_scadenza timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Devi essere autenticato';
  end if;

  select gruppo_id, stato, titolo into v_gruppo_id, v_stato, v_titolo
  from public.sfide_scelta where id = p_sfida_id;
  if not found then
    raise exception 'Sfida non trovata';
  end if;
  if not e_membro_di(v_gruppo_id) then
    raise exception 'Non sei un membro di questo gruppo';
  end if;
  if v_stato not in ('conclusa_senza_accordo', 'conclusa_scaduta') then
    raise exception 'Questa sfida non può essere ripetuta nel suo stato attuale';
  end if;

  select id into v_membro_id
  from public.membri
  where gruppo_id = v_gruppo_id and utente_id = auth.uid() and uscito_il is null;
  if v_membro_id is null then
    raise exception 'Non sei un membro attivo di questo gruppo';
  end if;

  select nome into v_nome_organizzatore from public.membri where id = v_membro_id;

  select array_agg(id) into v_opzioni from public.sfide_opzioni where sfida_id = p_sfida_id;
  select max(numero_turno) into v_numero_turno from public.sfide_turni where sfida_id = p_sfida_id;

  v_scadenza := now() + interval '24 hours';

  insert into public.sfide_turni (sfida_id, numero_turno, tipo_turno, stato, opzioni_in_gara, scadenza)
  values (p_sfida_id, v_numero_turno + 1, 'nuovo_tentativo', 'in_corso', v_opzioni, v_scadenza)
  returning id into v_turno_id;

  update public.sfide_scelta set stato = 'in_corso', conclusa_il = null where id = p_sfida_id;

  insert into public.notifiche (gruppo_id, destinatario_membro_id, tipo, titolo, corpo, sfida_id, evento_idempotenza)
  select v_gruppo_id, p.membro_id, 'sfida_invito',
    v_nome_organizzatore || ' ha riproposto la sfida',
    v_titolo,
    p_sfida_id,
    'sfida:' || p_sfida_id || ':invito:' || p.membro_id || ':turno:' || (v_numero_turno + 1)
  from public.sfide_partecipanti p
  join public.membri m on m.id = p.membro_id
  where p.sfida_id = p_sfida_id and m.uscito_il is null and p.membro_id <> v_membro_id
  on conflict (evento_idempotenza) do nothing;

  return v_turno_id;
end;
$$;
