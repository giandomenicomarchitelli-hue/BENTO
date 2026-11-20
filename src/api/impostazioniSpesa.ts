import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

export type ImpostazioniSpesa = Database['public']['Tables']['impostazioni_spesa']['Row'];

export async function leggiImpostazioniSpesa(gruppoId: string): Promise<ImpostazioniSpesa | null> {
  const { data, error } = await supabase
    .from('impostazioni_spesa')
    .select()
    .eq('gruppo_id', gruppoId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  return data;
}

/**
 * Salva le catene selezionate dal gruppo (upsert: la riga potrebbe non
 * esistere ancora, come in impostazioni_faccende). `null` o array vuoto
 * significa "nessun filtro, mostra le offerte di tutte le catene".
 */
export async function salvaCatenePreferite(
  gruppoId: string,
  catenePreferite: string[] | null
): Promise<void> {
  const { error } = await supabase
    .from('impostazioni_spesa')
    .upsert({ gruppo_id: gruppoId, catene_preferite: catenePreferite }, { onConflict: 'gruppo_id' });

  if (error) {
    throw error;
  }
}
