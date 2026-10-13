import { useQuery, useQueryClient } from '@tanstack/react-query';

import { listaMembri } from '@/api/membri';
import { listaSpese } from '@/api/spese';
import { calcolaSaldi } from '@/calcolo/saldi';
import type { Spesa as SpesaCalcolo } from '@/calcolo/tipi';
import { useAuthStore } from '@/store/authStore';
import { useMieiGruppi } from '@/hooks/useMieiGruppi';

/** Il mio saldo con un'altra persona, in un singolo gruppo in comune. */
export interface SaldoPerGruppo {
  gruppoId: string;
  gruppoNome: string;
  /** Il mio membro_id e il suo, in quel gruppo - servono per registrare un saldo. */
  ilMioMembroId: string;
  altroMembroId: string;
  altroUtenteId: string;
  altroNome: string;
  /** Positivo = mi deve, negativo = devo io. */
  importoCentesimi: number;
}

/** Saldo netto con un'altra persona, sommato su tutti i gruppi in comune. */
export interface SaldoPersona {
  utenteId: string;
  nome: string;
  /** Positivo = mi deve, negativo = devo io, mai zero (le persone in pari non compaiono). */
  nettoCentesimi: number;
  gruppi: SaldoPerGruppo[];
}

const CHIAVE_QUERY_BASE = 'saldi-aggregati';

/** I miei saldi con ogni persona con cui condivido almeno un gruppo. */
export function useSaldiAggregati() {
  const { gruppi } = useMieiGruppi();
  const utenteId = useAuthStore((stato) => stato.session?.user.id);
  const idGruppi = gruppi
    .map((g) => g.id)
    .sort()
    .join(',');

  const query = useQuery({
    queryKey: [CHIAVE_QUERY_BASE, idGruppi, utenteId],
    enabled: utenteId !== undefined && gruppi.length > 0,
    queryFn: async () => {
      const righePerGruppo = await Promise.all(
        gruppi.map(async (gruppo): Promise<SaldoPerGruppo[]> => {
          const [membri, speseConQuote] = await Promise.all([
            listaMembri(gruppo.id),
            listaSpese(gruppo.id),
          ]);

          const ilMioMembro = membri.find((m) => m.utente_id === utenteId);
          if (ilMioMembro === undefined) {
            return [];
          }

          const speseCalcolo: SpesaCalcolo[] = speseConQuote.map((s) => ({
            id: s.id,
            pagatoDa: s.pagato_da,
            importoCentesimi: s.importo_centesimi,
            quote: s.quote_spesa.map((q) => ({
              membroId: q.membro_id,
              quotaCentesimi: q.quota_centesimi,
            })),
          }));

          const transazioni = calcolaSaldi(
            speseCalcolo,
            membri.map((m) => m.id)
          );

          return transazioni
            .filter((t) => t.da === ilMioMembro.id || t.a === ilMioMembro.id)
            .map((t): SaldoPerGruppo | null => {
              const sonoIlCreditore = t.a === ilMioMembro.id;
              const altroMembroId = sonoIlCreditore ? t.da : t.a;
              const altroMembro = membri.find((m) => m.id === altroMembroId);
              if (altroMembro === undefined) {
                return null;
              }
              return {
                gruppoId: gruppo.id,
                gruppoNome: gruppo.nome,
                ilMioMembroId: ilMioMembro.id,
                altroMembroId: altroMembro.id,
                altroUtenteId: altroMembro.utente_id,
                altroNome: altroMembro.nome,
                importoCentesimi: sonoIlCreditore ? t.importoCentesimi : -t.importoCentesimi,
              };
            })
            .filter((riga): riga is SaldoPerGruppo => riga !== null);
        })
      );

      // Aggrega per utente_id: la stessa persona puo' avere un membro_id (e
      // persino un nome) diverso in ogni gruppo, ma e' sempre lo stesso utente_id.
      const mappa = new Map<string, SaldoPersona>();
      for (const riga of righePerGruppo.flat()) {
        const esistente = mappa.get(riga.altroUtenteId) ?? {
          utenteId: riga.altroUtenteId,
          nome: riga.altroNome,
          nettoCentesimi: 0,
          gruppi: [],
        };
        esistente.nome = riga.altroNome;
        esistente.nettoCentesimi += riga.importoCentesimi;
        esistente.gruppi.push(riga);
        mappa.set(riga.altroUtenteId, esistente);
      }

      return Array.from(mappa.values()).filter((p) => p.nettoCentesimi !== 0);
    },
  });

  return {
    persone: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useInvalidaSaldiAggregati() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: [CHIAVE_QUERY_BASE], refetchType: 'all' });
}
