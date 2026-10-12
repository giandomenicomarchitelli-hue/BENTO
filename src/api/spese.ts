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
