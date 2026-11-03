import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useId } from 'react';

import {
  creaEventoPersonale,
  eliminaEventoPersonale,
  aggiornaEventoPersonale,
  listaEventiPersonali,
} from '@/api/eventiPersonali';
import { supabase } from '@/lib/supabase';

export function useEventiPersonali(utenteId: string | null) {
  const queryClient = useQueryClient();
  const chiaveQuery = ['eventi-personali', utenteId];
  const idIstanza = useId();

  const query = useQuery({
    queryKey: chiaveQuery,
    enabled: utenteId !== null,
    queryFn: () => listaEventiPersonali(utenteId as string),
  });

  const invalida = () => queryClient.invalidateQueries({ queryKey: chiaveQuery });

  useEffect(() => {
    if (utenteId === null) {
      return;
    }

    const canale = supabase
      .channel(`eventi_personali:${utenteId}:${idIstanza}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'eventi_personali', filter: `utente_id=eq.${utenteId}` },
        invalida
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canale);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [utenteId, idIstanza]);

  const crea = useMutation({
    mutationFn: (params: Omit<Parameters<typeof creaEventoPersonale>[0], 'utenteId'>) =>
      creaEventoPersonale({ ...params, utenteId: utenteId as string }),
    onSuccess: invalida,
  });

  const aggiorna = useMutation({
    mutationFn: ({
      id,
      ...campi
    }: {
      id: string
      titolo?: string
      data?: string
      ora?: string | null
      descrizione?: string | null
    }) => aggiornaEventoPersonale({ id, ...campi }),
    onSuccess: invalida,
  });

  const elimina = useMutation({
    mutationFn: (eventoId: string) => eliminaEventoPersonale(eventoId),
    onSuccess: invalida,
  });

  return {
    eventi: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    crea,
    aggiorna,
    elimina,
  };
}
