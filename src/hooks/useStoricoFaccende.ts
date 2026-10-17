import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useId } from 'react';

import { listaStorico, type StoricoFaccenda } from '@/api/occorrenzeFaccende';
import { supabase } from '@/lib/supabase';

/** Cronologia eventi (completamenti/annullamenti) del gruppo, per la sezione "Storico". */
export function useStoricoFaccende(gruppoId: string | null) {
  const queryClient = useQueryClient();
  const chiaveQuery = ['storico-faccende', gruppoId];
  const idIstanza = useId();

  const query = useQuery({
    queryKey: chiaveQuery,
    enabled: gruppoId !== null,
    queryFn: () => listaStorico(gruppoId as string),
  });

  useEffect(() => {
    if (gruppoId === null) {
      return;
    }

    const canale = supabase
      .channel(`storico-faccende:${gruppoId}:${idIstanza}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'storico_faccende', filter: `gruppo_id=eq.${gruppoId}` },
        () => queryClient.invalidateQueries({ queryKey: chiaveQuery })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canale);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gruppoId, idIstanza]);

  return {
    storico: query.data ?? ([] as StoricoFaccenda[]),
    isLoading: query.isLoading,
    error: query.error,
  };
}
