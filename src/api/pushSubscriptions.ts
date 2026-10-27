import { supabase } from '@/lib/supabase';

/** Salva/aggiorna la sottoscrizione push del browser per questo membro (upsert su endpoint). */
export async function salvaSottoscrizionePush(params: {
  membroId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<void> {
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      { membro_id: params.membroId, endpoint: params.endpoint, p256dh: params.p256dh, auth: params.auth },
      { onConflict: 'endpoint' }
    );

  if (error) {
    throw error;
  }
}

export async function rimuoviSottoscrizionePush(endpoint: string): Promise<void> {
  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
  if (error) {
    throw error;
  }
}
