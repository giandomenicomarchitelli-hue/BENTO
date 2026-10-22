-- RPC del modulo "Sfida delle scelte": creazione, voto, spareggio/nuovo
-- tentativo e scadenza, tutte "security invoker" (identità sempre da
-- auth.uid(), mai da un parametro) - stesso principio delle RPC di
-- Faccende in 00000000000014_faccende_rpc.sql. Il calcolo di
-- vincitore/pareggio/senza_accordo qui sotto rispecchia esattamente
-- l'algoritmo di src/calcolo/risultatoSfida.ts (Task 4): nessun LLM.

-- Le RPC sotto scrivono su tabelle per cui 00000000000015 non dava
-- ancora GRANT/policy di scrittura: quel file lo segnalava
-- esplicitamente come verifica da fare qui ("Task 6 deve verificare...
-- e tornare qui se serve aggiungere una policy mancante"). Aggiunta in
-- questa migration successiva invece di modificare 00000000000015 già
-- commitata (append-only, stesso principio di 00000000000008/9/10).
grant insert on public.sfide_partecipanti to authenticated;
grant insert, update on public.sfide_opzioni to authenticated;
grant insert, update on public.sfide_turni to authenticated;
grant insert on public.sfide_turno_risultati to authenticated;
grant insert on public.notifiche to authenticated;

create policy sfide_partecipanti_insert on public.sfide_partecipanti for insert
  with check (exists (
    select 1 from public.sfide_scelta s where s.id = sfide_partecipanti.sfida_id and e_membro_di(s.gruppo_id)
  ));

create policy sfide_opzioni_insert on public.sfide_opzioni for insert
  with check (exists (
    select 1 from public.sfide_scelta s where s.id = sfide_opzioni.sfida_id and e_membro_di(s.gruppo_id)
  ));
-- UPDATE serve solo per l'upsert "riusa proposta esistente" (insert ...
-- on conflict do update set id = id, solo per poter fare RETURNING
-- anche sul conflitto): non modifica mai altri campi.
create policy sfide_opzioni_update on public.sfide_opzioni for update
  using (exists (
    select 1 from public.sfide_scelta s where s.id = sfide_opzioni.sfida_id and e_membro_di(s.gruppo_id)
  ))
  with check (exists (
    select 1 from public.sfide_scelta s where s.id = sfide_opzioni.sfida_id and e_membro_di(s.gruppo_id)
  ));

create policy sfide_turni_insert on public.sfide_turni for insert
  with check (exists (
    select 1 from public.sfide_scelta s where s.id = sfide_turni.sfida_id and e_membro_di(s.gruppo_id)
  ));
create policy sfide_turni_update on public.sfide_turni for update
  using (exists (
    select 1 from public.sfide_scelta s where s.id = sfide_turni.sfida_id and e_membro_di(s.gruppo_id)
  ))
  with check (exists (
    select 1 from public.sfide_scelta s where s.id = sfide_turni.sfida_id and e_membro_di(s.gruppo_id)
  ));

-- sfide_voti aveva già GRANT insert da 00000000000015, ma nessuna
-- policy di insert: senza questa, ogni RPC che vota avrebbe fallito.
create policy sfide_voti_insert on public.sfide_voti for insert
  with check (
    membro_id = (select id from public.membri where utente_id = auth.uid())
    and exists (
      select 1 from public.sfide_turni t
      join public.sfide_scelta s on s.id = t.sfida_id
      where t.id = sfide_voti.turno_id and e_membro_di(s.gruppo_id)
    )
  );

create policy sfide_turno_risultati_insert on public.sfide_turno_risultati for insert
  with check (exists (
    select 1 from public.sfide_turni t
    join public.sfide_scelta s on s.id = t.sfida_id
    where t.id = sfide_turno_risultati.turno_id and e_membro_di(s.gruppo_id)
  ));

create policy notifiche_insert on public.notifiche for insert
  with check (e_membro_di(gruppo_id));

-- Chiude il turno e calcola l'esito SOLO quando tutti i partecipanti
-- ancora attivi del gruppo hanno votato (brief §16 / design doc §9: chi
-- esce dal gruppo smette di essere atteso, senza che questo tocchi un
-- suo voto già espresso). Riusata sia da crea_sfida (voto
-- dell'organizzatore) sia da conferma_voti, per non duplicare la
-- logica di chiusura.
create or replace function public._chiudi_turno_se_completo(p_turno_id uuid)
returns void
language plpgsql security invoker
as $$
declare
  v_sfida_id uuid;
  v_tipo_turno text;
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
  select t.sfida_id, t.tipo_turno, t.numero_turno, s.gruppo_id, s.votazione_scade_il, s.titolo
  into v_sfida_id, v_tipo_turno, v_numero_turno, v_gruppo_id, v_votazione_scade_il, v_titolo
  from public.sfide_turni t
  join public.sfide_scelta s on s.id = t.sfida_id
  where t.id = p_turno_id;

  select count(*) into v_attesi
  from public.sfide_partecipanti p
  join public.membri m on m.id = p.membro_id
  where p.sfida_id = v_sfida_id and m.uscito_il is null;

  select count(distinct membro_id) into v_votanti
  from public.sfide_voti
  where turno_id = p_turno_id;

  if v_votanti < v_attesi then
    return; -- turno ancora aperto
  end if;

  -- Eccezione motivata alla regola "non salvare classifiche derivabili"
  -- (vedi commento di testa di 00000000000015): scritta una sola volta,
  -- qui, mai più modificata dopo. sfide_voti resta privata per sempre.
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
      where p.sfida_id = v_sfida_id and m.uscito_il is null
      on conflict (evento_idempotenza) do nothing;
    else
      -- Pareggio in uno spareggio: MAI un secondo spareggio (brief §14).
      update public.sfide_turni set stato = 'concluso_senza_accordo', concluso_il = now() where id = p_turno_id;
      update public.sfide_scelta set stato = 'conclusa_senza_accordo', conclusa_il = now() where id = v_sfida_id;

      insert into public.notifiche (gruppo_id, destinatario_membro_id, tipo, titolo, corpo, sfida_id, evento_idempotenza)
      select v_gruppo_id, p.membro_id, 'sfida_senza_accordo', v_titolo,
        'Non avete raggiunto un accordo. Potete riprovare.', v_sfida_id,
        'sfida:' || v_sfida_id || ':senza_accordo:' || p_turno_id || ':' || p.membro_id
      from public.sfide_partecipanti p
      join public.membri m on m.id = p.membro_id
      where p.sfida_id = v_sfida_id and m.uscito_il is null
      on conflict (evento_idempotenza) do nothing;
    end if;
    return;
  end if;

  -- Turno 'iniziale' o 'nuovo_tentativo'.
  if v_massimo is null or v_massimo <= 1 then
    -- Nessuna opzione con >= 2 voti: senza accordo diretto, mai uno
    -- spareggio (brief §12).
    update public.sfide_turni set stato = 'concluso_senza_accordo', concluso_il = now() where id = p_turno_id;
    update public.sfide_scelta set stato = 'conclusa_senza_accordo', conclusa_il = now() where id = v_sfida_id;

    insert into public.notifiche (gruppo_id, destinatario_membro_id, tipo, titolo, corpo, sfida_id, evento_idempotenza)
    select v_gruppo_id, p.membro_id, 'sfida_senza_accordo', v_titolo,
      'Non avete raggiunto un accordo. Potete riprovare.', v_sfida_id,
      'sfida:' || v_sfida_id || ':senza_accordo:' || p_turno_id || ':' || p.membro_id
    from public.sfide_partecipanti p
    join public.membri m on m.id = p.membro_id
    where p.sfida_id = v_sfida_id and m.uscito_il is null
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
    where p.sfida_id = v_sfida_id and m.uscito_il is null
    on conflict (evento_idempotenza) do nothing;

  else
    -- Pareggio in un turno non-spareggio: apre AUTOMATICAMENTE il
    -- turno di spareggio, nessuna azione richiesta all'organizzatore
    -- (brief §14, diverso dal "Riprova" esplicito di ripeti_sfida).
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
    where p.sfida_id = v_sfida_id and m.uscito_il is null
    on conflict (evento_idempotenza) do nothing;
  end if;
end;
$$;

-- Crea la sfida, il suo snapshot di opzioni/partecipanti, il primo
-- turno e registra subito il voto dell'organizzatore. p_opzioni_scelte
-- contiene id di voci_lista (non di sfide_opzioni: queste ultime non
-- esistono ancora quando il client prepara la chiamata, essendo create
-- da questa stessa funzione) - 3 se non c'è proposta personalizzata, 2
-- se una delle tre è sostituita da p_proposta_personalizzata.
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
language plpgsql security invoker
as $$
declare
  v_gruppo_id uuid;
  v_membro_id uuid;
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
  select id into v_sfida_id from public.sfide_scelta where richiesta_id = p_richiesta_id;
  if found then
    return v_sfida_id; -- idempotenza: nessun doppio lavoro
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

  -- Snapshot: una riga sfide_opzioni per ogni voce della lista
  -- (normalizzazione SQL semplice, sufficiente solo per coerenza con il
  -- vincolo unique - la normalizzazione NFKC completa resta lato
  -- client, vedi src/calcolo/normalizzazioneTesto.ts).
  for rec in select id, testo from public.voci_lista where lista_id = p_lista_id loop
    insert into public.sfide_opzioni (sfida_id, voce_lista_id, testo_opzione, testo_normalizzato, personalizzata)
    values (v_sfida_id, rec.id, rec.testo, lower(trim(regexp_replace(rec.testo, '\s+', ' ', 'g'))), false)
    returning id into v_opzione_id;
    v_opzioni_create := array_append(v_opzioni_create, v_opzione_id);
  end loop;

  select array_agg(id) into v_scelte_da_lista
  from public.sfide_opzioni
  where sfida_id = v_sfida_id and voce_lista_id = any(p_opzioni_scelte);

  if p_proposta_personalizzata is not null then
    insert into public.sfide_opzioni (sfida_id, testo_opzione, testo_normalizzato, personalizzata, proposta_da)
    values (
      v_sfida_id, p_proposta_personalizzata,
      lower(trim(regexp_replace(p_proposta_personalizzata, '\s+', ' ', 'g'))), true, v_membro_id
    )
    on conflict (sfida_id, testo_normalizzato) do update set id = sfide_opzioni.id
    returning id into v_proposta_id;
    v_opzioni_create := array_append(v_opzioni_create, v_proposta_id);
    v_scelte_finali := array_append(v_scelte_da_lista, v_proposta_id);
  else
    v_scelte_finali := v_scelte_da_lista;
  end if;

  v_opzioni_create := array(select distinct unnest(v_opzioni_create));

  -- Snapshot del roster: tutti i membri attivi del gruppo, FISSO da ora
  -- in poi (design doc §9: chi esce dopo non altera questa lista).
  insert into public.sfide_partecipanti (sfida_id, membro_id)
  select v_sfida_id, id from public.membri where gruppo_id = v_gruppo_id and uscito_il is null;

  insert into public.sfide_turni (sfida_id, numero_turno, tipo_turno, stato, opzioni_in_gara, scadenza)
  values (v_sfida_id, 1, 'iniziale', 'in_corso', v_opzioni_create, p_votazione_scade_il)
  returning id into v_turno_id;

  insert into public.sfide_voti (turno_id, membro_id, opzione_id)
  select v_turno_id, v_membro_id, unnest(v_scelte_finali);

  perform public._chiudi_turno_se_completo(v_turno_id);

  insert into public.notifiche (gruppo_id, destinatario_membro_id, tipo, titolo, corpo, sfida_id, evento_idempotenza)
  select v_gruppo_id, p.membro_id, 'sfida_invito', p_titolo,
    'Vota le tue 3 preferite entro la scadenza.', v_sfida_id,
    'sfida:' || v_sfida_id || ':invito:' || p.membro_id
  from public.sfide_partecipanti p
  where p.sfida_id = v_sfida_id and p.membro_id <> v_membro_id
  on conflict (evento_idempotenza) do nothing;

  return v_sfida_id;
end;
$$;

-- Registra il voto (segreto fino alla chiusura) di un partecipante per
-- il turno corrente. Qui p_opzioni_scelte contiene id di sfide_opzioni
-- GIA' esistenti (del pool/opzioni_in_gara del turno), a differenza di
-- crea_sfida.
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
  -- Blocco atomico anti-race (Review Focus): un update no-op prende un
  -- row-lock sulla riga del turno fino a fine transazione, così uno
  -- scadi_turni_sfida concorrente non può chiuderlo a metà di questo
  -- voto, e un voto arrivato anche un istante prima della scadenza
  -- viene comunque registrato per intero prima che l'altra transazione
  -- possa procedere.
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

-- Unica azione esplicita dell'utente dopo un esito terminale senza
-- vincitore ("Riprova la sfida", brief §14) - aperta a qualunque
-- partecipante attivo, non solo l'organizzatore, stesso livello di
-- fiducia già usato altrove in Bento. Non precompila mai le scelte del
-- tentativo precedente.
create or replace function public.ripeti_sfida(p_sfida_id uuid)
returns uuid
language plpgsql security invoker
as $$
declare
  v_gruppo_id uuid;
  v_stato text;
  v_titolo text;
  v_membro_id uuid;
  v_numero_turno integer;
  v_turno_id uuid;
  v_opzioni uuid[];
  v_scadenza timestamptz;
begin
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

  select array_agg(id) into v_opzioni from public.sfide_opzioni where sfida_id = p_sfida_id;
  select max(numero_turno) into v_numero_turno from public.sfide_turni where sfida_id = p_sfida_id;

  -- Nessun parametro di scadenza nella firma: 24 ore, finestra più
  -- ampia del fallback dello spareggio (1 ora) perché un nuovo
  -- tentativo richiede di nuovo 3 scelte ponderate, non 1 sola.
  v_scadenza := now() + interval '24 hours';

  insert into public.sfide_turni (sfida_id, numero_turno, tipo_turno, stato, opzioni_in_gara, scadenza)
  values (p_sfida_id, v_numero_turno + 1, 'nuovo_tentativo', 'in_corso', v_opzioni, v_scadenza)
  returning id into v_turno_id;

  update public.sfide_scelta set stato = 'in_corso', conclusa_il = null where id = p_sfida_id;

  insert into public.notifiche (gruppo_id, destinatario_membro_id, tipo, titolo, corpo, sfida_id, evento_idempotenza)
  select v_gruppo_id, p.membro_id, 'sfida_invito', v_titolo,
    'Si riprova: vota di nuovo le tue 3 preferite.', p_sfida_id,
    'sfida:' || p_sfida_id || ':invito:' || p.membro_id || ':turno:' || (v_numero_turno + 1)
  from public.sfide_partecipanti p
  join public.membri m on m.id = p.membro_id
  where p.sfida_id = p_sfida_id and m.uscito_il is null and p.membro_id <> v_membro_id
  on conflict (evento_idempotenza) do nothing;

  return v_turno_id;
end;
$$;

-- Sincronizzazione lato client (letta a ogni apertura della lista
-- sfide/di una sfida, stesso principio di scadiOccorrenze in Faccende):
-- chiude i turni scaduti e genera i promemoria per chi non ha ancora
-- votato quando resta poco tempo.
create or replace function public.scadi_turni_sfida(p_gruppo_id uuid)
returns void
language plpgsql security invoker
as $$
declare
  rec record;
begin
  if not e_membro_di(p_gruppo_id) then
    raise exception 'Non sei un membro di questo gruppo';
  end if;

  for rec in
    select t.id as turno_id, t.sfida_id, s.titolo
    from public.sfide_turni t
    join public.sfide_scelta s on s.id = t.sfida_id
    where s.gruppo_id = p_gruppo_id and t.stato = 'in_corso' and t.scadenza < now()
  loop
    update public.sfide_turni set stato = 'scaduto_incompleto', concluso_il = now() where id = rec.turno_id;
    update public.sfide_scelta set stato = 'conclusa_scaduta', conclusa_il = now() where id = rec.sfida_id;

    insert into public.notifiche (gruppo_id, destinatario_membro_id, tipo, titolo, corpo, sfida_id, evento_idempotenza)
    select p_gruppo_id, p.membro_id, 'sfida_scaduta', rec.titolo,
      'Il tempo per votare è scaduto senza un accordo.', rec.sfida_id,
      'sfida:' || rec.sfida_id || ':scaduta:' || rec.turno_id || ':' || p.membro_id
    from public.sfide_partecipanti p
    join public.membri m on m.id = p.membro_id
    where p.sfida_id = rec.sfida_id and m.uscito_il is null
    on conflict (evento_idempotenza) do nothing;
  end loop;

  -- Promemoria: al massimo una volta per turno (idempotente
  -- sull'evento_idempotenza), solo sotto il 25% del tempo di voto
  -- originale rimasto, solo a chi non ha ancora votato in quel turno.
  for rec in
    select t.id as turno_id, t.sfida_id, t.iniziato_il, t.scadenza, s.titolo
    from public.sfide_turni t
    join public.sfide_scelta s on s.id = t.sfida_id
    where s.gruppo_id = p_gruppo_id and t.stato = 'in_corso'
      and now() >= t.iniziato_il + (t.scadenza - t.iniziato_il) * 0.75
  loop
    insert into public.notifiche (gruppo_id, destinatario_membro_id, tipo, titolo, corpo, sfida_id, evento_idempotenza)
    select p_gruppo_id, p.membro_id, 'sfida_promemoria', rec.titolo,
      'Il tempo per votare sta per scadere.', rec.sfida_id,
      'sfida:' || rec.sfida_id || ':promemoria:' || rec.turno_id || ':' || p.membro_id
    from public.sfide_partecipanti p
    join public.membri m on m.id = p.membro_id
    where p.sfida_id = rec.sfida_id and m.uscito_il is null
      and not exists (
        select 1 from public.sfide_voti v where v.turno_id = rec.turno_id and v.membro_id = p.membro_id
      )
    on conflict (evento_idempotenza) do nothing;
  end loop;
end;
$$;

-- Solo l'organizzatore può annullare, e solo mentre il turno corrente è
-- ancora in corso - unica eccezione esplicita al "nessun ruolo admin"
-- di questo progetto, perché annullare è un'azione distruttiva verso
-- gli altri partecipanti (design doc §6).
create or replace function public.annulla_sfida(p_sfida_id uuid)
returns void
language plpgsql security invoker
as $$
declare
  v_creata_da uuid;
  v_stato text;
  v_gruppo_id uuid;
  v_membro_id uuid;
begin
  select creata_da, stato, gruppo_id into v_creata_da, v_stato, v_gruppo_id
  from public.sfide_scelta where id = p_sfida_id;
  if not found then
    raise exception 'Sfida non trovata';
  end if;

  select id into v_membro_id
  from public.membri
  where gruppo_id = v_gruppo_id and utente_id = auth.uid() and uscito_il is null;

  if v_membro_id is null or v_membro_id <> v_creata_da then
    raise exception 'Solo chi ha creato la sfida può annullarla';
  end if;

  if v_stato <> 'in_corso' then
    raise exception 'Questa sfida non è più annullabile';
  end if;

  update public.sfide_scelta set stato = 'annullata', conclusa_il = now() where id = p_sfida_id;
end;
$$;
