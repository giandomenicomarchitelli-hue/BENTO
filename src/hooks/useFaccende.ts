import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useId } from 'react';

import {
  aggiornaFaccenda,
  creaFaccenda,
  eliminaFaccenda,
  importaFaccendeSuggerite,
  listaFaccende,
  type Faccenda,
  type Frequenza,
  type OrigineDelPunteggio,
  type Sforzo,
} from '@/api/faccende';
import { supabase } from '@/lib/supabase';

/** Definizioni di faccende ricorrenti del gruppo (attive e archiviate). */
export function useFaccende(gruppoId: string | null) {
  const queryClient = useQueryClient();
  const chiaveQuery = ['faccende', gruppoId];
  // Vedi commento in useArticoliSpesa.ts: nome canale univoco per montaggio.
  const idIstanza = useId();

  const query = useQuery({
    queryKey: chiaveQuery,
    enabled: gruppoId !== null,
    queryFn: () => listaFaccende(gruppoId as string),
  });

  const invalida = () => queryClient.invalidateQueries({ queryKey: chiaveQuery });

  useEffect(() => {
    if (gruppoId === null) {
      return;
    }

    const canale = supabase
      .channel(`faccende:${gruppoId}:${idIstanza}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'faccende', filter: `gruppo_id=eq.${gruppoId}` },
        invalida
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canale);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gruppoId, idIstanza]);

  const crea = useMutation({
    mutationFn: (params: {
      nome: string;
      descrizione?: string | null;
      frequenza: Frequenza;
      intervalloRicorrenza?: number | null;
      giorniSettimana?: number[] | null;
      giornoMese?: number | null;
      durataStimataMinuti?: number | null;
      sforzo: Sforzo;
      punti: number;
      origine: OrigineDelPunteggio;
      assegnataA?: string | null;
      creatoDaMembroId?: string | null;
    }) => creaFaccenda({ ...params, gruppoId: gruppoId as string }),
    onSuccess: invalida,
  });

  const aggiorna = useMutation({
    mutationFn: (params: {
      id: string;
      nome?: string;
      descrizione?: string | null;
      frequenza?: Frequenza;
      intervalloRicorrenza?: number | null;
      giorniSettimana?: number[] | null;
      giornoMese?: number | null;
      durataStimataMinuti?: number | null;
      sforzo?: Sforzo;
      punti?: number;
      origine?: OrigineDelPunteggio;
      assegnataA?: string | null;
      attiva?: boolean;
    }) => aggiornaFaccenda(params),
    onSuccess: invalida,
  });

  const archivia = useMutation({
    mutationFn: (id: string) => aggiornaFaccenda({ id, attiva: false }),
    onSuccess: invalida,
  });

  const elimina = useMutation({
    mutationFn: (id: string) => eliminaFaccenda(id),
    onSuccess: invalida,
  });

  const importaSuggerite = useMutation({
    mutationFn: () => importaFaccendeSuggerite(gruppoId as string),
    onSuccess: invalida,
  });

  return {
    faccende: query.data ?? ([] as Faccenda[]),
    isLoading: query.isLoading,
    error: query.error,
    crea,
    aggiorna,
    archivia,
    elimina,
    importaSuggerite,
  };
}
