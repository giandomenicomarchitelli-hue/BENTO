import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { leggiSessione, salvaSessione, ultimaSessione, type VoceEsercizio } from '@/api/sessioniAllenamento';

/** Sessione (esercizi registrati) di una scheda in una data specifica, più il riferimento all'ultima volta. */
export function useSessioneAllenamento(allenamentoId: string | null, data: string | null, utenteId: string | null) {
  const queryClient = useQueryClient();
  const abilitato = allenamentoId !== null && data !== null;

  const sessione = useQuery({
    queryKey: ['sessione-allenamento', allenamentoId, data],
    enabled: abilitato,
    queryFn: () => leggiSessione(allenamentoId as string, data as string),
  });

  const precedente = useQuery({
    queryKey: ['ultima-sessione-allenamento', allenamentoId, data],
    enabled: abilitato,
    queryFn: () => ultimaSessione(allenamentoId as string, data as string),
  });

  const salva = useMutation({
    mutationFn: (esercizi: VoceEsercizio[]) =>
      salvaSessione({
        allenamentoId: allenamentoId as string,
        utenteId: utenteId as string,
        data: data as string,
        esercizi,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessione-allenamento', allenamentoId, data] });
      // Una sessione appena salvata è "l'ultima volta" per ogni data successiva
      // a questa - invalida tutte le query ultima-sessione di questa scheda,
      // non solo quella per questa data esatta.
      queryClient.invalidateQueries({ queryKey: ['ultima-sessione-allenamento', allenamentoId] });
    },
  });

  return {
    esercizi: sessione.data?.esercizi ?? [],
    fatta: sessione.data !== null && sessione.data !== undefined,
    eserciziUltimaVolta: precedente.data ?? [],
    isLoading: sessione.isLoading || precedente.isLoading,
    error: sessione.error ?? precedente.error,
    salva,
  };
}
