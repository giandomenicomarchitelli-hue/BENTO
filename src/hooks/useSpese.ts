import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { annullaSpesa, creaSpesa, listaSpese } from '@/api/spese';

export function useSpese(gruppoId: string | null) {
  const queryClient = useQueryClient();
  const chiaveQuery = ['spese', gruppoId];

  const query = useQuery({
    queryKey: chiaveQuery,
    enabled: gruppoId !== null,
    queryFn: () => listaSpese(gruppoId as string),
  });

  const invalida = () => queryClient.invalidateQueries({ queryKey: chiaveQuery });

  const crea = useMutation({
    mutationFn: (params: Omit<Parameters<typeof creaSpesa>[0], 'gruppoId'>) =>
      creaSpesa({ ...params, gruppoId: gruppoId as string }),
    onSuccess: invalida,
  });

  const annulla = useMutation({
    mutationFn: (spesaId: string) => annullaSpesa(spesaId),
    onSuccess: invalida,
  });

  return {
    spese: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    crea,
    annulla,
  };
}
