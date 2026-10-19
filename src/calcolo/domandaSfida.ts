/**
 * Deduce la categoria di una lista dal suo nome e genera la domanda
 * naturale della sfida di conseguenza. Deterministico, a template -
 * nessun LLM in questa fase (vedi design doc).
 */
import type { EsitoDatazione } from '@/calcolo/datazioneSfida';
import { normalizzaTesto } from '@/calcolo/normalizzazioneTesto';
import { aggiungiGiorni, dataLocaleISO, giornoSettimanaISO } from '@/calcolo/ricorrenzaFaccende';

export type Categoria = 'cibo' | 'ristoranti' | 'film' | 'attivita' | 'viaggi' | 'giochi';

// Prima corrispondenza vince, in quest'ordine.
const PAROLE_CHIAVE: [Categoria, string[]][] = [
  ['cibo', ['mangi', 'cena', 'pranzo', 'cibo', 'ricett', 'food']],
  ['ristoranti', ['ristorant', 'pizzer', 'trattori', 'osteri', 'local']],
  ['film', ['film', 'cinema', 'serie', 'netflix']],
  ['attivita', ['attivit', 'fare', 'uscite']],
  ['viaggi', ['viaggi', 'weekend fuori', 'gite', 'vacanz']],
  ['giochi', ['giochi', 'gioco', 'board game']],
];

export function deduciCategoria(nomeLista: string): Categoria | null {
  const normalizzato = normalizzaTesto(nomeLista);
  for (const [categoria, parole] of PAROLE_CHIAVE) {
    if (parole.some((parola) => normalizzato.includes(parola))) {
      return categoria;
    }
  }
  return null;
}

const NOMI_GIORNI: Record<number, string> = {
  1: 'lunedì',
  2: 'martedì',
  3: 'mercoledì',
  4: 'giovedì',
  5: 'venerdì',
  6: 'sabato',
  7: 'domenica',
};

function nomeGiornoSettimana(dataISO: string): string {
  return NOMI_GIORNI[giornoSettimanaISO(dataISO)];
}

/**
 * Etichetta breve da inserire in una domanda ("stasera", "sabato",
 * "venerdì sera", "nel weekend", "il prossimo weekend"...). Calcolata
 * solo da `esito` + `adesso` + `fusoOrario`, non dalla scelta rapida
 * originale (che qui non è disponibile): un turno/fascia che ricade
 * oggi/domani usa "stasera"/"domani (sera)", uno sull'arco sabato-
 * domenica usa "nel weekend" o "il prossimo weekend" a seconda di
 * quanto è lontano, altrimenti il nome del giorno.
 */
function etichettaQuando(esito: EsitoDatazione, adesso: Date, fusoOrario: string): string {
  const oggiISO = dataLocaleISO(adesso, fusoOrario);
  const domaniISO = aggiungiGiorni(oggiISO, 1);
  const inizioDataISO = dataLocaleISO(new Date(esito.inizioISO), fusoOrario);

  if (esito.precisione === 'fascia') {
    if (inizioDataISO === oggiISO) return 'stasera';
    if (inizioDataISO === domaniISO) return 'domani sera';
    return `${nomeGiornoSettimana(inizioDataISO)} sera`;
  }

  if (esito.precisione === 'giorno') {
    const fineDataISO = esito.fineISO !== null ? dataLocaleISO(new Date(esito.fineISO), fusoOrario) : inizioDataISO;
    const unGiornoDopo = aggiungiGiorni(inizioDataISO, 1);
    const eUnWeekend = fineDataISO === unGiornoDopo && giornoSettimanaISO(inizioDataISO) === 6;

    if (eUnWeekend) {
      const giorniDaOggi =
        (new Date(`${inizioDataISO}T00:00:00Z`).getTime() - new Date(`${oggiISO}T00:00:00Z`).getTime()) /
        86400000;
      return giorniDaOggi <= 6 ? 'nel weekend' : 'il prossimo weekend';
    }
    if (inizioDataISO === oggiISO) return 'oggi';
    if (inizioDataISO === domaniISO) return 'domani';
    return nomeGiornoSettimana(inizioDataISO);
  }

  // 'orario'
  const ora = new Intl.DateTimeFormat('it-IT', {
    timeZone: fusoOrario,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(esito.inizioISO));
  if (inizioDataISO === oggiISO) return `oggi alle ${ora}`;
  if (inizioDataISO === domaniISO) return `domani alle ${ora}`;
  return `${nomeGiornoSettimana(inizioDataISO)} alle ${ora}`;
}

export function generaDomanda(
  categoria: Categoria | null,
  esito: EsitoDatazione,
  adesso: Date,
  fusoOrario: string
): string {
  const quando = etichettaQuando(esito, adesso, fusoOrario);

  switch (categoria) {
    case 'cibo':
      return `Cosa vuoi mangiare ${quando}?`;
    case 'ristoranti':
      return esito.precisione === 'fascia' ? `Dove vuoi andare a cena ${quando}?` : `Dove vuoi mangiare ${quando}?`;
    case 'film':
      return quando === 'stasera' ? 'Che film vuoi guardare stasera?' : `Che film vuoi vedere ${quando}?`;
    case 'attivita':
      return `Cosa vuoi fare ${quando}?`;
    case 'viaggi':
      return `Dove vuoi andare ${quando}?`;
    case 'giochi':
      return `A cosa vuoi giocare ${quando}?`;
    default:
      return `Quale opzione scegliamo per ${quando}?`;
  }
}
