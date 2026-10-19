import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useId } from 'react';

import { listaNotifiche, segnaNotificaLetta, type Notifica } from '@/api/notifiche';
import { supabase } from '@/lib/supabase';

/** Notifiche interne del gruppo (campanella in Home), con Realtime. */
export function useNotifiche(gruppoId: string | null) {
  const queryClient = useQueryClient();
  const chiaveQuery = ['notifiche', gruppoId];
  const idIstanza = useId();

  const query = useQuery({
    queryKey: chiaveQuery,
    enabled: gruppoId !== null,
    queryFn: () => listaNotifiche(gruppoId as string),
  });

  const invalida = () => queryClient.invalidateQueries({ queryKey: chiaveQuery });

  useEffect(() => {
    if (gruppoId === null) {
      return;
    }

    const canale = supabase
      .channel(`notifiche:${gruppoId}:${idIstanza}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifiche', filter: `gruppo_id=eq.${gruppoId}` },
        invalida
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canale);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gruppoId, idIstanza]);

  const notifiche = query.data ?? ([] as Notifica[]);

  const segnaLetta = useMutation({
    mutationFn: (notificaId: string) => segnaNotificaLetta(notificaId),
    onSuccess: invalida,
  });

  return {
    notifiche,
    nonLette: notifiche.filter((n) => n.letta_il === null).length,
    isLoading: query.isLoading,
    segnaLetta,
  };
}
