import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useId } from 'react';

import {
  annullaSfida,
  creaSfida,
  listaSfideConStato,
  ripetiSfida,
  scadiTurniSfida,
  type SfidaConStato,
} from '@/api/sfide';
import { supabase } from '@/lib/supabase';

/**
 * Elenco delle sfide del gruppo (con lo stato del turno corrente e se ho
 * già votato - necessario per raggruppare la pagina sfide/index.tsx senza
 * una query per sfida, Task 16), Realtime e mutazioni di
 * creazione/ripetizione/annullamento/sincronizzazione scadenze.
 *
 * sfide_turni non ha una colonna gruppo_id diretta (vedi design doc §1 e
 * la Ruling di Task 5: solo sfida_id) - il filtro Realtime Postgres non
 * supporta join, quindi quel canale non può essere filtrato per gruppo e
 * si sottoscrive a tutti i turni, invalidando comunque solo la query di
 * QUESTO gruppo. Nessuna fuga di dati: l'evento serve solo a far
 * rieseguire una query già filtrata lato server (RLS + gruppo_id).
 */
export function useSfide(gruppoId: string | null) {
  const queryClient = useQueryClient();
  const chiaveQuery = ['sfide', gruppoId];
  const idIstanza = useId();

  const query = useQuery({
    queryKey: chiaveQuery,
    enabled: gruppoId !== null,
    queryFn: () => listaSfideConStato(gruppoId as string),
  });

  const invalida = () => queryClient.invalidateQueries({ queryKey: chiaveQuery });

  useEffect(() => {
    if (gruppoId === null) {
      return;
    }

    const canale = supabase
      .channel(`sfide:${gruppoId}:${idIstanza}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sfide_scelta', filter: `gruppo_id=eq.${gruppoId}` },
        invalida
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sfide_turni' }, invalida)
      .subscribe();

    return () => {
      supabase.removeChannel(canale);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gruppoId, idIstanza]);

  const crea = useMutation({
    mutationFn: (params: Parameters<typeof creaSfida>[0]) => creaSfida(params),
    onSuccess: invalida,
  });

  const ripeti = useMutation({
    mutationFn: (sfidaId: string) => ripetiSfida(sfidaId),
    onSuccess: invalida,
  });

  const annulla = useMutation({
    mutationFn: (sfidaId: string) => annullaSfida(sfidaId),
    onSuccess: invalida,
  });

  const sincronizzaScadenze = useMutation({
    mutationFn: () => scadiTurniSfida(gruppoId as string),
    onSuccess: invalida,
  });

  return {
    sfide: query.data ?? ([] as SfidaConStato[]),
    isLoading: query.isLoading,
    error: query.error,
    crea,
    ripeti,
    annulla,
    sincronizzaScadenze,
  };
}
