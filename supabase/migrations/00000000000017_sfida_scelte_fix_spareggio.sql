-- Corregge un difetto di conferma_voti (00000000000016): durante uno
-- spareggio (tipo_turno = 'spareggio') la cardinalità di p_opzioni_scelte
-- era validata come esattamente 1, ma se il chiamante passava ANCHE
-- p_proposta_personalizzata, quella proposta veniva comunque aggiunta a
-- v_scelte_finali subito dopo, facendo registrare 2 voti per la stessa
-- persona in un turno pensato per uno solo - violando l'invariante su cui
-- si basa _chiudi_turno_se_completo per decidere vincitore/spareggio
-- (scoperto durante Task 15, scrivendo la UI di voto: un turno di
-- spareggio non offre mai "+ Proponi un'altra opzione", coerente col
-- design doc - le opzioni di uno spareggio sono già fissate dal turno
-- precedente, non è il momento di introdurne di nuove). Corretto qui con
-- un create or replace (stesso principio append-only già seguito per le
-- altre correzioni di questa sessione: nuova migration, non modifica di
-- una già committata), aggiungendo un rifiuto esplicito invece di
-- lasciare che la UI sia la sola a prevenire il caso.
create or replace function public.conferma_voti(
  p_turno_id uuid,
  p_opzioni_scelte uuid[],
  p_proposta_personalizzata text
)
returns void
language plpgsql security invoker
as $$
declare
  v_sfida_id uuid;
  v_tipo_turno text;
  v_gruppo_id uuid;
  v_membro_id uuid;
  v_numero_scelte integer;
  v_distinte integer;
  v_proposta_id uuid;
  v_scelte_finali uuid[];
  v_fuori_gara integer;
begin
  update public.sfide_turni
  set numero_turno = numero_turno
  where id = p_turno_id and stato = 'in_corso' and scadenza >= now()
  returning sfida_id, tipo_turno into v_sfida_id, v_tipo_turno;

  if not found then
    raise exception 'Questo turno non accetta più voti';
  end if;

  select gruppo_id into v_gruppo_id from public.sfide_scelta where id = v_sfida_id;

  select id into v_membro_id
  from public.membri
  where gruppo_id = v_gruppo_id and utente_id = auth.uid() and uscito_il is null;
  if v_membro_id is null then
    raise exception 'Non sei un partecipante attivo di questo gruppo';
  end if;

  if not exists (
    select 1 from public.sfide_partecipanti where sfida_id = v_sfida_id and membro_id = v_membro_id
  ) then
    raise exception 'Non eri tra gli invitati originali di questa sfida';
  end if;

  if exists (select 1 from public.sfide_voti where turno_id = p_turno_id and membro_id = v_membro_id) then
    raise exception 'Hai già confermato le tue scelte per questo turno';
  end if;

  v_numero_scelte := coalesce(array_length(p_opzioni_scelte, 1), 0);
  select count(distinct x) into v_distinte from unnest(p_opzioni_scelte) x;
  if v_distinte <> v_numero_scelte then
    raise exception 'Le opzioni scelte non possono contenere duplicati';
  end if;

  if v_tipo_turno = 'spareggio' then
    if p_proposta_personalizzata is not null then
      raise exception 'Non è possibile proporre una nuova opzione durante uno spareggio';
    end if;
    if v_numero_scelte <> 1 then
      raise exception 'Nello spareggio va scelta esattamente 1 opzione';
    end if;
  elsif p_proposta_personalizzata is not null then
    if v_numero_scelte <> 2 then
      raise exception 'Con una proposta personalizzata servono esattamente 2 scelte tra quelle in gara';
    end if;
  elsif v_numero_scelte <> 3 then
    raise exception 'Vanno scelte esattamente 3 opzioni';
  end if;

  v_scelte_finali := p_opzioni_scelte;

  if p_proposta_personalizzata is not null then
    insert into public.sfide_opzioni (sfida_id, testo_opzione, testo_normalizzato, personalizzata, proposta_da)
    values (
      v_sfida_id, p_proposta_personalizzata,
      lower(trim(regexp_replace(p_proposta_personalizzata, '\s+', ' ', 'g'))), true, v_membro_id
    )
    on conflict (sfida_id, testo_normalizzato) do update set id = sfide_opzioni.id
    returning id into v_proposta_id;

    v_scelte_finali := array_append(v_scelte_finali, v_proposta_id);

    -- Senza questo, il proprio voto sulla propria proposta appena
    -- creata fallirebbe sempre il controllo "fuori gara" sotto.
    update public.sfide_turni
    set opzioni_in_gara = array_append(opzioni_in_gara, v_proposta_id)
    where id = p_turno_id and not (v_proposta_id = any(opzioni_in_gara));
  end if;

  select count(*) into v_fuori_gara
  from unnest(v_scelte_finali) x
  where not exists (
    select 1 from public.sfide_turni t where t.id = p_turno_id and x = any(t.opzioni_in_gara)
  );
  if v_fuori_gara > 0 then
    raise exception 'Una o più opzioni scelte non fanno parte di questo turno';
  end if;

  insert into public.sfide_voti (turno_id, membro_id, opzione_id)
  select p_turno_id, v_membro_id, unnest(v_scelte_finali);

  perform public._chiudi_turno_se_completo(p_turno_id);
end;
$$;
