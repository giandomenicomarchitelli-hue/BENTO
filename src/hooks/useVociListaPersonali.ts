import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useId } from 'react';

import {
  aggiornaVocePersonale,
  aggiungiVocePersonale,
  eliminaVocePersonale,
  listaVociPersonali,
} from '@/api/vociListaPersonali';
import { supabase } from '@/lib/supabase';

export function useVociListaPersonali(listaId: string | null) {
  const queryClient = useQueryClient();
  const chiaveQuery = ['voci-lista-personali', listaId];
  const idIstanza = useId();

  const query = useQuery({
    queryKey: chiaveQuery,
    enabled: listaId !== null,
    queryFn: () => listaVociPersonali(listaId as string),
  });

  const invalida = () => queryClient.invalidateQueries({ queryKey: chiaveQuery });

  useEffect(() => {
    if (listaId === null) {
      return;
    }

    const canale = supabase
      .channel(`voci_lista_personali:${listaId}:${idIstanza}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'voci_lista_personali', filter: `lista_id=eq.${listaId}` },
        invalida
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canale);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listaId, idIstanza]);

  const aggiungi = useMutation({
    mutationFn: ({ testo }: { testo: string }) => aggiungiVocePersonale(listaId as string, testo),
    onSuccess: invalida,
  });

  const aggiorna = useMutation({
    mutationFn: ({
      id,
      ...campi
    }: {
      id: string
      testo?: string
      fatto?: boolean
    }) => aggiornaVocePersonale(id, campi),
    onSuccess: invalida,
  });

  const elimina = useMutation({
    mutationFn: (id: string) => eliminaVocePersonale(id),
    onSuccess: invalida,
  });

  return {
    voci: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    aggiungi,
    aggiorna,
    elimina,
  };
}
