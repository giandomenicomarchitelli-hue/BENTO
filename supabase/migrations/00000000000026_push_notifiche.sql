-- Notifiche push (Web Push/VAPID) per i membri che hanno concesso il
-- permesso dal browser. Riusa la tabella notifiche esistente come unica
-- fonte degli eventi: un trigger AFTER INSERT chiama l'Edge Function
-- invia-push-notifica via pg_net, passando i campi già pubblici della
-- riga appena creata - nessuna lettura aggiuntiva, nessun dato nuovo.
--
-- L'Edge Function è deployata con --no-verify-jwt: una chiamata da
-- trigger Postgres non porta un JWT utente, e generare/validare un JWT
-- di servizio qui richiederebbe un segreto aggiuntivo da distribuire
-- (rischio di finire in un file di migration versionato). Rischio
-- residuo accettato: la funzione invia solo contenuto già presente nel
-- payload del trigger stesso (mai letto da altre tabelle, mai scritto
-- nulla), quindi un URL scoperto permette al più di re-inviare una push
-- già generata per un notifica_id noto, non di inventarne il contenuto.

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  membro_id uuid not null references public.membri (id) on delete cascade,
  -- Un endpoint è univoco per dispositivo/browser: se un'altra persona
  -- accede sullo stesso browser, l'upsert su questo vincolo riassegna la
  -- sottoscrizione a lei invece di fallire.
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  creato_il timestamptz not null default now()
);
create index idx_push_subscriptions_membro on public.push_subscriptions (membro_id);

alter table public.push_subscriptions enable row level security;

create policy push_subscriptions_select on public.push_subscriptions for select
  using (membro_id = (select id from public.membri where utente_id = auth.uid()));
create policy push_subscriptions_insert on public.push_subscriptions for insert
  with check (membro_id = (select id from public.membri where utente_id = auth.uid()));
create policy push_subscriptions_update on public.push_subscriptions for update
  using (membro_id = (select id from public.membri where utente_id = auth.uid()))
  with check (membro_id = (select id from public.membri where utente_id = auth.uid()));
create policy push_subscriptions_delete on public.push_subscriptions for delete
  using (membro_id = (select id from public.membri where utente_id = auth.uid()));

grant select, insert, update, delete on public.push_subscriptions to authenticated;

create extension if not exists pg_net;

create or replace function public._invia_notifica_push()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://iajucwiivgjguyowywwb.supabase.co/functions/v1/invia-push-notifica',
    body := jsonb_build_object(
      'notifica_id', new.id,
      'membro_id', new.destinatario_membro_id,
      'titolo', new.titolo,
      'corpo', new.corpo,
      'sfida_id', new.sfida_id
    ),
    headers := jsonb_build_object('Content-Type', 'application/json')
  );
  return new;
end;
$$;

create trigger trg_notifiche_invia_push
after insert on public.notifiche
for each row execute function public._invia_notifica_push();
