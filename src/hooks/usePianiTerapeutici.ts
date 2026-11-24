import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useId } from 'react';

import { creaPiano, eliminaPiano, listaPiani } from '@/api/pianoTerapeutico';
import { supabase } from '@/lib/supabase';

export function usePianiTerapeutici(utenteId: string | null) {
  const queryClient = useQueryClient();
  const chiaveQuery = ['piani-terapeutici', utenteId];
  const idIstanza = useId();

  const query = useQuery({
    queryKey: chiaveQuery,
    enabled: utenteId !== null,
    queryFn: () => listaPiani(utenteId as string),
  });

  const invalida = () => queryClient.invalidateQueries({ queryKey: chiaveQuery });

  useEffect(() => {
    if (utenteId === null) {
      return;
    }

    const canale = supabase
      .channel(`piani_terapeutici:${utenteId}:${idIstanza}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'piani_terapeutici', filter: `utente_id=eq.${utenteId}` },
        invalida
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canale);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [utenteId, idIstanza]);

  const crea = useMutation({
    mutationFn: (params: Omit<Parameters<typeof creaPiano>[0], 'utenteId'>) =>
      creaPiano({ ...params, utenteId: utenteId as string }),
    onSuccess: invalida,
  });

  const elimina = useMutation({
    mutationFn: (pianoId: string) => eliminaPiano(pianoId),
    onSuccess: invalida,
  });

  return {
    piani: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    crea,
    elimina,
  };
}
