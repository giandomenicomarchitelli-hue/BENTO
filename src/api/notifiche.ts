import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

export type Notifica = Database['public']['Tables']['notifiche']['Row'] & {
  gruppi: { nome: string } | null;
};

/**
 * Tutte le notifiche dell'utente, su TUTTI i suoi gruppi (non solo quello
 * attualmente aperto - vedi conversazione sul campanello che rimandava a
 * "I miei gruppi" quando nessun gruppo era ancora stato aperto in
 * sessione). Nessun filtro per gruppo_id: la RLS di notifiche_select
 * (migration 00000000000018) è già scoped correttamente per riga -
 * restituisce solo le notifiche dei gruppi di cui si fa parte,
 * qualunque essi siano. Include il nome del gruppo per distinguerle in
 * un elenco che ora le mescola tutte insieme.
 */
export async function listaNotificheUtente(): Promise<Notifica[]> {
  const { data, error } = await supabase
    .from('notifiche')
    .select('*, gruppi(nome)')
    .order('creata_il', { ascending: false });

  if (error) {
    throw error;
  }
  return data;
}

export async function segnaNotificaLetta(notificaId: string): Promise<void> {
  const { error } = await supabase
    .from('notifiche')
    .update({ letta_il: new Date().toISOString() })
    .eq('id', notificaId);

  if (error) {
    throw error;
  }
}
