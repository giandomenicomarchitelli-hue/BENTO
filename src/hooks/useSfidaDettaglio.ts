import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useId } from 'react';

import { confermaVoti as confermaVotiApi, leggiSfidaCompleta } from '@/api/sfide';
import { supabase } from '@/lib/supabase';

/**
 * Dettaglio completo di una sfida (voto in corso / attesa altri /
 * spareggio / risultati, a seconda dello stato), con Realtime e la
 * mutazione di voto. Non si sottoscrive mai a sfide_voti: non è in
 * pubblicazione Realtime (Task 5) e resta privata anche a turno
 * concluso.
 */
export function useSfidaDettaglio(sfidaId: string | null) {
  const queryClient = useQueryClient();
  const chiaveQuery = ['sfide', 'dettaglio', sfidaId];
  const idIstanza = useId();

  const query = useQuery({
    queryKey: chiaveQuery,
    enabled: sfidaId !== null,
    queryFn: () => leggiSfidaCompleta(sfidaId as string),
  });

  // Prefisso comune ['sfide'] (coerente con la queryKey ['sfide', gruppoId]
  // di useSfide.ts): un solo invalidateQueries con questo prefisso copre
  // sia questa query sia l'elenco sfide del gruppo, senza che questo hook
  // debba conoscere il gruppoId (non è un parametro della sua firma).
  const invalida = () => queryClient.invalidateQueries({ queryKey: ['sfide'] });

  useEffect(() => {
    if (sfidaId === null) {
      return;
    }

    const canale = supabase
      .channel(`sfida-dettaglio:${sfidaId}:${idIstanza}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sfide_turni', filter: `sfida_id=eq.${sfidaId}` },
        invalida
      )
      // sfide_turno_risultati non ha una colonna sfida_id/gruppo_id (solo
      // turno_id): nessun filtro Realtime possibile lato Postgres, stesso
      // compromesso di useSfide.ts per sfide_turni. Nessuna fuga di dati:
      // sono aggregati già pubblici al gruppo (mai righe di sfide_voti),
      // ed erano già entrati nella pubblicazione Realtime a questo stesso
      // livello in Task 5.
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sfide_turno_risultati' }, invalida)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifiche', filter: `sfida_id=eq.${sfidaId}` },
        invalida
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canale);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sfidaId, idIstanza]);

  const confermaVoti = useMutation({
    mutationFn: (params: Parameters<typeof confermaVotiApi>[0]) => confermaVotiApi(params),
    onSuccess: invalida,
  });

  return {
    dettaglio: query.data,
    isLoading: query.isLoading,
    error: query.error,
    confermaVoti,
  };
}
