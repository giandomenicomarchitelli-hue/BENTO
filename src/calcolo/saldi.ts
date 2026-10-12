import type { Spesa, Transazione } from './tipi';

/**
 * Saldo netto per membro: positivo = deve ricevere, negativo = deve pagare.
 * Include anche i membri senza spese (saldo 0), per supportare N membri.
 * La somma di tutti i saldi restituiti è sempre 0.
 */
export function calcolaSaldiNetti(spese: Spesa[], membriIds: string[]): Map<string, number> {
  const saldi = new Map<string, number>();
  for (const membroId of membriIds) {
    saldi.set(membroId, 0);
  }

  for (const spesa of spese) {
    saldi.set(spesa.pagatoDa, (saldi.get(spesa.pagatoDa) ?? 0) + spesa.importoCentesimi);
    for (const quota of spesa.quote) {
      saldi.set(quota.membroId, (saldi.get(quota.membroId) ?? 0) - quota.quotaCentesimi);
    }
  }

  return saldi;
}

/**
 * Date le posizioni nette, genera le transazioni che le azzerano,
 * minimizzando il numero di trasferimenti con un algoritmo greedy: ad ogni
 * passo abbina il maggior debitore al maggior creditore. Al massimo N-1
 * transazioni per N membri con saldo diverso da zero.
 *
 * La minimizzazione esatta del numero di transazioni è un problema di
 * partizione NP-hard in generale; il greedy è lo standard pratico, O(N log N)
 * per passo, ed è più che adeguato per gruppi piccoli (coppie, case, uffici,
 * viaggi tra amici).
 */
export function semplificaDebiti(saldiNetti: Map<string, number>): Transazione[] {
  const debitori: { membroId: string; importoCentesimi: number }[] = [];
  const creditori: { membroId: string; importoCentesimi: number }[] = [];

  for (const [membroId, saldo] of saldiNetti) {
    if (saldo < 0) {
      debitori.push({ membroId, importoCentesimi: -saldo });
    } else if (saldo > 0) {
      creditori.push({ membroId, importoCentesimi: saldo });
    }
  }

  const transazioni: Transazione[] = [];

  while (debitori.length > 0 && creditori.length > 0) {
    debitori.sort((a, b) => b.importoCentesimi - a.importoCentesimi);
    creditori.sort((a, b) => b.importoCentesimi - a.importoCentesimi);

    const debitore = debitori[0];
    const creditore = creditori[0];
    const importoCentesimi = Math.min(debitore.importoCentesimi, creditore.importoCentesimi);

    transazioni.push({ da: debitore.membroId, a: creditore.membroId, importoCentesimi });

    debitore.importoCentesimi -= importoCentesimi;
    creditore.importoCentesimi -= importoCentesimi;

    if (debitore.importoCentesimi === 0) {
      debitori.shift();
    }
    if (creditore.importoCentesimi === 0) {
      creditori.shift();
    }
  }

  return transazioni;
}

/** Chi deve cosa a chi, calcolato direttamente dalle spese di un gruppo. */
export function calcolaSaldi(spese: Spesa[], membriIds: string[]): Transazione[] {
  return semplificaDebiti(calcolaSaldiNetti(spese, membriIds));
}
