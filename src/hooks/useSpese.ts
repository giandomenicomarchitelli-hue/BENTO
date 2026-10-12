import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { annullaSpesa, creaSpesa, listaSpese } from '@/api/spese';
import { supabase } from '@/lib/supabase';

export function useSpese(gruppoId: string | null) {
  const queryClient = useQueryClient();
  const chiaveQuery = ['spese', gruppoId];

  const query = useQuery({
    queryKey: chiaveQuery,
    enabled: gruppoId !== null,
    queryFn: () => listaSpese(gruppoId as string),
  });

  const invalida = () => queryClient.invalidateQueries({ queryKey: chiaveQuery });

  // Aggiorna l'elenco quando un altro membro registra o annulla una spesa.
  useEffect(() => {
    if (gruppoId === null) {
      return;
    }

    const canale = supabase
      .channel(`spese:${gruppoId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'spese', filter: `gruppo_id=eq.${gruppoId}` },
        invalida
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canale);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gruppoId]);

  const crea = useMutation({
    mutationFn: (params: Omit<Parameters<typeof creaSpesa>[0], 'gruppoId'>) =>
      creaSpesa({ ...params, gruppoId: gruppoId as string }),
    onSuccess: invalida,
  });

  const annulla = useMutation({
    mutationFn: (spesaId: string) => annullaSpesa(spesaId),
    onSuccess: invalida,
  });

  return {
    spese: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    crea,
    annulla,
  };
}
