import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

export type ListaPersonale = Database['public']['Tables']['liste_personali']['Row'];

export async function listaListePersonali(utenteId: string): Promise<ListaPersonale[]> {
  const { data, error } = await supabase
    .from('liste_personali')
    .select()
    .eq('utente_id', utenteId)
    .order('creato_il', { ascending: true });

  if (error) {
    throw error;
  }
  return data;
}

export async function creaListaPersonale(params: { utenteId: string; nome: string }): Promise<ListaPersonale> {
  const { data, error } = await supabase
    .from('liste_personali')
    .insert({
      utente_id: params.utenteId,
      nome: params.nome,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }
  return data;
}

export async function eliminaListaPersonale(listaId: string): Promise<void> {
  const { error } = await supabase.from('liste_personali').delete().eq('id', listaId);
  if (error) {
    throw error;
  }
}
