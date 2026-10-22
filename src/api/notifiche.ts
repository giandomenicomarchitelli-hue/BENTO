import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

export type Notifica = Database['public']['Tables']['notifiche']['Row'];

/** RLS limita già alle sole notifiche proprie. */
export async function listaNotifiche(gruppoId: string): Promise<Notifica[]> {
  const { data, error } = await supabase
    .from('notifiche')
    .select()
    .eq('gruppo_id', gruppoId)
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
