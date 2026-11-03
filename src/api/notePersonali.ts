import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

export type NotaPersonale = Database['public']['Tables']['note_personali']['Row'];

export async function listaNotePersonali(utenteId: string): Promise<NotaPersonale[]> {
  const { data, error } = await supabase
    .from('note_personali')
    .select()
    .eq('utente_id', utenteId)
    .order('aggiornato_il', { ascending: false });

  if (error) {
    throw error;
  }
  return data;
}

export async function creaNotaPersonale(params: { utenteId: string; titolo: string }): Promise<NotaPersonale> {
  const { data, error } = await supabase
    .from('note_personali')
    .insert({
      utente_id: params.utenteId,
      titolo: params.titolo,
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
export async function aggiornaNotaPersonale(params: {
  id: string;
  titolo?: string;
  contenuto?: string;
}): Promise<void> {
  const payload: Database['public']['Tables']['note_personali']['Update'] = {};
  if (params.titolo !== undefined) {
    payload.titolo = params.titolo;
  }
  if (params.contenuto !== undefined) {
    payload.contenuto = params.contenuto;
  }

  const { error } = await supabase.from('note_personali').update(payload).eq('id', params.id);
  if (error) {
    throw error;
  }
}

export async function eliminaNotaPersonale(id: string): Promise<void> {
  const { error } = await supabase.from('note_personali').delete().eq('id', id);
  if (error) {
    throw error;
  }
}
