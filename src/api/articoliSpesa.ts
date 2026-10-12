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

export async function aggiungiArticolo(
  gruppoId: string,
  nome: string,
  creatoDaMembroId: string
): Promise<ArticoloSpesa> {
  const { data, error } = await supabase
    .from('articoli_spesa')
    .insert({ gruppo_id: gruppoId, nome, creato_da: creatoDaMembroId })
    .select()
    .single();

  if (error) {
    throw error;
  }
  return data;
}

export async function aggiornaStatoArticolo(
  articoloId: string,
  stato: ArticoloSpesa['stato']
): Promise<void> {
  const { error } = await supabase.from('articoli_spesa').update({ stato }).eq('id', articoloId);
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
