/**
 * Divide un importo in centesimi tra N persone in parti uguali, in modo
 * deterministico: il resto (in centesimi) va ai primi elementi dell'array.
 * La somma dei valori restituiti è sempre esattamente importoCentesimi.
 *
 * Es. dividiEqualmente(100, 3) => [34, 33, 33]
 */
export function dividiEqualmente(importoCentesimi: number, numPersone: number): number[] {
  if (numPersone <= 0) {
    throw new Error('numPersone deve essere maggiore di 0');
  }

  const base = Math.floor(importoCentesimi / numPersone);
  const resto = importoCentesimi % numPersone;

  return Array.from({ length: numPersone }, (_, indice) => base + (indice < resto ? 1 : 0));
}
