/**
 * Genera un id in forma UUID v4 senza `crypto.randomUUID()`, che non
 * esiste su React Native/Hermes (solo nei browser e in Node) - usato
 * come chiave di idempotenza lato client (`richiesta_id` di crea_sfida,
 * colonna `uuid` in Postgres, che rifiuta qualunque stringa non in
 * quella forma). Non serve robustezza crittografica: `Math.random()`
 * basta, l'unico requisito è non collidere con un id già esistente.
 */
export function generaIdRichiesta(): string {
  const cifre = '0123456789abcdef';
  let risultato = '';
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      risultato += '-';
    } else if (i === 14) {
      risultato += '4';
    } else if (i === 19) {
      risultato += cifre[8 + Math.floor(Math.random() * 4)];
    } else {
      risultato += cifre[Math.floor(Math.random() * 16)];
    }
  }
  return risultato;
}
