alter table public.notifiche add column impegno_id uuid references public.impegni (id) on delete cascade;

alter table public.notifiche drop constraint notifiche_tipo_check;
alter table public.notifiche add constraint notifiche_tipo_check check (tipo in (
  'sfida_invito', 'sfida_promemoria', 'sfida_tutti_votato',
  'sfida_spareggio', 'sfida_vincitore', 'sfida_senza_accordo', 'sfida_scaduta',
  'impegno_promemoria'
));

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
      'sfida_id', new.sfida_id,
      'impegno_id', new.impegno_id
    ),
    headers := jsonb_build_object('Content-Type', 'application/json')
  );
  return new;
end;
$$;
