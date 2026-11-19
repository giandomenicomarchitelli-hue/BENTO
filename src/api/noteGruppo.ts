import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

export type NotaGruppo = Database['public']['Tables']['note_gruppo']['Row'];

export async function listaNoteGruppo(gruppoId: string): Promise<NotaGruppo[]> {
  const { data, error } = await supabase
    .from('note_gruppo')
    .select()
    .eq('gruppo_id', gruppoId)
    .order('aggiornato_il', { ascending: false });

  if (error) {
    throw error;
  }
  return data;
}

export async function creaNotaGruppo(params: {
  gruppoId: string;
  titolo: string;
  creatoDaMembroId: string;
}): Promise<NotaGruppo> {
  const { data, error } = await supabase
    .from('note_gruppo')
    .insert({
      gruppo_id: params.gruppoId,
      titolo: params.titolo,
      creato_da: params.creatoDaMembroId,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }
  return data;
}

/**
 * Aggiorna uno o più campi di una nota (titolo e/o contenuto).
 * Solo i campi passati vengono scritti.
 */
export async function aggiornaNotaGruppo(params: {
  id: string;
  titolo?: string;
  contenuto?: string;
}): Promise<void> {
  const payload: Database['public']['Tables']['note_gruppo']['Update'] = {};
  if (params.titolo !== undefined) {
    payload.titolo = params.titolo;
  }
  if (params.contenuto !== undefined) {
    payload.contenuto = params.contenuto;
  }

  const { error } = await supabase.from('note_gruppo').update(payload).eq('id', params.id);
  if (error) {
    throw error;
  }
}

export async function eliminaNotaGruppo(id: string): Promise<void> {
  const { error } = await supabase.from('note_gruppo').delete().eq('id', id);
  if (error) {
    throw error;
  }
}
