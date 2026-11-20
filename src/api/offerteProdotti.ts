import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

export type OffertaProdottoRow = Database['public']['Tables']['offerte_prodotti']['Row'];

// PostgREST limita ogni risposta a un massimo di righe (di norma 1000):
// con migliaia di offerte serve paginare esplicitamente, altrimenti
// interi supermercati spariscono in silenzio dal matching dei prezzi
// solo perché le loro righe arrivano dopo il taglio.
const DIMENSIONE_PAGINA = 1000;

export async function listaOfferteAttive(): Promise<OffertaProdottoRow[]> {
  const oggi = new Date().toISOString().slice(0, 10);
  const righe: OffertaProdottoRow[] = [];

  for (let pagina = 0; ; pagina++) {
    const da = pagina * DIMENSIONE_PAGINA;
    const a = da + DIMENSIONE_PAGINA - 1;
    const { data, error } = await supabase
      .from('offerte_prodotti')
      .select()
      .gte('valido_al', oggi)
      .range(da, a);

    if (error) {
      throw error;
    }
    righe.push(...data);
    if (data.length < DIMENSIONE_PAGINA) {
      break;
    }
  }

  return righe;
}
