/**
 * Motore di ricorrenza degli impegni di calendario: calcola le occorrenze
 * di un impegno ricorrente fino a un orizzonte dato. Puro e testabile,
 * come ricorrenzaFaccende.ts.
 *
 * A differenza delle faccende, gli impegni possono avere un'ora specifica,
 * per cui calcoliamo sia dataISO (data di calendario) che istanteISO
 * (istante UTC preciso).
 */

import { Frequenza, dataLocaleInUtc, aggiungiGiorni, MAX_PERIODI_PER_SINCRONIZZAZIONE } from './ricorrenzaFaccende';

export interface DefinizioneRicorrenzaImpegno {
  frequenza: Frequenza;
  intervalloRicorrenza: number | null;
  dataInizio: string;
  ora: string | null;
}

export interface OccorrenzaImpegnoCalcolata {
  dataISO: string;
  istanteISO: string;
}

// --- Utilità data

/** Scompone una data ISO YYYY-MM-DD nei suoi componenti. */
function scomponiISO(dataISO: string): { anno: number; mese: number; giorno: number } {
  const [anno, mese, giorno] = dataISO.split('-').map(Number);
  return { anno, mese, giorno };
}

/** Ultimo giorno del mese che contiene questa data. */
function ultimoGiornoDelMese(anno: number, mese: number): number {
  return new Date(Date.UTC(anno, mese, 0)).getUTCDate();
}

/**
 * Somma mesi a una data mantenendo lo stesso giorno del mese,
 * clampando ai giorni corti (febbraio, aprile, giugno, settembre, novembre).
 */
export function aggiungiMesiStessoGiorno(dataISO: string, mesi: number): string {
  const { anno, mese, giorno } = scomponiISO(dataISO);
  const nuovoMese = mese + mesi;
  const nuovoAnno = anno + Math.floor((nuovoMese - 1) / 12);
  const meseDestinazione = ((nuovoMese - 1) % 12) + 1;

  const ultimoGiorno = ultimoGiornoDelMese(nuovoAnno, meseDestinazione);
  const giornoDestinazione = Math.min(giorno, ultimoGiorno);

  return `${nuovoAnno}-${String(meseDestinazione).padStart(2, '0')}-${String(giornoDestinazione).padStart(2, '0')}`;
}

/**
 * Calcola l'istante UTC di un impegno con data e ora opzionale,
 * nel fuso orario indicato.
 */
export function istanteImpegno(dataISO: string, oraHHmm: string | null, fusoOrario: string): string {
  const { anno, mese, giorno } = scomponiISO(dataISO);

  let ora = 0;
  let minuto = 0;
  if (oraHHmm !== null) {
    const [h, m] = oraHHmm.split(':').map(Number);
    ora = h;
    minuto = m;
  }

  return dataLocaleInUtc(anno, mese, giorno, ora, minuto, 0, fusoOrario).toISOString();
}

/**
 * Calcola le occorrenze mancanti di un impegno ricorrente fino a un orizzonte.
 * Come calcolaPeriodiMancanti per le faccende, ma restituisce anche istanteISO.
 */
export function calcolaOccorrenzeMancantiImpegno(
  definizione: DefinizioneRicorrenzaImpegno,
  ultimaDataGenerata: string | null,
  orizzonteISO: string,
  fusoOrario: string
): OccorrenzaImpegnoCalcolata[] {
  // Un cursore precedente alla (nuova) dataInizio è lo scarto di una
  // ricorrenza appena modificata (data_inizio spostata avanti, frequenza
  // cambiata, o una_tantum corretta a una data successiva): va ignorato e
  // si riparte da dataInizio, altrimenti la serie continuerebbe dal vecchio
  // cursore invece di riallinearsi al nuovo inizio.
  const cursoreEsistente =
    ultimaDataGenerata !== null && ultimaDataGenerata < definizione.dataInizio ? null : ultimaDataGenerata;

  if (definizione.frequenza === 'una_tantum') {
    // Una_tantum produce al massimo una riga: nessun rischio di generazione
    // illimitata, quindi niente controllo sull'orizzonte - un impegno datato
    // oltre l'orizzonte non deve restare invisibile per sempre.
    if (cursoreEsistente !== null) {
      return [];
    }
    return [
      {
        dataISO: definizione.dataInizio,
        istanteISO: istanteImpegno(definizione.dataInizio, definizione.ora, fusoOrario),
      },
    ];
  }

  if (definizione.frequenza === 'giornaliera' || definizione.frequenza === 'personalizzata') {
    const passo =
      definizione.frequenza === 'personalizzata'
        ? Math.max(1, definizione.intervalloRicorrenza ?? 1)
        : 1;
    let cursore =
      cursoreEsistente !== null ? aggiungiGiorni(cursoreEsistente, passo) : definizione.dataInizio;

    const risultati: OccorrenzaImpegnoCalcolata[] = [];
    while (cursore <= orizzonteISO && risultati.length < MAX_PERIODI_PER_SINCRONIZZAZIONE) {
      risultati.push({
        dataISO: cursore,
        istanteISO: istanteImpegno(cursore, definizione.ora, fusoOrario),
      });
      cursore = aggiungiGiorni(cursore, passo);
    }
    return risultati;
  }

  if (definizione.frequenza === 'settimanale') {
    let cursore =
      cursoreEsistente !== null ? aggiungiGiorni(cursoreEsistente, 7) : definizione.dataInizio;

    const risultati: OccorrenzaImpegnoCalcolata[] = [];
    while (cursore <= orizzonteISO && risultati.length < MAX_PERIODI_PER_SINCRONIZZAZIONE) {
      risultati.push({
        dataISO: cursore,
        istanteISO: istanteImpegno(cursore, definizione.ora, fusoOrario),
      });
      cursore = aggiungiGiorni(cursore, 7);
    }
    return risultati;
  }

  // mensile
  let cursore =
    cursoreEsistente !== null
      ? aggiungiMesiStessoGiorno(cursoreEsistente, 1)
      : definizione.dataInizio;

  const risultati: OccorrenzaImpegnoCalcolata[] = [];
  while (cursore <= orizzonteISO && risultati.length < MAX_PERIODI_PER_SINCRONIZZAZIONE) {
    risultati.push({
      dataISO: cursore,
      istanteISO: istanteImpegno(cursore, definizione.ora, fusoOrario),
    });
    cursore = aggiungiMesiStessoGiorno(cursore, 1);
  }
  return risultati;
}
