import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

export type Membro = Database['public']['Tables']['membri']['Row'];

export async function listaMembri(gruppoId: string): Promise<Membro[]> {
  const { data, error } = await supabase
    .from('membri')
    .select()
    .eq('gruppo_id', gruppoId)
    .order('creato_il', { ascending: true });

  if (error) {
    throw error;
  }
  return data;
}

/** Adesione a un gruppo esistente tramite codice invito. */
export async function entraInGruppo(codiceInvito: string, nome: string): Promise<string> {
  const { data, error } = await supabase.rpc('unisciti_a_gruppo', {
    p_codice_invito: codiceInvito,
    p_nome: nome,
  });

  if (error) {
    throw error;
  }
  return data;
}

/** Esce da un gruppo (elimina la propria riga membro). */
export async function esciDalGruppo(membroId: string): Promise<void> {
  const { error } = await supabase.from('membri').delete().eq('id', membroId);
  if (error) {
    throw error;
  }
}
