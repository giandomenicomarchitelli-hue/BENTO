import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useId } from 'react';

import { aggiornaDose, listaDosiUtente } from '@/api/pianoTerapeutico';
import { supabase } from '@/lib/supabase';

/**
 * Tutte le dosi dell'utente (di ogni piano), in un'unica query: serve per
 * mostrare l'avviso scorta su ogni scheda, non solo su quella aperta.
 */
export function useDosiPiano(utenteId: string | null) {
  const queryClient = useQueryClient();
  const chiaveQuery = ['dosi-piano', utenteId];
  const idIstanza = useId();

  const query = useQuery({
    queryKey: chiaveQuery,
    enabled: utenteId !== null,
    queryFn: () => listaDosiUtente(utenteId as string),
  });

  const invalida = () => queryClient.invalidateQueries({ queryKey: chiaveQuery });

  useEffect(() => {
    if (utenteId === null) {
      return;
    }

    const canale = supabase
      .channel(`dosi_piano_terapeutico:${utenteId}:${idIstanza}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dosi_piano_terapeutico', filter: `utente_id=eq.${utenteId}` },
        invalida
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canale);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [utenteId, idIstanza]);

  const spunta = useMutation({
    mutationFn: (params: { doseId: string; assunta: boolean }) => aggiornaDose(params.doseId, params.assunta),
    onSuccess: invalida,
  });

  return {
    dosi: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    spunta,
  };
}
