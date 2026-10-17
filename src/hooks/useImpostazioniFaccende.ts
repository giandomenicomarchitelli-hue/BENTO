import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { attivaModuloFaccende, leggiImpostazioniFaccende } from '@/api/faccende';

/**
 * Stato di attivazione del modulo Faccende per il gruppo: la sola esistenza
 * della riga in impostazioni_faccende indica che è stato attivato (vedi
 * attivaModuloFaccende in src/api/faccende.ts).
 */
export function useImpostazioniFaccende(gruppoId: string | null) {
  const queryClient = useQueryClient();
  const chiaveQuery = ['impostazioni-faccende', gruppoId];

  const query = useQuery({
    queryKey: chiaveQuery,
    enabled: gruppoId !== null,
    queryFn: () => leggiImpostazioniFaccende(gruppoId as string),
  });

  const attiva = useMutation({
    mutationFn: () => attivaModuloFaccende(gruppoId as string),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chiaveQuery }),
  });

  return {
    impostazioni: query.data ?? null,
    moduloAttivo: query.data !== null && query.data !== undefined,
    isLoading: query.isLoading,
    error: query.error,
    attiva,
  };
}
