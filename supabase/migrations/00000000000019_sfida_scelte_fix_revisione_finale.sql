-- Correzioni dalla revisione finale di tutto il branch (code-reviewer
-- fresco, dopo i 18 task). Tre difetti critici correlati, risolti con un
-- unico cambio coerente invece di tre separati (cosi' li ha inquadrati
-- anche la revisione):
--
-- 1. _chiudi_turno_se_completo era "security invoker": contava i voti
--    leggendo sfide_voti, ma sfide_voti_select limita QUALUNQUE lettore
--    alle proprie sole righe (vedi 00000000000018). Un invoker non e'
--    l'owner della tabella e non ha BYPASSRLS, quindi "quanti hanno
--    votato" era sempre 1 (il proprio voto appena inserito): nessun
--    turno si chiudeva mai, l'intero motore vincitore/spareggio era
--    irraggiungibile.
-- 2. Il vincolo "scritte SOLO dalle RPC" per sfide_scelta/sfide_voti/
--    sfide_opzioni/sfide_turni/sfide_turno_risultati/notifiche era solo
--    un commento: i GRANT+policy di 00000000000015/16 permettevano a
--    QUALUNQUE membro di scrivere quelle tabelle direttamente via
--    PostgREST, bypassando interamente conferma_voti/crea_sfida (3 o 1
--    voti esatti, scadenza, "gia' votato", opzioni_in_gara) - un membro
--    poteva imporre il vincitore a mano.
-- 3. scadi_turni_sfida aveva la stessa cecita' di (1) in un punto
--    diverso: il suo UPDATE di chiusura non riverificava stato='in_corso',
--    quindi una race con conferma_voti poteva sovrascrivere un esito
--    gia' deciso con "scaduta".
--
-- Fix: le 5 RPC pubbliche + la funzione privata diventano "security
-- definer set search_path = public" (stesso pattern gia' usato in questo
-- progetto da unisciti_a_gruppo, 00000000000003) - l'identita' resta
-- SEMPRE derivata da auth.uid() dentro il corpo della funzione, mai da
-- un parametro: la security definer qui serve a bypassare la RLS
-- riga-per-riga per fare il lavoro che l'invoker non puo' fare
-- (contare voti altrui, scrivere l'esito), non a fidarsi di un
-- chiamante non verificato. I GRANT/policy di scrittura diretta
-- vengono rimossi: la tabella torna scrivibile solo dalle RPC, come
-- l'intento originale del design doc diceva ma non era applicato.
--
-- Insieme, in questa stessa migration: _chiudi_turno_se_completo non
-- riapre mai un turno gia' chiuso (nuova guardia, oltre a non essere
-- piu' eseguibile dal client), conta solo i voti di partecipanti ancora
-- attivi (prima contava anche i voti di chi e' uscito, potendo chiudere
-- un turno senza aver atteso un partecipante ancora presente),
-- scadi_turni_sfida riverifica stato='in_corso' al momento dell'update,
-- annulla_sfida chiude anche il turno corrente (altrimenti si poteva
-- continuare a votare su una sfida annullata), crea_sfida non fallisce
-- piu' con un vincolo violato quando la lista contiene due voci che si
-- normalizzano allo stesso testo, e le opzioni personalizzate portano
-- ora il turno in cui sono state proposte (turno_proposto_id) cosi' la
-- loro visibilita' si sblocca quando QUEL turno si conclude, non
-- quando un turno qualsiasi della sfida lo fa (altrimenti un nuovo
-- tentativo apriva in anticipo le proposte del tentativo precedente).
-- In fondo al file, un'ultima correzione indipendente: lista_id non e'
-- piu' "on delete cascade" ma "on delete restrict", cosi' eliminare una
-- lista (azione libera per ogni membro) non fa piu' sparire in silenzio
-- lo storico di ogni sfida nata da quella lista.

alter table public.sfide_opzioni add column turno_proposto_id uuid references public.sfide_turni (id) on delete set null;

revoke insert, update on public.sfide_scelta from authenticated;
revoke insert on public.sfide_partecipanti from authenticated;
revoke insert, update on public.sfide_opzioni from authenticated;
revoke insert, update on public.sfide_turni from authenticated;
revoke insert on public.sfide_turno_risultati from authenticated;
revoke insert on public.sfide_voti from authenticated;
revoke insert on public.notifiche from authenticated;

drop policy sfide_scelta_insert on public.sfide_scelta;
drop policy sfide_scelta_update on public.sfide_scelta;
drop policy sfide_partecipanti_insert on public.sfide_partecipanti;
drop policy sfide_opzioni_insert on public.sfide_opzioni;
drop policy sfide_opzioni_update on public.sfide_opzioni;
drop policy sfide_turni_insert on public.sfide_turni;
drop policy sfide_turni_update on public.sfide_turni;
drop policy sfide_turno_risultati_insert on public.sfide_turno_risultati;
drop policy sfide_voti_insert on public.sfide_voti;
drop policy notifiche_insert on public.notifiche;

-- La regola di visibilita' di una proposta personalizzata guarda ora al
-- turno in cui E' STATA PROPOSTA (turno_proposto_id), non a "un turno
-- qualsiasi della sfida e' concluso": altrimenti, dal secondo turno in
-- poi (es. un nuovo_tentativo dopo un turno 1 gia' concluso), una
-- proposta fatta ORA diventava visibile a tutti ISTANTEMENTE, perche'
-- il turno 1 risultava gia' concluso - rivelando una delle 3 scelte di
-- chi la propone mentre il turno in cui conta e' ancora in corso.
drop policy sfide_opzioni_select on public.sfide_opzioni;
create policy sfide_opzioni_select on public.sfide_opzioni for select
  using (
    exists (select 1 from public.sfide_scelta s where s.id = sfide_opzioni.sfida_id and e_membro_di(s.gruppo_id))
    and (
      not personalizzata
      or proposta_da = (
        select m.id from public.membri m
        join public.sfide_scelta s2 on s2.gruppo_id = m.gruppo_id
        where s2.id = sfide_opzioni.sfida_id and m.utente_id = auth.uid()
      )
      or exists (
        select 1 from public.sfide_turni t
        where t.id = sfide_opzioni.turno_proposto_id and t.stato <> 'in_corso'
      )
    )
  );

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

  -- Non chiamabile direttamente dal client (nessun grant execute ad
  -- authenticated, vedi fondo file): solo conferma_voti/crea_sfida, che
  -- la possiedono, la richiamano con perform. Questa guardia resta
  -- comunque una seconda rete di sicurezza contro una doppia chiusura
  -- concorrente dello stesso turno.
  if v_turno_stato is distinct from 'in_corso' then
    return;
  end if;

  -- Conta solo i voti di partecipanti ANCORA ATTIVI (come v_attesi):
  -- prima contava anche i voti di chi e' uscito dal gruppo nel
  -- frattempo, potendo chiudere un turno anche se un partecipante
  -- ancora presente non aveva finito di votare.
  select count(*) into v_attesi
  from public.sfide_partecipanti p
  join public.membri m on m.id = p.membro_id
  where p.sfida_id = v_sfida_id and m.uscito_il is null;

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
      where p.sfida_id = v_sfida_id and m.uscito_il is null
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
      where p.sfida_id = v_sfida_id and m.uscito_il is null
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

revoke all on function public._chiudi_turno_se_completo(uuid) from public, authenticated;

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

  -- "on conflict ... do update set id = id" invece di un insert semplice:
  -- due voci della stessa lista che si normalizzano allo stesso testo
  -- (es. "Sushi" e "sushi") non devono far fallire la creazione con un
  -- vincolo violato - collassano nella stessa riga sfide_opzioni, che
  -- RETURNING restituisce comunque (a differenza di "do nothing").
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

  -- La proposta personalizzata (se c'è) è stata creata PRIMA che questo
  -- turno esistesse: ora che il suo id esiste, lo registriamo come il
  -- turno in cui è stata proposta (serve alla regola di visibilità RLS).
  if p_proposta_personalizzata is not null then
    update public.sfide_opzioni set turno_proposto_id = v_turno_id
    where id = v_proposta_id and turno_proposto_id is null;
  end if;

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

  select array_agg(id) into v_opzioni from public.sfide_opzioni where sfida_id = p_sfida_id;
  select max(numero_turno) into v_numero_turno from public.sfide_turni where sfida_id = p_sfida_id;

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

create or replace function public.scadi_turni_sfida(p_gruppo_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  rec record;
begin
  if auth.uid() is null then
    raise exception 'Devi essere autenticato';
  end if;
  if not e_membro_di(p_gruppo_id) then
    raise exception 'Non sei un membro di questo gruppo';
  end if;

  for rec in
    select t.id as turno_id, t.sfida_id, s.titolo
    from public.sfide_turni t
    join public.sfide_scelta s on s.id = t.sfida_id
    where s.gruppo_id = p_gruppo_id and t.stato = 'in_corso' and t.scadenza < now()
  loop
    -- Riverifica stato = 'in_corso' qui, non solo nella select del
    -- cursore sopra: senza questa seconda verifica, una race con
    -- conferma_voti (che chiude il turno con un esito reale un istante
    -- dopo che questo cursore l'ha selezionato come "scaduto") potrebbe
    -- sovrascrivere un vincitore già deciso con "scaduta".
    update public.sfide_turni set stato = 'scaduto_incompleto', concluso_il = now()
    where id = rec.turno_id and stato = 'in_corso';

    if found then
      update public.sfide_scelta set stato = 'conclusa_scaduta', conclusa_il = now()
      where id = rec.sfida_id and stato = 'in_corso';

      insert into public.notifiche (gruppo_id, destinatario_membro_id, tipo, titolo, corpo, sfida_id, evento_idempotenza)
      select p_gruppo_id, p.membro_id, 'sfida_scaduta', rec.titolo,
        'Il tempo per votare è scaduto senza un accordo.', rec.sfida_id,
        'sfida:' || rec.sfida_id || ':scaduta:' || rec.turno_id || ':' || p.membro_id
      from public.sfide_partecipanti p
      join public.membri m on m.id = p.membro_id
      where p.sfida_id = rec.sfida_id and m.uscito_il is null
      on conflict (evento_idempotenza) do nothing;
    end if;
  end loop;

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

create or replace function public.annulla_sfida(p_sfida_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_creata_da uuid;
  v_stato text;
  v_gruppo_id uuid;
  v_membro_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Devi essere autenticato';
  end if;

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

  -- Senza chiudere anche il turno corrente, conferma_voti continuava ad
  -- accettare voti su una sfida già annullata (non controlla mai
  -- sfide_scelta.stato, solo sfide_turni.stato) - e se qualcuno votava
  -- comunque, _chiudi_turno_se_completo poteva disfare l'annullamento
  -- scrivendo un vincitore sopra.
  update public.sfide_turni set stato = 'scaduto_incompleto', concluso_il = now()
  where sfida_id = p_sfida_id and stato = 'in_corso';
end;
$$;

-- "on delete cascade" su lista_id (00000000000015) permetteva a
-- chiunque elimini una lista (liste_tutti consente il delete a ogni
-- membro) di far sparire silenziosamente ogni sfida, turno, voto e
-- risultato nati da quella lista - contro "storico completo" del design
-- doc e il commento della stessa 00000000000015 ("storico immutabile,
-- mai una cancellazione"). "restrict" invece blocca la cancellazione
-- della lista con un errore leggibile finché esistono sfide collegate.
alter table public.sfide_scelta drop constraint sfide_scelta_lista_id_fkey;
alter table public.sfide_scelta
  add constraint sfide_scelta_lista_id_fkey
  foreign key (lista_id) references public.liste (id) on delete restrict;
