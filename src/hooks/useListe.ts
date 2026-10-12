import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useId } from 'react';

import { creaLista, eliminaLista, listaListe } from '@/api/liste';
import { supabase } from '@/lib/supabase';

export function useListe(gruppoId: string | null) {
  const queryClient = useQueryClient();
  const chiaveQuery = ['liste', gruppoId];
  const idIstanza = useId();

  const query = useQuery({
    queryKey: chiaveQuery,
    enabled: gruppoId !== null,
    queryFn: () => listaListe(gruppoId as string),
  });

  const invalida = () => queryClient.invalidateQueries({ queryKey: chiaveQuery });

  useEffect(() => {
    if (gruppoId === null) {
      return;
    }

    const canale = supabase
      .channel(`liste:${gruppoId}:${idIstanza}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'liste', filter: `gruppo_id=eq.${gruppoId}` },
        invalida
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canale);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gruppoId, idIstanza]);

  const crea = useMutation({
    mutationFn: ({ nome, creatoDaMembroId }: { nome: string; creatoDaMembroId: string }) =>
      creaLista(gruppoId as string, nome, creatoDaMembroId),
    onSuccess: invalida,
  });

  const elimina = useMutation({
    mutationFn: (listaId: string) => eliminaLista(listaId),
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
