-- Notifiche automatiche per le azioni nei gruppi: finora solo le sfide e i
-- promemoria impegni generavano notifiche. Un trigger per ciascuna azione
-- (aggiungere un articolo alla spesa, comprarlo, creare una lista,
-- aggiungere una voce, creare un impegno) inserisce una notifica per ogni
-- altro membro attivo del gruppo - non per chi ha fatto l'azione. Trigger
-- nel database invece che nel codice client: funziona per qualsiasi punto
-- dell'app tocchi quelle tabelle, senza doverlo ripetere in ogni mutation.
-- Il trigger generico trg_notifiche_invia_push (gia' esistente) si attiva
-- da solo su qualsiasi insert in notifiche, quindi la push parte senza
-- altro codice.

alter table public.notifiche drop constraint notifiche_tipo_check;
alter table public.notifiche add constraint notifiche_tipo_check check (tipo in (
  'sfida_invito', 'sfida_promemoria', 'sfida_tutti_votato',
  'sfida_spareggio', 'sfida_vincitore', 'sfida_senza_accordo', 'sfida_scaduta', 'sfida_rifiutata',
  'impegno_promemoria', 'impegno_creato',
  'articolo_spesa_aggiunto', 'articolo_spesa_comprato',
  'lista_creata', 'lista_voce_aggiunta'
));

create or replace function public._notifica_articolo_spesa_aggiunto()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_nome text;
begin
  if new.creato_da is null then
    return new;
  end if;

  select nome into v_nome from public.membri where id = new.creato_da;

  insert into public.notifiche (gruppo_id, destinatario_membro_id, tipo, titolo, evento_idempotenza)
  select new.gruppo_id, m.id, 'articolo_spesa_aggiunto',
    v_nome || ' ha aggiunto "' || new.nome || '" alla lista della spesa',
    'articolo_spesa_aggiunto:' || new.id || ':' || m.id
  from public.membri m
  where m.gruppo_id = new.gruppo_id and m.uscito_il is null and m.id <> new.creato_da
  on conflict (evento_idempotenza) do nothing;

  return new;
end;
$$;

create trigger trg_notifica_articolo_spesa_aggiunto
after insert on public.articoli_spesa
for each row execute function public._notifica_articolo_spesa_aggiunto();

-- Solo la transizione da_comprare -> comprato notifica, non ogni update
-- successivo (es. aggiungere un prezzo o una nota dopo l'acquisto).
create or replace function public._notifica_articolo_spesa_comprato()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_nome text;
begin
  if new.stato <> 'comprato' or old.stato = 'comprato' or new.comprato_da is null then
    return new;
  end if;

  select nome into v_nome from public.membri where id = new.comprato_da;

  insert into public.notifiche (gruppo_id, destinatario_membro_id, tipo, titolo, evento_idempotenza)
  select new.gruppo_id, m.id, 'articolo_spesa_comprato',
    v_nome || ' ha comprato "' || new.nome || '"',
    'articolo_spesa_comprato:' || new.id || ':' || m.id
  from public.membri m
  where m.gruppo_id = new.gruppo_id and m.uscito_il is null and m.id <> new.comprato_da
  on conflict (evento_idempotenza) do nothing;

  return new;
end;
$$;

create trigger trg_notifica_articolo_spesa_comprato
after update on public.articoli_spesa
for each row execute function public._notifica_articolo_spesa_comprato();

create or replace function public._notifica_lista_creata()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_nome text;
begin
  if new.creato_da is null then
    return new;
  end if;

  select nome into v_nome from public.membri where id = new.creato_da;

  insert into public.notifiche (gruppo_id, destinatario_membro_id, tipo, titolo, evento_idempotenza)
  select new.gruppo_id, m.id, 'lista_creata',
    v_nome || ' ha creato la lista "' || new.nome || '"',
    'lista_creata:' || new.id || ':' || m.id
  from public.membri m
  where m.gruppo_id = new.gruppo_id and m.uscito_il is null and m.id <> new.creato_da
  on conflict (evento_idempotenza) do nothing;

  return new;
end;
$$;

create trigger trg_notifica_lista_creata
after insert on public.liste
for each row execute function public._notifica_lista_creata();

-- voci_lista non ha gruppo_id diretto: va risolto tramite la lista.
create or replace function public._notifica_lista_voce_aggiunta()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_nome text;
  v_gruppo_id uuid;
  v_nome_lista text;
begin
  if new.creato_da is null then
    return new;
  end if;

  select gruppo_id, nome into v_gruppo_id, v_nome_lista from public.liste where id = new.lista_id;
  select nome into v_nome from public.membri where id = new.creato_da;

  insert into public.notifiche (gruppo_id, destinatario_membro_id, tipo, titolo, evento_idempotenza)
  select v_gruppo_id, m.id, 'lista_voce_aggiunta',
    v_nome || ' ha aggiunto "' || new.testo || '" a ' || v_nome_lista,
    'lista_voce_aggiunta:' || new.id || ':' || m.id
  from public.membri m
  where m.gruppo_id = v_gruppo_id and m.uscito_il is null and m.id <> new.creato_da
  on conflict (evento_idempotenza) do nothing;

  return new;
end;
$$;

create trigger trg_notifica_lista_voce_aggiunta
after insert on public.voci_lista
for each row execute function public._notifica_lista_voce_aggiunta();

create or replace function public._notifica_impegno_creato()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_nome text;
begin
  if new.creato_da is null then
    return new;
  end if;

  select nome into v_nome from public.membri where id = new.creato_da;

  insert into public.notifiche (gruppo_id, destinatario_membro_id, tipo, titolo, impegno_id, evento_idempotenza)
  select new.gruppo_id, m.id, 'impegno_creato',
    v_nome || ' ha aggiunto l''impegno "' || new.titolo || '"',
    new.id,
    'impegno_creato:' || new.id || ':' || m.id
  from public.membri m
  where m.gruppo_id = new.gruppo_id and m.uscito_il is null and m.id <> new.creato_da
  on conflict (evento_idempotenza) do nothing;

  return new;
end;
$$;

create trigger trg_notifica_impegno_creato
after insert on public.impegni
for each row execute function public._notifica_impegno_creato();
