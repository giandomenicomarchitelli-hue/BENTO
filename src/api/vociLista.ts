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

export async function aggiungiVoce(
  listaId: string,
  testo: string,
  creatoDaMembroId: string
): Promise<VoceLista> {
  const { data, error } = await supabase
    .from('voci_lista')
    .insert({ lista_id: listaId, testo, creato_da: creatoDaMembroId })
    .select()
    .single();

  if (error) {
    throw error;
  }
  return data;
}

export async function aggiornaVoce(voceId: string, fatto: boolean): Promise<void> {
  const { error } = await supabase.from('voci_lista').update({ fatto }).eq('id', voceId);
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
