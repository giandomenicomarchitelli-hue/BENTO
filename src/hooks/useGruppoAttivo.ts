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

  const membri = query.data?.membri ?? [];

  return {
    gruppoAttivoId,
    gruppo: query.data?.gruppo ?? null,
    // Tutti i membri, compresi quelli usciti: serve per risalire ai nomi
    // nelle spese passate (chi ha pagato/diviso una spesa vecchia).
    membri,
    // Solo i membri attuali: per i selettori "pagato da"/"diviso tra" di
    // una nuova spesa, o per l'elenco membri della schermata gruppo.
    membriAttivi: membri.filter((m) => m.uscito_il === null),
    isLoading: query.isLoading,
    error: query.error,
  };
}
