import { useQuery } from '@tanstack/react-query';

import { leggiGruppo } from '@/api/gruppi';
import { listaMembri } from '@/api/membri';
import { useGruppoAttivoStore } from '@/store/gruppoAttivoStore';

/** Dati completi (gruppo + membri) del gruppo attualmente selezionato. */
export function useGruppoAttivo() {
  const gruppoAttivoId = useGruppoAttivoStore((stato) => stato.gruppoAttivoId);

  const query = useQuery({
    queryKey: ['gruppo-attivo', gruppoAttivoId],
    enabled: gruppoAttivoId !== null,
    queryFn: async () => {
      const id = gruppoAttivoId as string;
      const [gruppo, membri] = await Promise.all([leggiGruppo(id), listaMembri(id)]);
      return { gruppo, membri };
    },
  });

  return {
    gruppoAttivoId,
    gruppo: query.data?.gruppo ?? null,
    membri: query.data?.membri ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}
