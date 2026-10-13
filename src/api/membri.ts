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

/**
 * Adesione a un gruppo esistente tramite codice invito, col nome fisso del
 * proprio profilo (richiede che il profilo esista già).
 */
export async function entraInGruppo(codiceInvito: string): Promise<string> {
  const { data, error } = await supabase.rpc('unisciti_a_gruppo', {
    p_codice_invito: codiceInvito,
  });

  if (error) {
    throw error;
  }
  return data;
}

/**
 * Esce da un gruppo. Non cancella la riga membro (le spese passate la
 * referenziano con on delete restrict, per proteggere lo storico): la
 * marca come uscita, cosi' il nome resta leggibile nelle spese vecchie ma
 * perde l'accesso al gruppo.
 */
export async function esciDalGruppo(membroId: string): Promise<void> {
  const { error } = await supabase
    .from('membri')
    .update({ uscito_il: new Date().toISOString() })
    .eq('id', membroId);
  if (error) {
    throw error;
  }
}
