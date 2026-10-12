import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  aggiornaStatoArticolo,
  aggiungiArticolo,
  eliminaArticolo,
  listaArticoli,
  type ArticoloSpesa,
} from '@/api/articoliSpesa';

export function useArticoliSpesa(gruppoId: string | null) {
  const queryClient = useQueryClient();
  const chiaveQuery = ['articoli-spesa', gruppoId];

  const query = useQuery({
    queryKey: chiaveQuery,
    enabled: gruppoId !== null,
    queryFn: () => listaArticoli(gruppoId as string),
  });

  const invalida = () => queryClient.invalidateQueries({ queryKey: chiaveQuery });

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
