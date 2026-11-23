import { useQuery } from '@tanstack/react-query';

import { listaOccorrenzeNelPeriodo } from '@/api/sessioniAllenamento';

/** Occorrenze (sessioni fatte) dell'utente in un intervallo di date - per la striscia settimanale. */
export function useOccorrenzeAllenamentoSettimana(
  utenteId: string | null,
  dataInizio: string,
  dataFine: string
) {
  const query = useQuery({
    queryKey: ['occorrenze-allenamento-periodo', utenteId, dataInizio, dataFine],
    enabled: utenteId !== null,
    queryFn: () => listaOccorrenzeNelPeriodo(utenteId as string, dataInizio, dataFine),
  });

  return { occorrenze: query.data ?? [], isLoading: query.isLoading };
}
