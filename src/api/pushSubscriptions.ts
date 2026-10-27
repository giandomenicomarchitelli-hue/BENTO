import { supabase } from '@/lib/supabase';

/**
 * Salva/aggiorna la sottoscrizione push del browser per questo utente
 * (upsert su endpoint). Legata a utente_id, non a un membro di un gruppo
 * specifico: un device si registra una sola volta e riceve le notifiche
 * di tutti i gruppi (a meno di silenziarne uno dalle sue impostazioni).
 */
export async function salvaSottoscrizionePush(params: {
  utenteId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<void> {
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      { utente_id: params.utenteId, endpoint: params.endpoint, p256dh: params.p256dh, auth: params.auth },
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
