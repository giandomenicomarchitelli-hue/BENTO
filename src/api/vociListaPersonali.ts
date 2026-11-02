import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

export type VoceListaPersonale = Database['public']['Tables']['voci_lista_personali']['Row'];

export async function listaVociPersonali(listaId: string): Promise<VoceListaPersonale[]> {
  const { data, error } = await supabase
    .from('voci_lista_personali')
    .select()
    .eq('lista_id', listaId)
    .order('creato_il', { ascending: true });

  if (error) {
    throw error;
  }
  return data;
}

export async function aggiungiVocePersonale(listaId: string, testo: string): Promise<VoceListaPersonale> {
  const { data, error } = await supabase
    .from('voci_lista_personali')
    .insert({ lista_id: listaId, testo })
    .select()
    .single();

  if (error) {
    throw error;
  }
  return data;
}

/**
 * Aggiorna uno o più campi di una voce (testo e/o fatto).
 * Solo i campi passati vengono scritti.
 */
export async function aggiornaVocePersonale(
  voceId: string,
  campi: {
    testo?: string;
    fatto?: boolean;
  }
): Promise<void> {
  const payload: Database['public']['Tables']['voci_lista_personali']['Update'] = {};
  if (campi.testo !== undefined) {
    payload.testo = campi.testo;
  }
  if (campi.fatto !== undefined) {
    payload.fatto = campi.fatto;
  }

  const { error } = await supabase.from('voci_lista_personali').update(payload).eq('id', voceId);
  if (error) {
    throw error;
  }
}

export async function eliminaVocePersonale(voceId: string): Promise<void> {
  const { error } = await supabase.from('voci_lista_personali').delete().eq('id', voceId);
  if (error) {
    throw error;
  }
}
