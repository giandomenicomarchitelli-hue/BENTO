/**
 * Griglia mensile del calendario: tutte le settimane lun-dom che coprono
 * il mese dato, incluse le code di fine/inizio mese adiacente necessarie a
 * completare la prima e l'ultima settimana. Puro e testabile, stesso
 * approccio delle utilità di calendario in ricorrenzaFaccende.ts.
 */

import {
  aggiungiGiorni,
  fineMeseISO,
  fineSettimanaISO,
  inizioMeseISO,
  inizioSettimanaISO,
} from './ricorrenzaFaccende';

export interface CellaGriglia {
  /** YYYY-MM-DD */
  dataISO: string;
  /** false per i giorni del mese precedente/successivo usati per completare la settimana. */
  delMeseCorrente: boolean;
}

/** `annoMeseISO` = YYYY-MM-01. Ritorna tutte le celle, settimane complete lun-dom, che coprono il mese. */
export function celleGrigliaMese(annoMeseISO: string): CellaGriglia[] {
  const primoGiorno = inizioMeseISO(annoMeseISO);
  const ultimoGiorno = fineMeseISO(annoMeseISO);
  const meseCorrente = annoMeseISO.slice(0, 7); // YYYY-MM

  const inizio = inizioSettimanaISO(primoGiorno);
  const fine = fineSettimanaISO(ultimoGiorno);

  const celle: CellaGriglia[] = [];
  let cursore = inizio;
  while (cursore <= fine) {
    celle.push({ dataISO: cursore, delMeseCorrente: cursore.slice(0, 7) === meseCorrente });
    cursore = aggiungiGiorni(cursore, 1);
  }
  return celle;
}
