import { aggiungiGiorni } from './ricorrenzaFaccende';

/** Ultimo giorno di cura: durataGiorni conta anche il giorno di inizio. */
export function dataFinePiano(dataInizio: string, durataGiorni: number): string {
  return aggiungiGiorni(dataInizio, durataGiorni - 1);
}

/**
 * In che giorno della cura siamo oggi (1-based), per mostrare "Giorno N di
 * durataGiorni" - sempre tra 1 e durataGiorni anche se oggi è prima
 * dell'inizio o dopo la fine (cura non ancora iniziata/già conclusa).
 */
export function giornoDellaCura(dataInizio: string, oggi: string, durataGiorni: number): number {
  const [annoInizio, meseInizio, giornoInizio] = dataInizio.split('-').map(Number);
  const [annoOggi, meseOggi, giornoOggi] = oggi.split('-').map(Number);
  const utcInizio = Date.UTC(annoInizio, meseInizio - 1, giornoInizio);
  const utcOggi = Date.UTC(annoOggi, meseOggi - 1, giornoOggi);
  const giornoGrezzo = Math.round((utcOggi - utcInizio) / 86400000) + 1;
  return Math.min(durataGiorni, Math.max(1, giornoGrezzo));
}

/** Dosi ancora nella confezione, mai negative anche se le dosi spuntate superano il previsto. */
export function doseRimanenti(quantitaConfezione: number, doseAssunte: number): number {
  return Math.max(0, quantitaConfezione - doseAssunte);
}

/**
 * La confezione sta per esaurirsi: restano meno dosi di quante se ne
 * prendano in un giorno. Soglia semplice e sempre valida qualunque sia la
 * posologia, non un numero fisso di pastiglie.
 */
export function scortaInEsaurimento(doseRimanenti: number, dosiAlGiorno: number): boolean {
  return doseRimanenti <= dosiAlGiorno;
}
