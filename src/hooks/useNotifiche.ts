import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useId } from 'react';

import { listaNotificheUtente, segnaNotificaLetta, type Notifica } from '@/api/notifiche';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

const CHIAVE_QUERY = ['notifiche'];

/**
 * Notifiche dell'utente su TUTTI i suoi gruppi (campanella in Home e in
 * ogni Dashboard di gruppo), con Realtime. Nessun filtro Realtime per
 * gruppo_id possibile qui (potrebbero essere più gruppi) - stesso
 * compromesso già usato in useSfide.ts: ci si iscrive a tutta la tabella
 * e si invalida comunque solo la query già filtrata lato server dalla
 * RLS, nessuna fuga di dati.
 */
export function useNotifiche() {
  const queryClient = useQueryClient();
  const utenteId = useAuthStore((stato) => stato.session?.user.id);
  const idIstanza = useId();

  const query = useQuery({
    queryKey: CHIAVE_QUERY,
    enabled: utenteId !== undefined,
    queryFn: listaNotificheUtente,
  });

  const invalida = () => queryClient.invalidateQueries({ queryKey: CHIAVE_QUERY });

  useEffect(() => {
    if (utenteId === undefined) {
      return;
    }

    const canale = supabase
      .channel(`notifiche:${utenteId}:${idIstanza}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifiche' }, invalida)
      .subscribe();

    return () => {
      supabase.removeChannel(canale);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [utenteId, idIstanza]);

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
