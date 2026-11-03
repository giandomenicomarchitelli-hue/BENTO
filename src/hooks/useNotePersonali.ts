import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useId } from 'react';

import {
  creaNotaPersonale,
  eliminaNotaPersonale,
  aggiornaNotaPersonale,
  listaNotePersonali,
} from '@/api/notePersonali';
import { supabase } from '@/lib/supabase';

export function useNotePersonali(utenteId: string | null) {
  const queryClient = useQueryClient();
  const chiaveQuery = ['note-personali', utenteId];
  const idIstanza = useId();

  const query = useQuery({
    queryKey: chiaveQuery,
    enabled: utenteId !== null,
    queryFn: () => listaNotePersonali(utenteId as string),
  });

  const invalida = () => queryClient.invalidateQueries({ queryKey: chiaveQuery });

  useEffect(() => {
    if (utenteId === null) {
      return;
    }

    const canale = supabase
      .channel(`note_personali:${utenteId}:${idIstanza}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'note_personali', filter: `utente_id=eq.${utenteId}` },
        invalida
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canale);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [utenteId, idIstanza]);

  const crea = useMutation({
    mutationFn: (params: Omit<Parameters<typeof creaNotaPersonale>[0], 'utenteId'>) =>
      creaNotaPersonale({ ...params, utenteId: utenteId as string }),
    onSuccess: invalida,
  });

  const aggiorna = useMutation({
    mutationFn: ({
      id,
      ...campi
    }: {
      id: string
      titolo?: string
      contenuto?: string
    }) => aggiornaNotaPersonale({ id, ...campi }),
    onSuccess: invalida,
  });

  const elimina = useMutation({
    mutationFn: (notaId: string) => eliminaNotaPersonale(notaId),
    onSuccess: invalida,
  });

  return {
    note: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    crea,
    aggiorna,
    elimina,
  };
}
