-- RPC del modulo Faccende: le uniche operazioni che devono essere atomiche
-- e/o non fidarsi di id forniti dal client per l'identità di chi agisce.
-- Tutte "security invoker": rispettano le RLS del chiamante, l'esecutore
-- si ricava sempre da auth.uid(), mai da un parametro.

-- Completa un'occorrenza: UPDATE ... WHERE stato = 'da_fare' è atomico in
-- Postgres (lock di riga implicito), quindi due richieste concorrenti sulla
-- stessa occorrenza non possono entrambe avere successo - la seconda trova
-- zero righe aggiornate e fallisce con un errore leggibile. Questo è ciò che
-- impedisce che due membri ricevano punti per la stessa occorrenza.
create or replace function public.completa_occorrenza(p_occorrenza_id uuid)
returns void
language plpgsql security invoker
as $$
declare
  v_gruppo_id uuid;
  v_membro_id uuid;
  v_punti integer;
begin
  select gruppo_id into v_gruppo_id
  from public.occorrenze_faccende
  where id = p_occorrenza_id;

  if not found then
    raise exception 'Occorrenza non trovata';
  end if;

  select id into v_membro_id
  from public.membri
  where gruppo_id = v_gruppo_id and utente_id = auth.uid() and uscito_il is null;

  if v_membro_id is null then
    raise exception 'Non sei un membro attivo di questo gruppo';
  end if;

  update public.occorrenze_faccende
  set stato = 'completata', completata_da = v_membro_id, completata_il = now()
  where id = p_occorrenza_id and stato = 'da_fare' and scadenza >= now()
  returning punti_previsti into v_punti;

  if not found then
    raise exception 'Questa attività non è più completabile (già completata o scaduta)';
  end if;

  insert into public.storico_faccende (occorrenza_id, gruppo_id, tipo_evento, membro_id, punti)
  values (p_occorrenza_id, v_gruppo_id, 'completata', v_membro_id, v_punti);
end;
$$;

-- Annulla un completamento errato: riporta l'occorrenza a "da_fare" (così
-- torna completabile) e registra un evento storico di segno opposto, che
-- azzera il contributo alla classifica senza toccare/cancellare l'evento
-- di completamento originale (storico immutabile). Qualsiasi membro attivo
-- del gruppo può farlo - stesso livello di fiducia già usato per
-- articoli_spesa/voci_lista (nessun ruolo "admin" in questo progetto).
create or replace function public.annulla_completamento_occorrenza(p_occorrenza_id uuid)
returns void
language plpgsql security invoker
as $$
declare
  v_gruppo_id uuid;
  v_membro_id uuid;
  v_punti integer;
begin
  select gruppo_id into v_gruppo_id
  from public.occorrenze_faccende
  where id = p_occorrenza_id;

  if not found then
    raise exception 'Occorrenza non trovata';
  end if;

  select id into v_membro_id
  from public.membri
  where gruppo_id = v_gruppo_id and utente_id = auth.uid() and uscito_il is null;

  if v_membro_id is null then
    raise exception 'Non sei un membro attivo di questo gruppo';
  end if;

  update public.occorrenze_faccende
  set stato = 'da_fare', completata_da = null, completata_il = null
  where id = p_occorrenza_id and stato = 'completata'
  returning punti_previsti into v_punti;

  if not found then
    raise exception 'Questa attività non risulta completata';
  end if;

  insert into public.storico_faccende (occorrenza_id, gruppo_id, tipo_evento, membro_id, punti)
  values (p_occorrenza_id, v_gruppo_id, 'annullata', v_membro_id, -v_punti);
end;
$$;

-- Importa il catalogo di faccende suggerite nel gruppo, evitando duplicati
-- per nome ad ogni richiesta ripetuta. I punti sono precalcolati con la
-- stessa formula di src/calcolo/puntiFaccende.ts (vedi commento lì) - valori
-- di partenza modificabili liberamente dopo l'importazione, non legati a
-- un'origine "AI": origine_punteggio resta 'stima_automatica'.
create or replace function public.importa_faccende_suggerite(p_gruppo_id uuid)
returns integer
language plpgsql security invoker
as $$
declare
  v_membro_id uuid;
  v_inserite integer;
begin
  if not e_membro_di(p_gruppo_id) then
    raise exception 'Non sei un membro di questo gruppo';
  end if;

  select id into v_membro_id
  from public.membri
  where gruppo_id = p_gruppo_id and utente_id = auth.uid() and uscito_il is null;

  with catalogo (nome, descrizione, frequenza, parametri_ricorrenza, durata_stimata_minuti, sforzo, punti) as (
    values
      ('Rifare il letto', null::text, 'giornaliera', '{}'::jsonb, 5, 'basso', 3),
      ('Lavare i piatti', null::text, 'giornaliera', '{}'::jsonb, 15, 'medio', 9),
      ('Buttare la spazzatura', null::text, 'giornaliera', '{}'::jsonb, 10, 'basso', 5),
      ('Cambiare le lenzuola', null::text, 'settimanale', '{"giorno_settimana": 7}'::jsonb, 20, 'medio', 12),
      ('Fare il bucato', null::text, 'settimanale', '{"giorno_settimana": 3}'::jsonb, 30, 'medio', 17),
      ('Passare l''aspirapolvere', null::text, 'settimanale', '{"giorno_settimana": 6}'::jsonb, 30, 'medio', 17),
      ('Pulire il bagno', null::text, 'settimanale', '{"giorno_settimana": 6}'::jsonb, 45, 'alto', 29),
      ('Pulire il frigorifero', null::text, 'mensile', '{"giorno_mese": 1}'::jsonb, 60, 'alto', 39),
      ('Pulire i vetri', null::text, 'mensile', '{"giorno_mese": 15}'::jsonb, 75, 'alto', 49)
  )
  insert into public.faccende (
    gruppo_id, nome, descrizione, frequenza, parametri_ricorrenza,
    durata_stimata_minuti, sforzo, punti, origine_punteggio, creato_da
  )
  select
    p_gruppo_id, c.nome, c.descrizione, c.frequenza, c.parametri_ricorrenza,
    c.durata_stimata_minuti, c.sforzo, c.punti, 'stima_automatica', v_membro_id
  from catalogo c
  where not exists (
    select 1 from public.faccende f
    where f.gruppo_id = p_gruppo_id and f.nome = c.nome
  );

  get diagnostics v_inserite = row_count;
  return v_inserite;
end;
$$;
