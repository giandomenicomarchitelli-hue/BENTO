import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useId } from 'react';

import { creaListaPersonale, eliminaListaPersonale, listaListePersonali } from '@/api/listePersonali';
import { supabase } from '@/lib/supabase';

export function useListePersonali(utenteId: string | null) {
  const queryClient = useQueryClient();
  const chiaveQuery = ['liste-personali', utenteId];
  const idIstanza = useId();

  const query = useQuery({
    queryKey: chiaveQuery,
    enabled: utenteId !== null,
    queryFn: () => listaListePersonali(utenteId as string),
  });

  const invalida = () => queryClient.invalidateQueries({ queryKey: chiaveQuery });

  useEffect(() => {
    if (utenteId === null) {
      return;
    }

    const canale = supabase
      .channel(`liste_personali:${utenteId}:${idIstanza}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'liste_personali', filter: `utente_id=eq.${utenteId}` },
        invalida
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canale);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [utenteId, idIstanza]);

  const crea = useMutation({
    mutationFn: (params: Omit<Parameters<typeof creaListaPersonale>[0], 'utenteId'>) =>
      creaListaPersonale({ ...params, utenteId: utenteId as string }),
    onSuccess: invalida,
  });

  const elimina = useMutation({
    mutationFn: (listaId: string) => eliminaListaPersonale(listaId),
    onSuccess: invalida,
  });

  return {
    liste: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    crea,
    elimina,
  };
}
