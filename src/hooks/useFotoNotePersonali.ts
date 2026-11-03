import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useId } from 'react';

import {
  aggiungiFotoNota,
  eliminaFotoNota,
  listaFotoNota,
  FotoNotaPersonale,
} from '@/api/fotoNotePersonali';
import { supabase } from '@/lib/supabase';

export function useFotoNotePersonali(notaId: string | null, utenteId: string | null) {
  const queryClient = useQueryClient();
  const chiaveQuery = ['foto-nota-personale', notaId];
  const idIstanza = useId();

  const query = useQuery({
    queryKey: chiaveQuery,
    enabled: notaId !== null,
    queryFn: () => listaFotoNota(notaId as string),
  });

  const invalida = () => queryClient.invalidateQueries({ queryKey: chiaveQuery });

  useEffect(() => {
    if (notaId === null) {
      return;
    }

    const canale = supabase
      .channel(`foto_note_personali:${notaId}:${idIstanza}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'foto_note_personali', filter: `nota_id=eq.${notaId}` },
        invalida
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canale);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notaId, idIstanza]);

  const aggiungi = useMutation({
    mutationFn: ({ uri }: { uri: string }) =>
      aggiungiFotoNota({ utenteId: utenteId as string, notaId: notaId as string, uri }),
    onSuccess: invalida,
  });

  const elimina = useMutation({
    mutationFn: (foto: FotoNotaPersonale) => eliminaFotoNota({ id: foto.id, percorso: foto.percorso }),
    onSuccess: invalida,
  });

  return {
    foto: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    aggiungi,
    elimina,
  };
}
