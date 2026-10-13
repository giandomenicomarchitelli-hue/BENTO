import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { creaProfilo, leggiProfiloCorrente } from '@/api/profili';
import { useAuthStore } from '@/store/authStore';

const CHIAVE_QUERY = ['profilo'];

/** Il profilo (nome utente fisso + codice utente) dell'utente corrente. */
export function useProfilo() {
  const utenteId = useAuthStore((stato) => stato.session?.user.id);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...CHIAVE_QUERY, utenteId],
    enabled: utenteId !== undefined,
    queryFn: leggiProfiloCorrente,
  });

  const crea = useMutation({
    mutationFn: creaProfilo,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CHIAVE_QUERY, refetchType: 'all' }),
  });

  return {
    profilo: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    crea,
  };
}
