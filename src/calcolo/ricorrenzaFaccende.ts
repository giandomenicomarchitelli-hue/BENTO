/**
 * Motore di ricorrenza delle faccende: dato di quando è stata generata
 * l'ultima occorrenza (o nessuna), calcola quali nuovi periodi mancano fino
 * a "oggi" nel fuso orario del gruppo. Puro e testabile - stesso approccio
 * già usato per calcolaSaldi() in saldi.ts: la logica vive qui, il database
 * si limita a persistere il risultato in modo idempotente (vincolo
 * unique(faccenda_id, periodo_inizio) + upsert ON CONFLICT DO NOTHING lato
 * client, vedi src/api/faccende.ts).
 *
 * Nessuna dipendenza da librerie di date: la conversione fuso orario usa
 * Intl.DateTimeFormat, già disponibile in Hermes (Expo) e in Node (Jest)
 * con dati ICU completi, per non aggiungere una nuova dipendenza solo per
 * questo.
 */

export type Frequenza = 'giornaliera' | 'settimanale' | 'mensile' | 'personalizzata' | 'una_tantum';

export interface DefinizioneRicorrenza {
  frequenza: Frequenza;
  /** "Ogni N giorni", solo per frequenza = 'personalizzata'. */
  intervalloRicorrenza: number | null;
  /** 1 = lunedì ... 7 = domenica. Giorni preferiti per 'settimanale'; array vuoto o null = qualsiasi giorno. */
  giorniSettimana: number[] | null;
  /** 1-31. Giorno preferito del mese, solo per 'mensile' (gestisce i mesi più corti). */
  giornoMese: number | null;
  /** Istante di creazione della faccenda (ISO) - ancora per la primissima occorrenza. */
  creatoIl: string;
}

export interface PeriodoOccorrenza {
  /** YYYY-MM-DD */
  periodoInizio: string;
  /** YYYY-MM-DD */
  periodoFine: string;
  /** ISO, fine giornata del giorno di scadenza nel fuso orario del gruppo. */
  scadenza: string;
}

/**
 * Limite di sicurezza per singola sincronizzazione: evita di generare
 * all'infinito se una faccenda giornaliera resta inattiva per mesi/anni
 * (es. gruppo non aperto per molto tempo). Chi vuole raggiungere oggi può
 * semplicemente richiamare la sincronizzazione più volte.
 */
export const MAX_PERIODI_PER_SINCRONIZZAZIONE = 60;

// --- Utilità data/fuso orario -----------------------------------------

/** Scompone un istante nei suoi componenti di calendario in un dato fuso orario. */
function scomponiInFuso(
  istante: Date,
  fusoOrario: string
): { anno: number; mese: number; giorno: number; ora: number; minuto: number; secondo: number } {
  const parti = new Intl.DateTimeFormat('en-US', {
    timeZone: fusoOrario,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(istante);

  const valore = (tipo: string): number => Number(parti.find((p) => p.type === tipo)?.value ?? '0');
  const ora = valore('hour');

  return {
    anno: valore('year'),
    mese: valore('month'),
    giorno: valore('day'),
    // Intl con hour12:false può restituire "24" per mezzanotte invece di "00".
    ora: ora === 24 ? 0 : ora,
    minuto: valore('minute'),
    secondo: valore('second'),
  };
}

/**
 * Converte una data/ora "locale" (nel fuso orario indicato) nell'istante UTC
 * corrispondente. Algoritmo a convergenza in due passi, standard per questo
 * problema senza una libreria di fusi orari: si parte da un'ipotesi (quei
 * componenti interpretati come UTC), si misura di quanto è sbagliata
 * ri-scomponendola nel fuso di destinazione, e si corregge. Due iterazioni
 * bastano anche nei rari casi limite attorno a un cambio d'ora.
 */
export function dataLocaleInUtc(
  anno: number,
  mese: number,
  giorno: number,
  ora: number,
  minuto: number,
  secondo: number,
  fusoOrario: string
): Date {
  const voluto = Date.UTC(anno, mese - 1, giorno, ora, minuto, secondo);
  let istante = voluto;

  for (let i = 0; i < 2; i++) {
    const ottenuto = scomponiInFuso(new Date(istante), fusoOrario);
    const ottenutoUtc = Date.UTC(
      ottenuto.anno,
      ottenuto.mese - 1,
      ottenuto.giorno,
      ottenuto.ora,
      ottenuto.minuto,
      ottenuto.secondo
    );
    istante += voluto - ottenutoUtc;
  }

  return new Date(istante);
}

/** Data di calendario (YYYY-MM-DD) corrispondente a un istante, nel fuso orario indicato. */
export function dataLocaleISO(istante: Date, fusoOrario: string): string {
  // en-CA formatta nativamente come YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: fusoOrario,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(istante);
}

function scomponiISO(dataISO: string): { anno: number; mese: number; giorno: number } {
  const [anno, mese, giorno] = dataISO.split('-').map(Number);
  return { anno, mese, giorno };
}

/** Fine giornata (23:59:59) di una data di calendario, nel fuso orario indicato, come istante ISO (UTC). */
export function fineGiornoISO(dataISO: string, fusoOrario: string): string {
  const { anno, mese, giorno } = scomponiISO(dataISO);
  return dataLocaleInUtc(anno, mese, giorno, 23, 59, 59, fusoOrario).toISOString();
}

/** Somma (o sottrae, con un numero negativo) giorni a una data di calendario YYYY-MM-DD. */
export function aggiungiGiorni(dataISO: string, giorni: number): string {
  const { anno, mese, giorno } = scomponiISO(dataISO);
  const d = new Date(Date.UTC(anno, mese - 1, giorno + giorni));
  return d.toISOString().slice(0, 10);
}

/** Giorno della settimana ISO: 1 = lunedì ... 7 = domenica. */
export function giornoSettimanaISO(dataISO: string): number {
  const { anno, mese, giorno } = scomponiISO(dataISO);
  const dow = new Date(Date.UTC(anno, mese - 1, giorno)).getUTCDay(); // 0 = domenica ... 6 = sabato
  return dow === 0 ? 7 : dow;
}

/** Lunedì della settimana (lun-dom) che contiene questa data. */
export function inizioSettimanaISO(dataISO: string): string {
  return aggiungiGiorni(dataISO, -(giornoSettimanaISO(dataISO) - 1));
}

/** Domenica della settimana (lun-dom) che contiene questa data. */
export function fineSettimanaISO(dataISO: string): string {
  return aggiungiGiorni(inizioSettimanaISO(dataISO), 6);
}

/** Primo giorno del mese che contiene questa data. */
export function inizioMeseISO(dataISO: string): string {
  const { anno, mese } = scomponiISO(dataISO);
  return `${anno}-${String(mese).padStart(2, '0')}-01`;
}

/** Ultimo giorno del mese che contiene questa data - gestisce correttamente mesi corti e anni bisestili. */
export function fineMeseISO(dataISO: string): string {
  const { anno, mese } = scomponiISO(dataISO);
  const ultimoGiorno = new Date(Date.UTC(anno, mese, 0)).getUTCDate();
  return `${anno}-${String(mese).padStart(2, '0')}-${String(ultimoGiorno).padStart(2, '0')}`;
}

/** Somma (o sottrae) mesi al primo giorno del mese di questa data, gestendo correttamente il cambio d'anno. */
export function aggiungiMesi(dataISO: string, mesi: number): string {
  const { anno, mese } = scomponiISO(dataISO);
  const d = new Date(Date.UTC(anno, mese - 1 + mesi, 1));
  return d.toISOString().slice(0, 10);
}

// --- Calcolo dei periodi mancanti --------------------------------------

function costruisciPeriodoGiorno(giornoISO: string, fusoOrario: string): PeriodoOccorrenza {
  return {
    periodoInizio: giornoISO,
    periodoFine: giornoISO,
    scadenza: fineGiornoISO(giornoISO, fusoOrario),
  };
}

/**
 * `giorniSettimana` sono i giorni preferiti, mostrati
 * all'utente come indicazione di quando conviene farla - NON la scadenza
 * reale: la faccenda resta completabile per tutta la settimana (fino a
 * domenica sera), altrimenti basterebbe che il giorno preferito passasse
 * perché l'attività diventi scaduta a metà settimana, anche se il periodo
 * è tutt'altro che finito (bug corretto in questa revisione - vedi
 * ricorrenzaFaccende.test.ts).
 */
function costruisciPeriodoSettimana(lunediISO: string, fusoOrario: string): PeriodoOccorrenza {
  const domenicaISO = aggiungiGiorni(lunediISO, 6);
  return {
    periodoInizio: lunediISO,
    periodoFine: domenicaISO,
    scadenza: fineGiornoISO(domenicaISO, fusoOrario),
  };
}

/** Stesso ragionamento di costruisciPeriodoSettimana: `giornoMese` è solo indicativo, la scadenza reale è la fine del mese. */
function costruisciPeriodoMese(primoGiornoISO: string, fusoOrario: string): PeriodoOccorrenza {
  const ultimoGiornoISO = fineMeseISO(primoGiornoISO);
  return {
    periodoInizio: primoGiornoISO,
    periodoFine: ultimoGiornoISO,
    scadenza: fineGiornoISO(ultimoGiornoISO, fusoOrario),
  };
}

/**
 * Calcola i periodi (occorrenze) mancanti di una faccenda ricorrente, da
 * subito dopo `ultimoPeriodoGenerato` (o dalla sua creazione, se non è mai
 * stata generata nessuna occorrenza) fino a `oggiISO` incluso.
 *
 * Non scrive nulla: restituisce solo l'elenco di periodi da inserire. Chi
 * chiama (src/api/faccende.ts) li upserta con ON CONFLICT DO NOTHING sul
 * vincolo unique(faccenda_id, periodo_inizio), così la generazione resta
 * corretta anche se questa funzione viene chiamata più volte o da più
 * dispositivi contemporaneamente con lo stesso risultato.
 */
export function calcolaPeriodiMancanti(
  definizione: DefinizioneRicorrenza,
  ultimoPeriodoGenerato: string | null,
  oggiISO: string,
  fusoOrario: string
): PeriodoOccorrenza[] {
  const dataCreazioneISO = dataLocaleISO(new Date(definizione.creatoIl), fusoOrario);

  if (definizione.frequenza === 'una_tantum') {
    if (ultimoPeriodoGenerato !== null) {
      return [];
    }
    return [costruisciPeriodoGiorno(dataCreazioneISO, fusoOrario)];
  }

  if (definizione.frequenza === 'giornaliera' || definizione.frequenza === 'personalizzata') {
    const passo =
      definizione.frequenza === 'personalizzata' ? Math.max(1, definizione.intervalloRicorrenza ?? 1) : 1;
    let cursore = ultimoPeriodoGenerato !== null ? aggiungiGiorni(ultimoPeriodoGenerato, passo) : dataCreazioneISO;

    const risultati: PeriodoOccorrenza[] = [];
    while (cursore <= oggiISO && risultati.length < MAX_PERIODI_PER_SINCRONIZZAZIONE) {
      risultati.push(costruisciPeriodoGiorno(cursore, fusoOrario));
      cursore = aggiungiGiorni(cursore, passo);
    }
    return risultati;
  }

  if (definizione.frequenza === 'settimanale') {
    let cursore =
      ultimoPeriodoGenerato !== null
        ? aggiungiGiorni(ultimoPeriodoGenerato, 7)
        : inizioSettimanaISO(dataCreazioneISO);
    const limite = fineSettimanaISO(oggiISO);

    const risultati: PeriodoOccorrenza[] = [];
    while (cursore <= limite && risultati.length < MAX_PERIODI_PER_SINCRONIZZAZIONE) {
      risultati.push(costruisciPeriodoSettimana(cursore, fusoOrario));
      cursore = aggiungiGiorni(cursore, 7);
    }
    return risultati;
  }

  // mensile
  let cursore =
    ultimoPeriodoGenerato !== null ? aggiungiMesi(ultimoPeriodoGenerato, 1) : inizioMeseISO(dataCreazioneISO);
  const limite = inizioMeseISO(oggiISO);

  const risultati: PeriodoOccorrenza[] = [];
  while (cursore <= limite && risultati.length < MAX_PERIODI_PER_SINCRONIZZAZIONE) {
    risultati.push(costruisciPeriodoMese(cursore, fusoOrario));
    cursore = aggiungiMesi(cursore, 1);
  }
  return risultati;
}
