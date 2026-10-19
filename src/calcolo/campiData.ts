/**
 * Helper per campi di data/ora inseriti a mano (gg/mm/aaaa/hh/min), senza
 * alcuna libreria di calendario - vedi `app/(app)/sfide/nuova.tsx` e
 * `app/(app)/sfide/[id].tsx`. Un valore fuori range (mese 13, ora 25...)
 * costruisce una stringa `new Date(...)` che fa lanciare `.toISOString()`
 * con RangeError durante il render: questi helper lo impediscono alla
 * fonte invece di lasciare che il crash si propaghi.
 */

/** Numero a 2 cifre, sempre dentro [min, max]; il fallback (già a sua volta dentro il range) copre un testo non numerico o vuoto. */
export function campoNumericoSicuro(valore: string, fallback: number, min: number, max: number): string {
  const n = valore.trim() === '' ? NaN : Math.trunc(Number(valore));
  const sicuro = Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback;
  return String(sicuro).padStart(2, '0');
}

/**
 * Un Date valido per una stringa `YYYY-MM-DDTHH:mm`, o null se non
 * rappresenta un istante reale. `new Date('2026-02-30T12:00')` non lancia
 * - normalizza silenziosamente al 2 marzo - quindi non basta controllare
 * `Number.isNaN(d.getTime())`: va confrontato il giorno/mese/anno
 * richiesti con quelli che il Date risultante riporta davvero.
 */
export function dataSicura(iso: string): Date | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  const corrispondenza = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (corrispondenza === null) {
    return d;
  }
  const [, anno, mese, giorno] = corrispondenza;
  if (d.getFullYear() !== Number(anno) || d.getMonth() + 1 !== Number(mese) || d.getDate() !== Number(giorno)) {
    return null;
  }
  return d;
}
