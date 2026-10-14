import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

export type VoceLista = Database['public']['Tables']['voci_lista']['Row'];

export async function listaVoci(listaId: string): Promise<VoceLista[]> {
  const { data, error } = await supabase
    .from('voci_lista')
    .select()
    .eq('lista_id', listaId)
    .order('creato_il', { ascending: true });

  if (error) {
    throw error;
  }
  return data;
}

export async function leggiVoce(voceId: string): Promise<VoceLista | null> {
  const { data, error } = await supabase
    .from('voci_lista')
    .select()
    .eq('id', voceId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  return data;
}

export async function aggiungiVoce(
  listaId: string,
  testo: string,
  creatoDaMembroId: string,
  note: string | null = null
): Promise<VoceLista> {
  const { data, error } = await supabase
    .from('voci_lista')
    .insert({ lista_id: listaId, testo, creato_da: creatoDaMembroId, note })
    .select()
    .single();

  if (error) {
    throw error;
  }
  return data;
}

/**
 * Aggiorna uno o più campi di una voce (fatta o no, prezzo e note - questi
 * ultimi due solo un promemoria sulla voce, non toccano le spese/i saldi).
 * Solo i campi passati vengono scritti.
 */
export async function aggiornaVoce(
  voceId: string,
  campi: {
    fatto?: boolean;
    prezzoCentesimi?: number | null;
    note?: string | null;
  }
): Promise<void> {
  const payload: Database['public']['Tables']['voci_lista']['Update'] = {};
  if (campi.fatto !== undefined) {
    payload.fatto = campi.fatto;
  }
  if (campi.prezzoCentesimi !== undefined) {
    payload.prezzo_centesimi = campi.prezzoCentesimi;
  }
  if (campi.note !== undefined) {
    payload.note = campi.note;
  }

  const { error } = await supabase.from('voci_lista').update(payload).eq('id', voceId);
  if (error) {
    throw error;
  }
}

export async function eliminaVoce(voceId: string): Promise<void> {
  const { error } = await supabase.from('voci_lista').delete().eq('id', voceId);
  if (error) {
    throw error;
  }
}
