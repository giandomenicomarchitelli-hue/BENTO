import { useQuery, useQueryClient } from '@tanstack/react-query';

import { listaGruppiUtente } from '@/api/gruppi';
import { useAuthStore } from '@/store/authStore';

const CHIAVE_QUERY = ['miei-gruppi'];

/** Gruppi di cui l'utente autenticato è membro. */
export function useMieiGruppi() {
  const utenteId = useAuthStore((stato) => stato.session?.user.id);

  const query = useQuery({
    queryKey: CHIAVE_QUERY,
    enabled: utenteId !== undefined,
    queryFn: listaGruppiUtente,
  });

  return {
    gruppi: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useInvalidaMieiGruppi() {
  const queryClient = useQueryClient();
  // refetchType: 'all' forza il refetch anche se, come in questo caso, la
  // query non ha osservatori attivi nel momento in cui viene invalidata (si
  // chiama da crea-gruppo/unisciti-a-gruppo, non dalla home che la usa) -
  // altrimenti invalidateQueries la segna solo "stale" senza ricaricarla
  // subito, e il redirect in home legge ancora i dati vecchi.
  return () => queryClient.invalidateQueries({ queryKey: CHIAVE_QUERY, refetchType: 'all' });
}
