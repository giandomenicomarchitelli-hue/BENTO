import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { leggiImpostazioniSpesa, salvaCatenePreferite } from '@/api/impostazioniSpesa';

/** Preferenza di gruppo su quali catene di supermercato mostrare tra le offerte. */
export function useImpostazioniSpesa(gruppoId: string | null) {
  const queryClient = useQueryClient();
  const chiaveQuery = ['impostazioni-spesa', gruppoId];

  const query = useQuery({
    queryKey: chiaveQuery,
    enabled: gruppoId !== null,
    queryFn: () => leggiImpostazioniSpesa(gruppoId as string),
  });

  const salva = useMutation({
    mutationFn: (catenePreferite: string[] | null) =>
      salvaCatenePreferite(gruppoId as string, catenePreferite),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chiaveQuery }),
  });

  return {
    // null/vuoto = nessun filtro, mostra le offerte di tutte le catene.
    catenePreferite: query.data?.catene_preferite ?? null,
    isLoading: query.isLoading,
    error: query.error,
    salva,
  };
}
