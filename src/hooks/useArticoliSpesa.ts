import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useId } from 'react';

import {
  aggiornaStatoArticolo,
  aggiungiArticolo,
  eliminaArticolo,
  listaArticoli,
  type ArticoloSpesa,
} from '@/api/articoliSpesa';
import { supabase } from '@/lib/supabase';

export function useArticoliSpesa(gruppoId: string | null) {
  const queryClient = useQueryClient();
  const chiaveQuery = ['articoli-spesa', gruppoId];
  // Nome canale univoco per ogni "montaggio" dell'hook: evita collisioni se
  // un componente si smonta e rimonta rapidamente (es. navigazione avanti e
  // indietro) prima che la rimozione del canale precedente sia confermata
  // dal server — supabase.channel(stessoNome) altrimenti riuso il canale
  // già sottoscritto e genera un errore su .on() dopo subscribe().
  const idIstanza = useId();

  const query = useQuery({
    queryKey: chiaveQuery,
    enabled: gruppoId !== null,
    queryFn: () => listaArticoli(gruppoId as string),
  });

  const invalida = () => queryClient.invalidateQueries({ queryKey: chiaveQuery });

  // Aggiorna la lista quando un altro membro del gruppo la modifica.
  useEffect(() => {
    if (gruppoId === null) {
      return;
    }

    const canale = supabase
      .channel(`articoli_spesa:${gruppoId}:${idIstanza}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'articoli_spesa', filter: `gruppo_id=eq.${gruppoId}` },
        invalida
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canale);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gruppoId, idIstanza]);

  const aggiungi = useMutation({
    mutationFn: ({ nome, creatoDaMembroId }: { nome: string; creatoDaMembroId: string }) =>
      aggiungiArticolo(gruppoId as string, nome, creatoDaMembroId),
    onSuccess: invalida,
  });

  const aggiornaStato = useMutation({
    mutationFn: ({ id, stato }: { id: string; stato: ArticoloSpesa['stato'] }) =>
      aggiornaStatoArticolo(id, stato),
    onSuccess: invalida,
  });

  const elimina = useMutation({
    mutationFn: (id: string) => eliminaArticolo(id),
    onSuccess: invalida,
  });

  return {
    articoli: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    aggiungi,
    aggiornaStato,
    elimina,
  };
}
