import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

export type ArticoloSpesa = Database['public']['Tables']['articoli_spesa']['Row'];

export async function listaArticoli(gruppoId: string): Promise<ArticoloSpesa[]> {
  const { data, error } = await supabase
    .from('articoli_spesa')
    .select()
    .eq('gruppo_id', gruppoId)
    .order('creato_il', { ascending: true });

  if (error) {
    throw error;
  }
  return data;
}

export async function leggiArticolo(articoloId: string): Promise<ArticoloSpesa | null> {
  const { data, error } = await supabase
    .from('articoli_spesa')
    .select()
    .eq('id', articoloId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  return data;
}

export async function aggiungiArticolo(
  gruppoId: string,
  nome: string,
  creatoDaMembroId: string,
  note: string | null = null
): Promise<ArticoloSpesa> {
  const { data, error } = await supabase
    .from('articoli_spesa')
    .insert({ gruppo_id: gruppoId, nome, creato_da: creatoDaMembroId, note })
    .select()
    .single();

  if (error) {
    throw error;
  }
  return data;
}

/**
 * Aggiorna uno o più campi di un articolo (stato dell'acquisto, chi l'ha
 * comprato, prezzo e note - questi ultimi due solo un promemoria
 * sull'articolo, non toccano le spese/i saldi). Solo i campi passati
 * vengono scritti.
 */
export async function aggiornaArticolo(
  articoloId: string,
  campi: {
    nome?: string;
    stato?: ArticoloSpesa['stato'];
    compratoDa?: string | null;
    prezzoCentesimi?: number | null;
    note?: string | null;
  }
): Promise<void> {
  const payload: Database['public']['Tables']['articoli_spesa']['Update'] = {};
  if (campi.nome !== undefined) {
    payload.nome = campi.nome;
  }
  if (campi.stato !== undefined) {
    payload.stato = campi.stato;
  }
  if (campi.compratoDa !== undefined) {
    payload.comprato_da = campi.compratoDa;
  }
  if (campi.prezzoCentesimi !== undefined) {
    payload.prezzo_centesimi = campi.prezzoCentesimi;
  }
  if (campi.note !== undefined) {
    payload.note = campi.note;
  }

  const { error } = await supabase.from('articoli_spesa').update(payload).eq('id', articoloId);
  if (error) {
    throw error;
  }
}

export async function eliminaArticolo(articoloId: string): Promise<void> {
  const { error } = await supabase.from('articoli_spesa').delete().eq('id', articoloId);
  if (error) {
    throw error;
  }
}
