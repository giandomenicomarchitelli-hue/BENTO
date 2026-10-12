import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { listaMembri } from '@/api/membri';
import { useSpese } from '@/hooks/useSpese';
import { calcolaSaldi } from '@/calcolo/saldi';
import type { Spesa as SpesaCalcolo } from '@/calcolo/tipi';

/** Saldi (chi deve cosa a chi) di un gruppo, calcolati dalle sue spese attive. */
export function useSaldi(gruppoId: string | null) {
  const { spese, isLoading: speseInCaricamento, error: erroreSpese } = useSpese(gruppoId);

  const membriQuery = useQuery({
    queryKey: ['membri', gruppoId],
    enabled: gruppoId !== null,
    queryFn: () => listaMembri(gruppoId as string),
  });

  const transazioni = useMemo(() => {
    const membriIds = (membriQuery.data ?? []).map((m) => m.id);
    const speseCalcolo: SpesaCalcolo[] = spese.map((s) => ({
      id: s.id,
      pagatoDa: s.pagato_da,
      importoCentesimi: s.importo_centesimi,
      quote: s.quote_spesa.map((q) => ({
        membroId: q.membro_id,
        quotaCentesimi: q.quota_centesimi,
      })),
    }));
    return calcolaSaldi(speseCalcolo, membriIds);
  }, [spese, membriQuery.data]);

  return {
    transazioni,
    isLoading: speseInCaricamento || membriQuery.isLoading,
    error: erroreSpese ?? membriQuery.error,
  };
}
