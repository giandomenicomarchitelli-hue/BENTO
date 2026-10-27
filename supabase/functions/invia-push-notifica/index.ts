// Invocata dal trigger public._invia_notifica_push() (vedi migration
// 00000000000026) a ogni riga inserita in public.notifiche. Deployata con
// --no-verify-jwt: il trigger Postgres non porta un JWT utente (vedi
// commento in quella migration per il perché e il rischio residuo
// accettato). Usa SUPABASE_SERVICE_ROLE_KEY (iniettata automaticamente da
// Supabase in ogni Edge Function) per leggere le sottoscrizioni push di
// QUALSIASI membro - necessario perché qui non c'è un utente autenticato
// di cui rispettare la RLS, il trigger ha già fatto le sue verifiche.

import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3';

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') as string,
  Deno.env.get('VAPID_PUBLIC_KEY') as string,
  Deno.env.get('VAPID_PRIVATE_KEY') as string
);

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') as string,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
);

interface Payload {
  notifica_id: string;
  membro_id: string;
  titolo: string;
  corpo: string;
  sfida_id: string | null;
}

Deno.serve(async (req) => {
  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return new Response('body non valido', { status: 400 });
  }
  if (payload.membro_id === undefined || payload.titolo === undefined) {
    return new Response('campi mancanti', { status: 400 });
  }

  const { data: sottoscrizioni, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('membro_id', payload.membro_id);

  if (error) {
    return new Response(error.message, { status: 500 });
  }

  const urlDestinazione = payload.sfida_id !== null ? `/sfide/${payload.sfida_id}` : '/notifiche';

  await Promise.all(
    (sottoscrizioni ?? []).map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify({ title: payload.titolo, body: payload.corpo, url: urlDestinazione })
        );
      } catch (err) {
        // 404/410 = sottoscrizione non più valida (browser disinstallato,
        // permesso revocato, ecc.): la rimuoviamo invece di ritentare
        // all'infinito a ogni futura notifica.
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        }
      }
    })
  );

  return new Response(JSON.stringify({ inviate: sottoscrizioni?.length ?? 0 }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
