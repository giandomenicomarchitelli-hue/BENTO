-- Ridisegna le notifiche push: attivarle è un'azione GLOBALE (un
-- device/browser si registra una sola volta, da Impostazioni in Home),
-- non un'azione per-gruppo. Prima push_subscriptions era legata a
-- membri.id - un id DIVERSO per ogni gruppo di cui si fa parte - quindi
-- attivarle nel gruppo B riassegnava silenziosamente la sottoscrizione
-- già fatta per il gruppo A (endpoint è univoco per device: un browser
-- poteva ricevere le notifiche di un solo gruppo alla volta). Ora è
-- legata a utente_id (univoco per persona): riceve le notifiche di TUTTI
-- i gruppi di cui fa parte, a meno di silenziare singolarmente un gruppo
-- con membri.notifiche_silenziate (impostazioni del singolo gruppo).

alter table public.membri add column notifiche_silenziate boolean not null default false;

alter table public.push_subscriptions drop constraint push_subscriptions_membro_id_fkey;
alter table public.push_subscriptions rename column membro_id to utente_id;
alter table public.push_subscriptions
  add constraint push_subscriptions_utente_id_fkey
  foreign key (utente_id) references auth.users (id) on delete cascade;

drop policy push_subscriptions_select on public.push_subscriptions;
drop policy push_subscriptions_insert on public.push_subscriptions;
drop policy push_subscriptions_update on public.push_subscriptions;
drop policy push_subscriptions_delete on public.push_subscriptions;

create policy push_subscriptions_select on public.push_subscriptions for select
  using (utente_id = auth.uid());
create policy push_subscriptions_insert on public.push_subscriptions for insert
  with check (utente_id = auth.uid());
create policy push_subscriptions_update on public.push_subscriptions for update
  using (utente_id = auth.uid()) with check (utente_id = auth.uid());
create policy push_subscriptions_delete on public.push_subscriptions for delete
  using (utente_id = auth.uid());

-- Risolve destinatario_membro_id -> utente_id e si ferma subito se quel
-- gruppo è silenziato per questa persona (nessuna chiamata alla Edge
-- Function, non solo nessun invio: evita anche di sprecare la chiamata).
create or replace function public._invia_notifica_push()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_utente_id uuid;
  v_silenziate boolean;
begin
  select utente_id, notifiche_silenziate into v_utente_id, v_silenziate
  from public.membri where id = new.destinatario_membro_id;

  if v_utente_id is null or v_silenziate then
    return new;
  end if;

  perform net.http_post(
    url := 'https://iajucwiivgjguyowywwb.supabase.co/functions/v1/invia-push-notifica',
    body := jsonb_build_object(
      'notifica_id', new.id,
      'utente_id', v_utente_id,
      'titolo', new.titolo,
      'corpo', new.corpo,
      'sfida_id', new.sfida_id
    ),
    headers := jsonb_build_object('Content-Type', 'application/json')
  );
  return new;
end;
$$;
