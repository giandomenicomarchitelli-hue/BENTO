/**
 * Normalizza un testo per confrontarlo con un altro (es. due proposte
 * personalizzate nella stessa sfida). Appiattisce solo differenze di
 * forma - spazi, maiuscole, rappresentazione Unicode - mai il
 * significato: "pizza" e "pizze", o "Pizza" e "Pizzeria", restano
 * testi diversi di proposito (scelta esplicita della spec: evitare di
 * fondere automaticamente termini semanticamente diversi).
 */
export function normalizzaTesto(testo: string): string {
  return testo.normalize('NFKC').trim().toLocaleLowerCase('it-IT').replace(/\s+/g, ' ');
}
