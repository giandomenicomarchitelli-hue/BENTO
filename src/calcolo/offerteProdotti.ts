import { normalizzaTesto } from './normalizzazioneTesto';
import type { OffertaProdotto } from './tipi';

/**
 * Trova le offerte il cui nome prodotto INIZIA con le parole del nome
 * articolo, nello stesso ordine (match di parole intere, non di
 * sottostringa: "aranc" non deve trovare "aranciata"). Nei dati dei
 * volantini il nome del prodotto comincia sempre con l'ingrediente/prodotto
 * vero e proprio - la marca è un campo a parte - quindi richiedere il
 * prefisso invece di "contiene ovunque" evita falsi positivi come "olio"
 * che troverebbe "Tonno in Olio di Oliva" solo perché la parola compare a
 * metà nome. Risultati ordinati per prezzo crescente, così il più
 * conveniente è sempre il primo.
 */
export function trovaOfferteCorrispondenti(
  nomeArticolo: string,
  offerte: OffertaProdotto[]
): OffertaProdotto[] {
  const paroleArticolo = normalizzaTesto(nomeArticolo).split(' ').filter(Boolean);
  if (paroleArticolo.length === 0) return [];

  return offerte
    .filter((offerta) => {
      const paroleOfferta = normalizzaTesto(offerta.nome).split(' ');
      return paroleArticolo.every((parola, indice) => paroleOfferta[indice] === parola);
    })
    .sort((a, b) => a.prezzoCentesimi - b.prezzoCentesimi);
}

/**
 * Filtra le offerte alle sole catene scelte dal gruppo (impostazioni_spesa).
 * `null` o array vuoto = nessun filtro, tutte le catene restano visibili -
 * comportamento di default finché il gruppo non sceglie esplicitamente un
 * sottoinsieme.
 */
export function filtraPerCatenePreferite(
  offerte: OffertaProdotto[],
  catenePreferite: string[] | null
): OffertaProdotto[] {
  if (catenePreferite === null || catenePreferite.length === 0) {
    return offerte;
  }
  const catene = new Set(catenePreferite);
  return offerte.filter((offerta) => catene.has(offerta.catena));
}

/** Catene distinte tra le offerte disponibili, in ordine alfabetico - per popolare il selettore. */
export function cateneDisponibili(offerte: OffertaProdotto[]): string[] {
  return [...new Set(offerte.map((o) => o.catena))].sort((a, b) => a.localeCompare(b));
}
