/**
 * Algoritmo deterministico (mai AI) per decidere il vincitore di un
 * turno di una sfida delle scelte. Vedi design doc §4 per il
 * ragionamento completo su vincitore/pareggio/nessun_accordo e sul
 * trattamento speciale del turno di spareggio (1 sola scelta).
 */

export type EsitoTurno = 'vincitore' | 'pareggio' | 'nessun_accordo';

export type RisultatoTurno = {
  esito: EsitoTurno;
  opzioneVincenteId: string | null;
  opzioniInParita: string[];
  conteggi: Record<string, number>;
};

export function calcolaRisultatoTurno(
  voti: { opzioneId: string; membroId: string }[],
  tipoTurno: 'iniziale' | 'nuovo_tentativo' | 'spareggio'
): RisultatoTurno {
  const conteggi: Record<string, number> = {};
  for (const voto of voti) {
    conteggi[voto.opzioneId] = (conteggi[voto.opzioneId] ?? 0) + 1;
  }

  const massimo = Math.max(0, ...Object.values(conteggi));
  const leader = Object.keys(conteggi).filter((opzioneId) => conteggi[opzioneId] === massimo);

  if (tipoTurno === 'spareggio') {
    if (leader.length === 1) {
      return { esito: 'vincitore', opzioneVincenteId: leader[0], opzioniInParita: [], conteggi };
    }
    return { esito: 'nessun_accordo', opzioneVincenteId: null, opzioniInParita: [], conteggi };
  }

  if (massimo <= 1) {
    return { esito: 'nessun_accordo', opzioneVincenteId: null, opzioniInParita: [], conteggi };
  }
  if (leader.length === 1) {
    return { esito: 'vincitore', opzioneVincenteId: leader[0], opzioniInParita: [], conteggi };
  }
  return { esito: 'pareggio', opzioneVincenteId: null, opzioniInParita: leader, conteggi };
}

export function percentualeOpzione(votiRicevuti: number, totalePartecipantiVotanti: number): number {
  if (totalePartecipantiVotanti === 0) return 0;
  return Math.round((votiRicevuti / totalePartecipantiVotanti) * 100);
}
