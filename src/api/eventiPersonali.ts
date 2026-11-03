import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

export type EventoPersonale = Database['public']['Tables']['eventi_personali']['Row'];

export async function listaEventiPersonali(utenteId: string): Promise<EventoPersonale[]> {
  const { data, error } = await supabase
    .from('eventi_personali')
    .select()
    .eq('utente_id', utenteId)
    .order('data', { ascending: true });

  if (error) {
    throw error;
  }
  return data;
}

export async function creaEventoPersonale(params: {
  utenteId: string;
  titolo: string;
  data: string;
  ora?: string | null;
  descrizione?: string | null;
}): Promise<EventoPersonale> {
  const { data, error } = await supabase
    .from('eventi_personali')
    .insert({
      utente_id: params.utenteId,
      titolo: params.titolo,
      data: params.data,
      ora: params.ora ?? null,
      descrizione: params.descrizione ?? null,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }
  return data;
}

/**
 * Aggiorna uno o più campi di un evento (titolo, data, ora, descrizione).
 * Solo i campi passati vengono scritti.
 */
export async function aggiornaEventoPersonale(params: {
  id: string;
  titolo?: string;
  data?: string;
  ora?: string | null;
  descrizione?: string | null;
}): Promise<void> {
  const payload: Database['public']['Tables']['eventi_personali']['Update'] = {};
  if (params.titolo !== undefined) {
    payload.titolo = params.titolo;
  }
  if (params.data !== undefined) {
    payload.data = params.data;
  }
  if (params.ora !== undefined) {
    payload.ora = params.ora;
  }
  if (params.descrizione !== undefined) {
    payload.descrizione = params.descrizione;
  }

  const { error } = await supabase.from('eventi_personali').update(payload).eq('id', params.id);
  if (error) {
    throw error;
  }
}

export async function eliminaEventoPersonale(id: string): Promise<void> {
  const { error } = await supabase.from('eventi_personali').delete().eq('id', id);
  if (error) {
    throw error;
  }
}
