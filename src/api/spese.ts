import { calcolaQuoteAcquisto } from '@/calcolo/risoluzioneAzioni';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

export type Spesa = Database['public']['Tables']['spese']['Row'];
export type QuotaSpesaRow = Database['public']['Tables']['quote_spesa']['Row'];

export interface SpesaConQuote extends Spesa {
  quote_spesa: Pick<QuotaSpesaRow, 'membro_id' | 'quota_centesimi'>[];
}

/** Spese attive (non annullate) di un gruppo, con le relative quote. */
export async function listaSpese(gruppoId: string): Promise<SpesaConQuote[]> {
  const { data, error } = await supabase
    .from('spese')
    .select('*, quote_spesa(membro_id, quota_centesimi)')
    .eq('gruppo_id', gruppoId)
    .eq('annullata', false)
    .order('data', { ascending: true });

  if (error) {
    throw error;
  }
  return data;
}

interface CreaSpesaParams {
  gruppoId: string;
  pagatoDa: string;
  importoCentesimi: number;
  descrizione?: string;
  data?: string;
  quote: { membroId: string; quotaCentesimi: number }[];
}

export async function creaSpesa(params: CreaSpesaParams): Promise<string> {
  const { data, error } = await supabase.rpc('crea_spesa', {
    p_gruppo_id: params.gruppoId,
    p_pagato_da: params.pagatoDa,
    p_importo_centesimi: params.importoCentesimi,
    p_descrizione: params.descrizione ?? '',
    p_data: params.data ?? new Date().toISOString().slice(0, 10),
    p_quote: params.quote.map((q) => ({
      membro_id: q.membroId,
      quota_centesimi: q.quotaCentesimi,
    })),
  });

  if (error) {
    throw error;
  }
  return data;
}

/** Annulla una spesa (soft-delete): lo storico resta tracciato. */
export async function annullaSpesa(spesaId: string): Promise<void> {
  const { error } = await supabase.from('spese').update({ annullata: true }).eq('id', spesaId);
  if (error) {
    throw error;
  }
}

/**
 * Corregge l'importo di una spesa già registrata, in modo che il saldo lo
 * rifletta subito. quote_spesa è append-only per design (nessuna policy di
 * update/delete, vedi migration RLS: storico immutabile), quindi non si
 * aggiorna la riga esistente: si annulla la spesa originale e se ne crea
 * una nuova identica (stesso pagato_da/descrizione/data/partecipanti) con
 * il nuovo importo, ricalcolando le quote in parti uguali tra gli stessi
 * partecipanti di prima.
 */
export async function modificaImportoSpesa(
  spesa: SpesaConQuote,
  nuovoImportoCentesimi: number
): Promise<void> {
  await annullaSpesa(spesa.id);
  const idsPartecipanti = spesa.quote_spesa.map((q) => q.membro_id);
  await creaSpesa({
    gruppoId: spesa.gruppo_id,
    pagatoDa: spesa.pagato_da,
    importoCentesimi: nuovoImportoCentesimi,
    descrizione: spesa.descrizione,
    data: spesa.data,
    quote: calcolaQuoteAcquisto(nuovoImportoCentesimi, idsPartecipanti),
  });
}
