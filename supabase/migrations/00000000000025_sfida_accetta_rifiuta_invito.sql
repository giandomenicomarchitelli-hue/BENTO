-- Un invitato a una sfida può ora accettare (e procedere a votare) o
-- rifiutare l'invito. Chi rifiuta smette di essere "atteso" per chiudere
-- il turno corrente (altrimenti il gruppo resterebbe bloccato fino alla
-- scadenza), e chi ha creato la sfida riceve una notifica del rifiuto.
--
-- Chi crea la sfida accetta implicitamente (vota già alla creazione):
-- la sua riga nasce 'accettata', tutte le altre 'in_attesa'. Votare
-- richiede ora stato = 'accettata' (conferma_voti lo verifica).

alter table public.sfide_partecipanti
  add column stato text not null default 'in_attesa'
    check (stato in ('in_attesa', 'accettata', 'rifiutata'));

-- Dati già esistenti: chi ha già votato in un turno della propria sfida
-- aveva evidentemente già accettato, anche se la colonna non esisteva.
update public.sfide_partecipanti p
set stato = 'accettata'
where exists (
  select 1 from public.sfide_voti v
  join public.sfide_turni t on t.id = v.turno_id
  where v.membro_id = p.membro_id and t.sfida_id = p.sfida_id
);

alter table public.notifiche drop constraint notifiche_tipo_check;
alter table public.notifiche add constraint notifiche_tipo_check check (tipo in (
  'sfida_invito', 'sfida_promemoria', 'sfida_tutti_votato',
  'sfida_spareggio', 'sfida_vincitore', 'sfida_senza_accordo', 'sfida_scaduta',
  'sfida_rifiutata'
));

-- "Attesi" per chiudere un turno ora esclude chi ha rifiutato (vedi sotto):
-- stessa esclusione qui, per mostrare "X di Y hanno votato" con lo stesso Y.
create or replace view public.sfide_turni_progresso as
select
  t.id as turno_id,
  (
    select count(*) from public.sfide_partecipanti p
    join public.membri m on m.id = p.membro_id
    where p.sfida_id = t.sfida_id and m.uscito_il is null and p.stato <> 'rifiutata'
  ) as partecipanti_totali,
  (
    select count(distinct v.membro_id) from public.sfide_voti v
    where v.turno_id = t.id
  ) as partecipanti_votanti
from public.sfide_turni t
join public.sfide_scelta s on s.id = t.sfida_id
where e_membro_di(s.gruppo_id);

-- Il mio stato di partecipazione (in_attesa/accettata/rifiutata) per ogni
-- sfida a cui sono stato invitato - stesso principio di
-- sfide_turni_progresso: la vista corre con i privilegi di chi l'ha
-- creata (bypassa la RLS di sfide_partecipanti, che altrimenti farebbe
-- leggere anche le righe altrui), ma il filtro "m.utente_id = auth.uid()"
-- usa comunque l'identità reale di chi interroga, quindi restituisce
-- sempre e solo la propria riga.
create view public.sfide_mia_partecipazione as
select p.sfida_id, p.stato
from public.sfide_partecipanti p
join public.membri m on m.id = p.membro_id
where m.utente_id = auth.uid();

grant select on public.sfide_turni_progresso to authenticated;
grant select on public.sfide_mia_partecipazione to authenticated;

create or replace function public._chiudi_turno_se_completo(p_turno_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_sfida_id uuid;
  v_tipo_turno text;
  v_turno_stato text;
  v_numero_turno integer;
  v_gruppo_id uuid;
  v_votazione_scade_il timestamptz;
  v_titolo text;
  v_attesi integer;
  v_votanti integer;
  v_massimo integer;
  v_leader_ids uuid[];
  v_leader_count integer;
  v_vincente_id uuid;
  v_testo_vincente text;
  v_nuovo_turno_id uuid;
  v_nuova_scadenza timestamptz;
begin
  select t.sfida_id, t.tipo_turno, t.stato, t.numero_turno, s.gruppo_id, s.votazione_scade_il, s.titolo
  into v_sfida_id, v_tipo_turno, v_turno_stato, v_numero_turno, v_gruppo_id, v_votazione_scade_il, v_titolo
  from public.sfide_turni t
  join public.sfide_scelta s on s.id = t.sfida_id
  where t.id = p_turno_id;

  if v_turno_stato is distinct from 'in_corso' then
    return;
  end if;

  -- Chi ha rifiutato l'invito non è più atteso (altrimenti il turno non
  -- si chiuderebbe mai, aspettando per sempre un voto che non arriverà).
  select count(*) into v_attesi
  from public.sfide_partecipanti p
  join public.membri m on m.id = p.membro_id
  where p.sfida_id = v_sfida_id and m.uscito_il is null and p.stato <> 'rifiutata';

  select count(distinct v.membro_id) into v_votanti
  from public.sfide_voti v
  join public.sfide_partecipanti p on p.membro_id = v.membro_id and p.sfida_id = v_sfida_id
  join public.membri m on m.id = p.membro_id
  where v.turno_id = p_turno_id and m.uscito_il is null;

  if v_votanti < v_attesi then
    return; -- turno ancora aperto
  end if;

  insert into public.sfide_turno_risultati (turno_id, opzione_id, voti_ricevuti)
  select p_turno_id, opzione_id, count(*)
  from public.sfide_voti
  where turno_id = p_turno_id
  group by opzione_id;

  select max(voti_ricevuti) into v_massimo
  from public.sfide_turno_risultati
  where turno_id = p_turno_id;

  select array_agg(opzione_id), count(*) into v_leader_ids, v_leader_count
  from public.sfide_turno_risultati
  where turno_id = p_turno_id and voti_ricevuti = v_massimo;

  if v_tipo_turno = 'spareggio' then
    if v_leader_count = 1 then
      v_vincente_id := v_leader_ids[1];
      select testo_opzione into v_testo_vincente from public.sfide_opzioni where id = v_vincente_id;

      update public.sfide_turni set stato = 'concluso_vincitore', concluso_il = now() where id = p_turno_id;
      update public.sfide_scelta
      set stato = 'conclusa_vincitore', opzione_vincente_id = v_vincente_id, conclusa_il = now()
      where id = v_sfida_id;

      insert into public.notifiche (gruppo_id, destinatario_membro_id, tipo, titolo, corpo, sfida_id, evento_idempotenza)
      select v_gruppo_id, p.membro_id, 'sfida_vincitore', v_titolo,
        'Avete scelto: ' || v_testo_vincente || '.', v_sfida_id,
        'sfida:' || v_sfida_id || ':vincitore:' || p.membro_id
      from public.sfide_partecipanti p
      join public.membri m on m.id = p.membro_id
      where p.sfida_id = v_sfida_id and m.uscito_il is null and p.stato <> 'rifiutata'
      on conflict (evento_idempotenza) do nothing;
    else
      update public.sfide_turni set stato = 'concluso_senza_accordo', concluso_il = now() where id = p_turno_id;
      update public.sfide_scelta set stato = 'conclusa_senza_accordo', conclusa_il = now() where id = v_sfida_id;

      insert into public.notifiche (gruppo_id, destinatario_membro_id, tipo, titolo, corpo, sfida_id, evento_idempotenza)
      select v_gruppo_id, p.membro_id, 'sfida_senza_accordo', v_titolo,
        'Non avete raggiunto un accordo. Potete riprovare.', v_sfida_id,
        'sfida:' || v_sfida_id || ':senza_accordo:' || p_turno_id || ':' || p.membro_id
      from public.sfide_partecipanti p
      join public.membri m on m.id = p.membro_id
      where p.sfida_id = v_sfida_id and m.uscito_il is null and p.stato <> 'rifiutata'
      on conflict (evento_idempotenza) do nothing;
    end if;
    return;
  end if;

  if v_massimo is null or v_massimo <= 1 then
    update public.sfide_turni set stato = 'concluso_senza_accordo', concluso_il = now() where id = p_turno_id;
    update public.sfide_scelta set stato = 'conclusa_senza_accordo', conclusa_il = now() where id = v_sfida_id;

    insert into public.notifiche (gruppo_id, destinatario_membro_id, tipo, titolo, corpo, sfida_id, evento_idempotenza)
    select v_gruppo_id, p.membro_id, 'sfida_senza_accordo', v_titolo,
      'Non avete raggiunto un accordo. Potete riprovare.', v_sfida_id,
      'sfida:' || v_sfida_id || ':senza_accordo:' || p_turno_id || ':' || p.membro_id
    from public.sfide_partecipanti p
    join public.membri m on m.id = p.membro_id
    where p.sfida_id = v_sfida_id and m.uscito_il is null and p.stato <> 'rifiutata'
    on conflict (evento_idempotenza) do nothing;

  elsif v_leader_count = 1 then
    v_vincente_id := v_leader_ids[1];
    select testo_opzione into v_testo_vincente from public.sfide_opzioni where id = v_vincente_id;

    update public.sfide_turni set stato = 'concluso_vincitore', concluso_il = now() where id = p_turno_id;
    update public.sfide_scelta
    set stato = 'conclusa_vincitore', opzione_vincente_id = v_vincente_id, conclusa_il = now()
    where id = v_sfida_id;

    insert into public.notifiche (gruppo_id, destinatario_membro_id, tipo, titolo, corpo, sfida_id, evento_idempotenza)
    select v_gruppo_id, p.membro_id, 'sfida_vincitore', v_titolo,
      'Avete scelto: ' || v_testo_vincente || '.', v_sfida_id,
      'sfida:' || v_sfida_id || ':vincitore:' || p.membro_id
    from public.sfide_partecipanti p
    join public.membri m on m.id = p.membro_id
    where p.sfida_id = v_sfida_id and m.uscito_il is null and p.stato <> 'rifiutata'
    on conflict (evento_idempotenza) do nothing;

  else
    update public.sfide_turni set stato = 'concluso_pareggio', concluso_il = now() where id = p_turno_id;

    v_nuova_scadenza := case
      when v_votazione_scade_il > now() then v_votazione_scade_il
      else now() + interval '1 hour'
    end;

    insert into public.sfide_turni (sfida_id, numero_turno, tipo_turno, stato, opzioni_in_gara, scadenza)
    values (v_sfida_id, v_numero_turno + 1, 'spareggio', 'in_corso', v_leader_ids, v_nuova_scadenza)
    returning id into v_nuovo_turno_id;

    insert into public.notifiche (gruppo_id, destinatario_membro_id, tipo, titolo, corpo, sfida_id, evento_idempotenza)
    select v_gruppo_id, p.membro_id, 'sfida_spareggio', v_titolo,
      'Pareggio! Scegli la tua preferita tra le opzioni in parità.', v_sfida_id,
      'sfida:' || v_sfida_id || ':spareggio:' || v_nuovo_turno_id || ':' || p.membro_id
    from public.sfide_partecipanti p
    join public.membri m on m.id = p.membro_id
    where p.sfida_id = v_sfida_id and m.uscito_il is null and p.stato <> 'rifiutata'
    on conflict (evento_idempotenza) do nothing;
  end if;
end;
$$;

revoke all on function public._chiudi_turno_se_completo(uuid) from public, authenticated;

-- Il roster nasce con l'organizzatore già 'accettata' (ha appena votato
-- creando la sfida), tutti gli altri 'in_attesa' finché non rispondono.
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

  insert into public.sfide_partecipanti (sfida_id, membro_id, stato)
  select v_sfida_id, id, case when id = v_membro_id then 'accettata' else 'in_attesa' end
  from public.membri where gruppo_id = v_gruppo_id and uscito_il is null;

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

-- Votare richiede ora aver accettato l'invito: senza questo, chi non ha
-- ancora risposto (o ha rifiutato) potrebbe comunque votare bypassando
-- l'intero meccanismo di accettazione appena introdotto.
create or replace function public.conferma_voti(
  p_turno_id uuid,
  p_opzioni_scelte uuid[],
  p_proposta_personalizzata text
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_sfida_id uuid;
  v_tipo_turno text;
  v_gruppo_id uuid;
  v_membro_id uuid;
  v_stato_partecipante text;
  v_numero_scelte integer;
  v_distinte integer;
  v_proposta_id uuid;
  v_scelte_finali uuid[];
  v_fuori_gara integer;
begin
  if auth.uid() is null then
    raise exception 'Devi essere autenticato';
  end if;

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

  select stato into v_stato_partecipante
  from public.sfide_partecipanti where sfida_id = v_sfida_id and membro_id = v_membro_id;
  if v_stato_partecipante is null then
    raise exception 'Non eri tra gli invitati originali di questa sfida';
  end if;
  if v_stato_partecipante = 'rifiutata' then
    raise exception 'Hai rifiutato questa sfida';
  end if;
  if v_stato_partecipante = 'in_attesa' then
    raise exception 'Devi prima accettare l''invito';
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
    insert into public.sfide_opzioni (sfida_id, testo_opzione, testo_normalizzato, personalizzata, proposta_da, turno_proposto_id)
    values (
      v_sfida_id, p_proposta_personalizzata,
      lower(regexp_replace(normalize(trim(p_proposta_personalizzata), nfkc), '\s+', ' ', 'g')), true, v_membro_id, p_turno_id
    )
    on conflict (sfida_id, testo_normalizzato) do update set id = sfide_opzioni.id
    returning id into v_proposta_id;

    v_scelte_finali := array_append(v_scelte_finali, v_proposta_id);

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

-- Risposta esplicita di un invitato: accettare (potrà poi votare) o
-- rifiutare (esce dal conteggio degli attesi, chi ha creato la sfida
-- riceve una notifica del rifiuto).
create or replace function public.rispondi_invito_sfida(p_sfida_id uuid, p_accetta boolean)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_gruppo_id uuid;
  v_titolo text;
  v_creata_da uuid;
  v_membro_id uuid;
  v_nome_membro text;
  v_stato_attuale text;
  v_turno_corrente_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Devi essere autenticato';
  end if;

  select gruppo_id, titolo, creata_da into v_gruppo_id, v_titolo, v_creata_da
  from public.sfide_scelta where id = p_sfida_id;
  if not found then
    raise exception 'Sfida non trovata';
  end if;

  select id, nome into v_membro_id, v_nome_membro
  from public.membri
  where gruppo_id = v_gruppo_id and utente_id = auth.uid() and uscito_il is null;
  if v_membro_id is null then
    raise exception 'Non sei un membro attivo di questo gruppo';
  end if;

  select stato into v_stato_attuale
  from public.sfide_partecipanti where sfida_id = p_sfida_id and membro_id = v_membro_id;
  if v_stato_attuale is null then
    raise exception 'Non eri tra gli invitati originali di questa sfida';
  end if;
  if v_stato_attuale <> 'in_attesa' then
    raise exception 'Hai già risposto a questo invito';
  end if;

  update public.sfide_partecipanti
  set stato = case when p_accetta then 'accettata' else 'rifiutata' end
  where sfida_id = p_sfida_id and membro_id = v_membro_id;

  if not p_accetta then
    insert into public.notifiche (gruppo_id, destinatario_membro_id, tipo, titolo, corpo, sfida_id, evento_idempotenza)
    values (
      v_gruppo_id, v_creata_da, 'sfida_rifiutata',
      v_nome_membro || ' non ha accettato la sfida',
      v_titolo,
      p_sfida_id,
      'sfida:' || p_sfida_id || ':rifiutata:' || v_membro_id
    )
    on conflict (evento_idempotenza) do nothing;

    -- Un rifiuto può far scendere gli attesi del turno corrente a un
    -- numero già raggiunto dai voti esistenti (es. restava solo lui):
    -- senza questo, quel turno resterebbe aperto finché non scade.
    select t.id into v_turno_corrente_id
    from public.sfide_turni t
    where t.sfida_id = p_sfida_id and t.stato = 'in_corso'
    order by t.numero_turno desc
    limit 1;

    if v_turno_corrente_id is not null then
      perform public._chiudi_turno_se_completo(v_turno_corrente_id);
    end if;
  end if;
end;
$$;
