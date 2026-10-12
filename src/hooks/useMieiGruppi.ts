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
  return () => queryClient.invalidateQueries({ queryKey: CHIAVE_QUERY });
}
