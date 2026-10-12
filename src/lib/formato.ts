/** Formatta centesimi (interi) come importo in euro, es. 1050 -> "10,50 €". */
export function formattaEuro(centesimi: number): string {
  return `${(centesimi / 100).toFixed(2).replace('.', ',')} €`;
}

/** Converte un importo in euro scritto dall'utente (es. "10,50" o "10.5") in centesimi interi. */
export function euroInCentesimi(importo: string): number | null {
  const normalizzato = importo.trim().replace(',', '.');
  if (normalizzato === '' || Number.isNaN(Number(normalizzato))) {
    return null;
  }
  return Math.round(Number(normalizzato) * 100);
}
