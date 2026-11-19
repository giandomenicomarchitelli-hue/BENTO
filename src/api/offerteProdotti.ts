import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

export type OffertaProdottoRow = Database['public']['Tables']['offerte_prodotti']['Row'];

export async function listaOfferteAttive(): Promise<OffertaProdottoRow[]> {
  const oggi = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase.from('offerte_prodotti').select().gte('valido_al', oggi);

  if (error) {
    throw error;
  }
  return data;
}
