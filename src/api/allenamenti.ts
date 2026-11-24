import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

export type Allenamento = Database['public']['Tables']['allenamenti']['Row'];

/** Schede attive dell'utente, in nessun ordine particolare (poche per utente). */
export async function listaAllenamenti(utenteId: string): Promise<Allenamento[]> {
  const { data, error } = await supabase
    .from('allenamenti')
    .select()
    .eq('utente_id', utenteId)
    .eq('attiva', true)
    .order('creato_il', { ascending: true });

  if (error) {
    throw error;
  }
  return data;
}

export async function creaAllenamento(params: {
  utenteId: string;
  titolo: string;
  giorniSettimana: number[];
  colore: string;
  gruppiMuscolari: string[];
}): Promise<Allenamento> {
  const { data, error } = await supabase
    .from('allenamenti')
    .insert({
      utente_id: params.utenteId,
      titolo: params.titolo,
      giorni_settimana: params.giorniSettimana,
      colore: params.colore,
      gruppi_muscolari: params.gruppiMuscolari,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }
  return data;
}

/** Aggiorna uno o più campi di una scheda. Solo i campi passati vengono scritti. */
export async function aggiornaAllenamento(params: {
  id: string;
  titolo?: string;
  giorniSettimana?: number[];
  colore?: string;
  gruppiMuscolari?: string[];
}): Promise<void> {
  const payload: Database['public']['Tables']['allenamenti']['Update'] = {};
  if (params.titolo !== undefined) {
    payload.titolo = params.titolo;
  }
  if (params.giorniSettimana !== undefined) {
    payload.giorni_settimana = params.giorniSettimana;
  }
  if (params.colore !== undefined) {
    payload.colore = params.colore;
  }
  if (params.gruppiMuscolari !== undefined) {
    payload.gruppi_muscolari = params.gruppiMuscolari;
  }

  const { error } = await supabase.from('allenamenti').update(payload).eq('id', params.id);
  if (error) {
    throw error;
  }
}

/** Disattiva la scheda (soft delete): le sessioni già registrate restano nello storico. */
export async function eliminaAllenamento(id: string): Promise<void> {
  const { error } = await supabase.from('allenamenti').update({ attiva: false }).eq('id', id);
  if (error) {
    throw error;
  }
}
