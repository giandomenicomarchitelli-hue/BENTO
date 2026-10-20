import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useId } from 'react';

import { aggiornaVoce, aggiungiVoce, eliminaVoce, listaVoci } from '@/api/vociLista';
import { supabase } from '@/lib/supabase';

export function useVociLista(listaId: string | null) {
  const queryClient = useQueryClient();
  const chiaveQuery = ['voci-lista', listaId];
  const idIstanza = useId();

  const query = useQuery({
    queryKey: chiaveQuery,
    enabled: listaId !== null,
    queryFn: () => listaVoci(listaId as string),
  });

  const invalida = () => queryClient.invalidateQueries({ queryKey: chiaveQuery });

  useEffect(() => {
    if (listaId === null) {
      return;
    }

    const canale = supabase
      .channel(`voci_lista:${listaId}:${idIstanza}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'voci_lista', filter: `lista_id=eq.${listaId}` },
        invalida
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canale);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listaId, idIstanza]);

  const aggiungi = useMutation({
    mutationFn: ({
      testo,
      creatoDaMembroId,
      note,
    }: {
      testo: string
      creatoDaMembroId: string
      note?: string | null
    }) => aggiungiVoce(listaId as string, testo, creatoDaMembroId, note ?? null),
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
      prezzoCentesimi?: number | null
      note?: string | null
    }) => aggiornaVoce(id, campi),
    onSuccess: invalida,
  });

  const elimina = useMutation({
    mutationFn: (id: string) => eliminaVoce(id),
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
