import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useId } from 'react';

import {
  cancellaImpegno,
  creaImpegno,
  eliminaOccorrenzeFuture,
  leggiFusoOrarioGruppo,
  listaImpegni,
  listaOccorrenzeImpegni,
  modificaImpegno,
  sincronizzaOccorrenzeImpegni,
  type Impegno,
  type OccorrenzaImpegno,
} from '@/api/impegni';
import type { Frequenza } from '@/api/faccende';
import { supabase } from '@/lib/supabase';

interface ParametriImpegnoForm {
  membroId: string;
  titolo: string;
  descrizione: string | null;
  dataInizio: string;
  ora: string | null;
  frequenza: Frequenza;
  intervalloRicorrenza: number | null;
  promemoriaMinutiPrima: number | null;
  modificabileDaTutti: boolean;
}

/**
 * Impegni (eventi di calendario ricorrenti) del gruppo e le loro occorrenze.
 * La sincronizzazione (generazione nuove occorrenze) qui è automatica -
 * a differenza di Faccende non c'è un'azione utente ("completa") che la
 * renderebbe naturale, quindi parte da sola non appena gruppoId e fusoOrario
 * sono pronti (vedi useEffect sotto). Resta comunque idempotente/sicura da
 * richiamare più volte (vedi commento in src/api/impegni.ts).
 */
export function useImpegni(gruppoId: string | null) {
  const queryClient = useQueryClient();
  const chiaveImpegni = ['impegni', gruppoId];
  const chiaveOccorrenze = ['occorrenze-impegni', gruppoId];
  // Vedi commento in useArticoliSpesa.ts: nome canale univoco per montaggio.
  const idIstanza = useId();

  const queryImpegni = useQuery({
    queryKey: chiaveImpegni,
    enabled: gruppoId !== null,
    queryFn: () => listaImpegni(gruppoId as string),
  });

  const queryOccorrenze = useQuery({
    queryKey: chiaveOccorrenze,
    enabled: gruppoId !== null,
    queryFn: () => listaOccorrenzeImpegni(gruppoId as string),
  });

  const queryFusoOrario = useQuery({
    queryKey: ['fuso-orario-gruppo', gruppoId],
    enabled: gruppoId !== null,
    queryFn: () => leggiFusoOrarioGruppo(gruppoId as string),
  });
  const fusoOrario = queryFusoOrario.data ?? 'Europe/Rome';

  const invalidaImpegni = () => queryClient.invalidateQueries({ queryKey: chiaveImpegni });
  const invalidaOccorrenze = () => queryClient.invalidateQueries({ queryKey: chiaveOccorrenze });
  const invalidaTutto = () => {
    invalidaImpegni();
    invalidaOccorrenze();
  };

  // Risincronizzazione automatica una tantum: parte quando gruppoId e il
  // fuso orario (dal DB, non il fallback) sono entrambi pronti, non ad ogni
  // render - stesso ruolo del bottone "sincronizza" di Faccende.
  useEffect(() => {
    if (gruppoId === null || queryFusoOrario.data === undefined) {
      return;
    }
    sincronizzaOccorrenzeImpegni(gruppoId, queryFusoOrario.data)
      .then(invalidaOccorrenze)
      .catch(() => {
        // Errore silenzioso: la prossima apertura/realtime riprova; nessuna UI dipende da questo effetto.
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gruppoId, queryFusoOrario.data]);

  // Aggiorna le liste quando un altro membro/dispositivo crea, modifica o
  // cancella un impegno, o quando una sincronizzazione genera occorrenze.
  useEffect(() => {
    if (gruppoId === null) {
      return;
    }

    const canale = supabase
      .channel(`impegni:${gruppoId}:${idIstanza}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'impegni', filter: `gruppo_id=eq.${gruppoId}` },
        invalidaImpegni
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'occorrenze_impegni', filter: `gruppo_id=eq.${gruppoId}` },
        invalidaOccorrenze
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canale);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gruppoId, idIstanza]);

  const crea = useMutation({
    mutationFn: (params: ParametriImpegnoForm) => creaImpegno({ ...params, gruppoId: gruppoId as string }),
    onSuccess: async () => {
      invalidaTutto();
      // Genera subito le occorrenze del nuovo impegno, senza aspettare un altro trigger.
      if (gruppoId !== null) {
        await sincronizzaOccorrenzeImpegni(gruppoId, fusoOrario);
        invalidaOccorrenze();
      }
    },
  });

  const modifica = useMutation({
    // Un'unica mutationFn orchestra le tre chiamate in sequenza: dal punto
    // di vista della UI "modifica" è un'unica operazione atomica.
    mutationFn: async (params: { id: string } & Omit<ParametriImpegnoForm, 'membroId'>) => {
      const { id, ...resto } = params;
      await modificaImpegno(id, resto);
      // Le occorrenze future vengono rigenerate da zero con i nuovi parametri; quelle passate restano intatte.
      await eliminaOccorrenzeFuture(id);
      if (gruppoId !== null) {
        await sincronizzaOccorrenzeImpegni(gruppoId, fusoOrario);
      }
    },
    onSuccess: invalidaTutto,
  });

  const cancella = useMutation({
    mutationFn: (id: string) => cancellaImpegno(id),
    onSuccess: invalidaTutto,
  });

  return {
    impegni: queryImpegni.data ?? ([] as Impegno[]),
    occorrenze: queryOccorrenze.data ?? ([] as OccorrenzaImpegno[]),
    fusoOrario,
    isLoading: queryImpegni.isLoading || queryOccorrenze.isLoading,
    error: queryImpegni.error ?? queryOccorrenze.error,
    crea,
    modifica,
    cancella,
  };
}
