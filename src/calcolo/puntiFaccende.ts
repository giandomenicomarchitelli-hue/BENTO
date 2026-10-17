/**
 * Calcolo punti delle faccende: puro e testabile, nessuna dipendenza da
 * rete o database (stesso principio di saldi.ts/divisioni.ts).
 *
 * "Stima automatica": nessun provider AI è configurato in questo progetto
 * (nessuna Edge Function, nessuna chiave in .env - vedi audit nel commit
 * che ha introdotto questo file). Questo è quindi l'UNICO motore di
 * punteggio disponibile in questa fase: un algoritmo deterministico,
 * trasparente e riproducibile, mai presentato come generato da un LLM.
 * Se in futuro verrà collegato un provider AI (Edge Function dedicata, con
 * la chiave solo lato server), questo modulo resta il fallback quando il
 * servizio non è disponibile.
 *
 * Il punteggio dipende da due soli input che l'utente controlla - durata
 * stimata e sforzo - per restare semplice da spiegare e da prevedere.
 * Complessità e sgradevolezza del compito non hanno un campo separato nel
 * form (vedi Fase 7.C della richiesta): è lo sforzo scelto dall'utente a
 * incorporarle ("alto" per un compito breve ma sgradevole/complesso).
 */

export type Sforzo = 'basso' | 'medio' | 'alto';

/** Punti base per minuto di durata stimata, prima del moltiplicatore di sforzo. */
const PUNTI_PER_MINUTO = 0.5;

/** Moltiplicatore applicato ai punti base secondo lo sforzo scelto/suggerito. */
const MOLTIPLICATORE_SFORZO: Record<Sforzo, number> = {
  basso: 1,
  medio: 1.15,
  alto: 1.3,
};

/** Soglie (in minuti) usate per suggerire uno sforzo di partenza dalla sola durata. */
const SOGLIA_SFORZO_BASSO_MINUTI = 10;
const SOGLIA_SFORZO_MEDIO_MINUTI = 30;

/**
 * Sforzo suggerito a partire dalla sola durata stimata - solo un punto di
 * partenza: l'utente può sempre scegliere uno sforzo diverso (es. un
 * compito breve ma sgradevole) prima di salvare la faccenda.
 */
export function suggerisciSforzo(durataStimataMinuti: number): Sforzo {
  if (durataStimataMinuti <= SOGLIA_SFORZO_BASSO_MINUTI) {
    return 'basso';
  }
  if (durataStimataMinuti <= SOGLIA_SFORZO_MEDIO_MINUTI) {
    return 'medio';
  }
  return 'alto';
}

/**
 * Punteggio suggerito ("Stima automatica") per una faccenda, dati durata e
 * sforzo. Sempre un intero positivo (minimo 1): un compito registrato vale
 * comunque qualcosa, anche se la durata stimata è minima.
 */
export function stimaPunti(durataStimataMinuti: number, sforzo: Sforzo): number {
  const base = durataStimataMinuti * PUNTI_PER_MINUTO * MOLTIPLICATORE_SFORZO[sforzo];
  return Math.max(1, Math.round(base));
}

/** Spiegazione sintetica e onesta di come è stato calcolato un punteggio (mai "generato dall'AI"). */
export function motivazioneStima(durataStimataMinuti: number, sforzo: Sforzo): string {
  return `Stima automatica: ${durataStimataMinuti} min di lavoro stimato, sforzo ${sforzo} (${PUNTI_PER_MINUTO} punti/min × ${MOLTIPLICATORE_SFORZO[sforzo]}).`;
}

/**
 * Percentuale di `parte` su `totale`, arrotondata all'intero più vicino.
 * 0 quando il totale è zero (mai una divisione per zero, mai NaN) - usata
 * sia per il peso di un'attività sul periodo sia per il contributo di un
 * membro alla classifica (vedi sotto): stessa matematica, significati
 * diversi, per questo restano due funzioni con nomi distinti.
 */
function percentuale(parte: number, totale: number): number {
  if (totale <= 0) {
    return 0;
  }
  return Math.round((parte / totale) * 100);
}

/**
 * Peso percentuale di un'attività rispetto al totale dei punti PREVISTI nel
 * periodo mostrato (non guadagnati): quanto "pesa" quell'attività sul
 * carico di lavoro complessivo, indipendentemente da chi l'ha completata.
 */
export function pesoAttivita(puntiAttivita: number, puntiTotaliPrevisti: number): number {
  return percentuale(puntiAttivita, puntiTotaliPrevisti);
}

/**
 * Percentuale di contributo di un membro alla classifica: quota dei punti
 * EFFETTIVAMENTE guadagnati dal gruppo (completamenti reali, mai punti
 * previsti) che appartiene a quel membro.
 */
export function contributoClassifica(puntiMembro: number, puntiTotaliGuadagnati: number): number {
  return percentuale(puntiMembro, puntiTotaliGuadagnati);
}
