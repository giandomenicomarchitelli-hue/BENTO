import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useId } from 'react';

import {
  creaNotaGruppo,
  eliminaNotaGruppo,
  aggiornaNotaGruppo,
  listaNoteGruppo,
} from '@/api/noteGruppo';
import { supabase } from '@/lib/supabase';

export function useNoteGruppo(gruppoId: string | null, creatoDaMembroId: string | null) {
  const queryClient = useQueryClient();
  const chiaveQuery = ['note-gruppo', gruppoId];
  const idIstanza = useId();

  const query = useQuery({
    queryKey: chiaveQuery,
    enabled: gruppoId !== null,
    queryFn: () => listaNoteGruppo(gruppoId as string),
  });

  const invalida = () => queryClient.invalidateQueries({ queryKey: chiaveQuery });

  useEffect(() => {
    if (gruppoId === null) {
      return;
    }

    const canale = supabase
      .channel(`note_gruppo:${gruppoId}:${idIstanza}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'note_gruppo', filter: `gruppo_id=eq.${gruppoId}` },
        invalida
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canale);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gruppoId, idIstanza]);

  const crea = useMutation({
    mutationFn: (params: { titolo: string }) =>
      creaNotaGruppo({ gruppoId: gruppoId as string, creatoDaMembroId: creatoDaMembroId as string, ...params }),
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
    }) => aggiornaNotaGruppo({ id, ...campi }),
    onSuccess: invalida,
  });

  const elimina = useMutation({
    mutationFn: (notaId: string) => eliminaNotaGruppo(notaId),
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
