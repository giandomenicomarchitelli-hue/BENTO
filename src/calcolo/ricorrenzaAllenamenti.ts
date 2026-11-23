// A differenza di faccende/impegni, qui non c'è nulla da "generare in
// anticipo": quali giorni della settimana corrispondono a una scheda è
// puro calcolo (giorni_settimana + il giorno della settimana della data),
// nessuna scadenza/promemoria da materializzare. Riusa gli helper data già
// scritti per le faccende invece di duplicarli.
import { aggiungiGiorni, giornoSettimanaISO, inizioSettimanaISO } from './ricorrenzaFaccende';

export interface SchedaAllenamento {
  id: string;
  /** 1=lunedì..7=domenica (ISO), stesso schema di faccende.giorni_settimana. */
  giorniSettimana: number[];
}

/** I 7 giorni (lunedì-domenica) della settimana di calendario che contiene dataISO. */
export function giorniDellaSettimana(dataISO: string): string[] {
  const lunedi = inizioSettimanaISO(dataISO);
  return Array.from({ length: 7 }, (_, indice) => aggiungiGiorni(lunedi, indice));
}

/** Le schede il cui giorno della settimana include questa data. */
export function schedeDelGiorno<T extends SchedaAllenamento>(schede: T[], dataISO: string): T[] {
  const giorno = giornoSettimanaISO(dataISO);
  return schede.filter((scheda) => scheda.giorniSettimana.includes(giorno));
}
