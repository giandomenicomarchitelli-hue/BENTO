import { useQuery } from '@tanstack/react-query';

import { listaOfferteAttive } from '@/api/offerteProdotti';
import type { OffertaProdotto } from '@/calcolo/tipi';

/** Offerte importate dai volantini (piattaforma separata), aggiornate a
 *  cadenza settimanale: staleTime più lungo del default, non serve
 *  rifetchare ogni 30s dati che cambiano una volta a settimana. */
export function useOfferteProdotti() {
  const query = useQuery({
    queryKey: ['offerte-prodotti'],
    queryFn: listaOfferteAttive,
    staleTime: 1000 * 60 * 60,
  });

  const offerte: OffertaProdotto[] = (query.data ?? []).map((riga) => ({
    id: riga.id,
    nome: riga.nome,
    marca: riga.marca,
    prezzoCentesimi: riga.prezzo_centesimi,
    catena: riga.catena,
  }));

  return { offerte, isLoading: query.isLoading, error: query.error };
}
