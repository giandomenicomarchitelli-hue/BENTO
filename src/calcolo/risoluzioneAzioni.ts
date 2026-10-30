import { dividiEqualmente } from './divisioni';

export interface MembroRisolvibile {
  id: string;
  nome: string;
}

/**
 * Risolve un nome (es. estratto dall'interpretazione di una frase) a un
 * membro del gruppo. Confronto case-insensitive e senza spazi iniziali/
 * finali; `non_risolto` se nessun membro corrisponde o se più membri
 * omonimi corrispondono (ambiguità da far chiarire all'utente).
 */
export function risolviNome(
  nome: string,
  membri: MembroRisolvibile[]
): { stato: 'risolto'; membroId: string } | { stato: 'non_risolto' } {
  const nomeConfronto = nome.trim().toLowerCase();
  const corrispondenze = membri.filter((membro) => membro.nome.trim().toLowerCase() === nomeConfronto);

  if (corrispondenze.length !== 1) {
    return { stato: 'non_risolto' };
  }

  return { stato: 'risolto', membroId: corrispondenze[0].id };
}

/**
 * Riordina gli id dei membri secondo l'ordine canonico del gruppo, così
 * che la divisione di una spesa sia deterministica indipendentemente
 * dall'ordine in cui l'LLM ha elencato i nomi.
 */
export function ordinaSecondoMembriAttivi(idsMembri: string[], ordineCanonico: string[]): string[] {
  return ordineCanonico.filter((id) => idsMembri.includes(id));
}

/**
 * Calcola le quote di un acquisto diviso equamente tra gli id ordinati
 * (già passati per `ordinaSecondoMembriAttivi`): la divisione resta a
 * codice deterministico, non all'LLM.
 */
export function calcolaQuoteAcquisto(
  importoCentesimi: number,
  idsOrdinati: string[]
): { membroId: string; quotaCentesimi: number }[] {
  const quote = dividiEqualmente(importoCentesimi, idsOrdinati.length);
  return idsOrdinati.map((membroId, indice) => ({ membroId, quotaCentesimi: quote[indice] }));
}
