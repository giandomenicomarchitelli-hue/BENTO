import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

export type Lista = Database['public']['Tables']['liste']['Row'];

export async function listaListe(gruppoId: string): Promise<Lista[]> {
  const { data, error } = await supabase
    .from('liste')
    .select()
    .eq('gruppo_id', gruppoId)
    .order('creato_il', { ascending: true });

  if (error) {
    throw error;
  }
  return data;
}

interface CreaListaParams {
  gruppoId: string;
  nome: string;
  creatoDaMembroId: string;
  mostraInHome: boolean;
  conPrezzi: boolean;
}

export async function creaLista({
  gruppoId,
  nome,
  creatoDaMembroId,
  mostraInHome,
  conPrezzi,
}: CreaListaParams): Promise<Lista> {
  const { data, error } = await supabase
    .from('liste')
    .insert({
      gruppo_id: gruppoId,
      nome,
      creato_da: creatoDaMembroId,
      mostra_in_home: mostraInHome,
      con_prezzi: conPrezzi,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }
  return data;
}

export async function eliminaLista(listaId: string): Promise<void> {
  const { error } = await supabase.from('liste').delete().eq('id', listaId);
  if (error) {
    throw error;
  }
}
