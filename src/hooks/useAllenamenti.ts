import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useId } from 'react';

import { aggiornaAllenamento, creaAllenamento, eliminaAllenamento, listaAllenamenti } from '@/api/allenamenti';
import { supabase } from '@/lib/supabase';

export function useAllenamenti(utenteId: string | null) {
  const queryClient = useQueryClient();
  const chiaveQuery = ['allenamenti', utenteId];
  const idIstanza = useId();

  const query = useQuery({
    queryKey: chiaveQuery,
    enabled: utenteId !== null,
    queryFn: () => listaAllenamenti(utenteId as string),
  });

  const invalida = () => queryClient.invalidateQueries({ queryKey: chiaveQuery });

  useEffect(() => {
    if (utenteId === null) {
      return;
    }

    const canale = supabase
      .channel(`allenamenti:${utenteId}:${idIstanza}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'allenamenti', filter: `utente_id=eq.${utenteId}` },
        invalida
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canale);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [utenteId, idIstanza]);

  const crea = useMutation({
    mutationFn: (params: Omit<Parameters<typeof creaAllenamento>[0], 'utenteId'>) =>
      creaAllenamento({ ...params, utenteId: utenteId as string }),
    onSuccess: invalida,
  });

  const aggiorna = useMutation({
    mutationFn: (params: Parameters<typeof aggiornaAllenamento>[0]) => aggiornaAllenamento(params),
    onSuccess: invalida,
  });

  const elimina = useMutation({
    mutationFn: (allenamentoId: string) => eliminaAllenamento(allenamentoId),
    onSuccess: invalida,
  });

  return {
    allenamenti: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    crea,
    aggiorna,
    elimina,
  };
}
