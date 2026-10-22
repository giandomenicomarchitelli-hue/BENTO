/**
 * Risolve le scelte rapide "Quando?" della sfida in un intervallo di
 * date concreto. Riusa senza modifiche le utilità di calendario/fuso
 * orario già scritte e testate in ricorrenzaFaccende.ts - nessuna
 * nuova libreria di fusi orari.
 */
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

import { aggiungiGiorni, dataLocaleISO, fineGiornoISO, giornoSettimanaISO } from '@/calcolo/ricorrenzaFaccende';

export type PrecisioneAttivita = 'giorno' | 'fascia' | 'orario';

export type SceltaQuando =
  | {
      tipo: 'rapida';
      valore:
        | 'oggi'
        | 'stasera'
        | 'domani'
        | 'domani_sera'
        | 'venerdi'
        | 'sabato'
        | 'domenica'
        | 'questo_weekend'
        | 'prossimo_weekend';
    }
  | { tipo: 'data'; dataISO: string }
  | { tipo: 'data_ora'; dataOraISO: string };

export interface EsitoDatazione {
  /** Istante UTC completo di inizio. */
  inizioISO: string;
  /** Istante UTC completo di fine, null quando non ha senso (precisione 'orario'). */
  fineISO: string | null;
  precisione: PrecisioneAttivita;
}

const GIORNO_SETTIMANA_TARGET: Record<'venerdi' | 'sabato' | 'domenica', number> = {
  venerdi: 5,
  sabato: 6,
  domenica: 7,
};

/** Durata della fascia "sera": dalle 19:00 alle 23:59:59 locali (4h59m59s = 17999s). */
const DURATA_FASCIA_SERA_SECONDI = 17999;

/** Inizio giornata (00:00:00 locale) come istante UTC - fine della giornata precedente + 1 secondo. */
function inizioGiornoISO(dataISO: string, fusoOrario: string): string {
  const fineGiornoPrecedente = fineGiornoISO(aggiungiGiorni(dataISO, -1), fusoOrario);
  return new Date(new Date(fineGiornoPrecedente).getTime() + 1000).toISOString();
}

/** Inizio della fascia "sera" (19:00:00 locale) di una data - sottratta dalla fine di quella stessa giornata, mai attraverso un cambio d'ora (la fascia è sempre nella stessa giornata locale). */
function inizioFasciaSeraISO(dataISO: string, fusoOrario: string): string {
  const fineDelGiorno = fineGiornoISO(dataISO, fusoOrario);
  return new Date(new Date(fineDelGiorno).getTime() - DURATA_FASCIA_SERA_SECONDI * 1000).toISOString();
}

/** Il prossimo giorno di calendario con quel giorno della settimana, oggi incluso se coincide già. */
function prossimoGiornoSettimana(dataISO: string, giornoTarget: number): string {
  const oggi = giornoSettimanaISO(dataISO);
  const differenza = (giornoTarget - oggi + 7) % 7;
  return aggiungiGiorni(dataISO, differenza);
}

/** Sabato del weekend "corrente": se oggi è già sabato/domenica, il weekend in corso; altrimenti il prossimo sabato. */
function sabatoDiQuestoWeekend(dataISO: string): string {
  const oggi = giornoSettimanaISO(dataISO);
  if (oggi === 7) {
    return aggiungiGiorni(dataISO, -1);
  }
  return aggiungiGiorni(dataISO, 6 - oggi);
}

function periodoGiorno(dataISO: string, fusoOrario: string): EsitoDatazione {
  return {
    inizioISO: inizioGiornoISO(dataISO, fusoOrario),
    fineISO: fineGiornoISO(dataISO, fusoOrario),
    precisione: 'giorno',
  };
}

function periodoSera(dataISO: string, fusoOrario: string): EsitoDatazione {
  return {
    inizioISO: inizioFasciaSeraISO(dataISO, fusoOrario),
    fineISO: fineGiornoISO(dataISO, fusoOrario),
    precisione: 'fascia',
  };
}

function periodoWeekend(sabatoISO: string, fusoOrario: string): EsitoDatazione {
  const domenicaISO = aggiungiGiorni(sabatoISO, 1);
  return {
    inizioISO: inizioGiornoISO(sabatoISO, fusoOrario),
    fineISO: fineGiornoISO(domenicaISO, fusoOrario),
    precisione: 'giorno',
  };
}

export function risolviQuando(scelta: SceltaQuando, adesso: Date, fusoOrario: string): EsitoDatazione {
  if (scelta.tipo === 'data') {
    return periodoGiorno(scelta.dataISO, fusoOrario);
  }
  if (scelta.tipo === 'data_ora') {
    return {
      inizioISO: new Date(scelta.dataOraISO).toISOString(),
      fineISO: null,
      precisione: 'orario',
    };
  }

  const oggiISO = dataLocaleISO(adesso, fusoOrario);

  switch (scelta.valore) {
    case 'oggi':
      return periodoGiorno(oggiISO, fusoOrario);
    case 'domani':
      return periodoGiorno(aggiungiGiorni(oggiISO, 1), fusoOrario);
    case 'stasera':
      return periodoSera(oggiISO, fusoOrario);
    case 'domani_sera':
      return periodoSera(aggiungiGiorni(oggiISO, 1), fusoOrario);
    case 'venerdi':
    case 'sabato':
    case 'domenica':
      return periodoGiorno(prossimoGiornoSettimana(oggiISO, GIORNO_SETTIMANA_TARGET[scelta.valore]), fusoOrario);
    case 'questo_weekend':
      return periodoWeekend(sabatoDiQuestoWeekend(oggiISO), fusoOrario);
    case 'prossimo_weekend':
      return periodoWeekend(aggiungiGiorni(sabatoDiQuestoWeekend(oggiISO), 7), fusoOrario);
  }
}

/** Es. "Sabato 24 ottobre" - aggiunge "sera" per una fascia, "alle HH:mm" per un orario preciso. */
export function formattaConGiorno(esito: EsitoDatazione, fusoOrario: string): string {
  const dataISO = dataLocaleISO(new Date(esito.inizioISO), fusoOrario);
  const base = format(new Date(`${dataISO}T00:00:00`), 'EEEE d MMMM', { locale: it });
  const baseMaiuscola = base.charAt(0).toUpperCase() + base.slice(1);

  if (esito.precisione === 'fascia') {
    return `${baseMaiuscola} sera`;
  }
  if (esito.precisione === 'orario') {
    const ora = new Intl.DateTimeFormat('it-IT', {
      timeZone: fusoOrario,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(esito.inizioISO));
    return `${baseMaiuscola} alle ${ora}`;
  }
  return baseMaiuscola;
}
