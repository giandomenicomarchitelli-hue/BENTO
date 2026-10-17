import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useId } from 'react';

import {
  annullaCompletamentoOccorrenza,
  completaOccorrenza,
  listaOccorrenze,
  sincronizzaOccorrenze,
  type OccorrenzaFaccenda,
} from '@/api/occorrenzeFaccende';
import { supabase } from '@/lib/supabase';

/**
 * Occorrenze delle faccende del gruppo. La sincronizzazione (generazione
 * nuove occorrenze + scadenzamento di quelle scadute) non è un timer: va
 * richiamata esplicitamente (vedi `sincronizza`), tipicamente all'apertura
 * della pagina Faccende - coerente con "nessun setInterval come fonte di
 * verità", la fonte di verità resta il database (vedi
 * src/api/occorrenzeFaccende.ts).
 */
export function useOccorrenzeFaccende(gruppoId: string | null, fusoOrario: string) {
  const queryClient = useQueryClient();
  const chiaveQuery = ['occorrenze-faccende', gruppoId];
  const idIstanza = useId();

  const query = useQuery({
    queryKey: chiaveQuery,
    enabled: gruppoId !== null,
    queryFn: () => listaOccorrenze(gruppoId as string),
  });

  const invalida = () => queryClient.invalidateQueries({ queryKey: chiaveQuery });

  // Aggiorna la lista quando un altro membro completa/annulla un'occorrenza,
  // o quando una sincronizzazione (anche la propria, su un altro schermo)
  // genera nuove occorrenze.
  useEffect(() => {
    if (gruppoId === null) {
      return;
    }

    const canale = supabase
      .channel(`occorrenze-faccende:${gruppoId}:${idIstanza}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'occorrenze_faccende', filter: `gruppo_id=eq.${gruppoId}` },
        invalida
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canale);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gruppoId, idIstanza]);

  const sincronizza = useMutation({
    mutationFn: () => sincronizzaOccorrenze(gruppoId as string, fusoOrario),
    onSuccess: invalida,
  });

  const completa = useMutation({
    mutationFn: (occorrenzaId: string) => completaOccorrenza(occorrenzaId),
    onSuccess: invalida,
  });

  const annullaCompletamento = useMutation({
    mutationFn: (occorrenzaId: string) => annullaCompletamentoOccorrenza(occorrenzaId),
    onSuccess: invalida,
  });

  return {
    occorrenze: query.data ?? ([] as OccorrenzaFaccenda[]),
    isLoading: query.isLoading,
    error: query.error,
    sincronizza,
    completa,
    annullaCompletamento,
  };
}
