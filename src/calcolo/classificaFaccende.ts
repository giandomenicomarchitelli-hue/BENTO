/**
 * Calcolo della classifica del gruppo: puro e testabile, nessuna dipendenza
 * da rete o database. Prende in input le occorrenze attualmente nello stato
 * "completata" (interrogazione già filtrata dal chiamante per periodo/
 * settimana - vedi src/api/faccende.ts) e produce la classifica.
 *
 * Deliberatamente NON legge storico_faccende: quella tabella è il registro
 * eventi per la cronologia (chi ha fatto cosa, quando), ma la fonte di
 * verità per "chi ha completato cosa ORA" è lo stato corrente delle
 * occorrenze. Un annullamento riporta l'occorrenza a "da_fare", quindi
 * sparisce da sola da questo calcolo - niente contatori da tenere allineati
 * a mano, coerente con l'uso di calcolaSaldi() per i saldi finanziari.
 */

import { contributoClassifica } from '@/calcolo/puntiFaccende';

export interface OccorrenzaCompletataPerClassifica {
  membroId: string;
  punti: number;
}

export interface VoceClassifica {
  membroId: string;
  punti: number;
  faccendeCompletate: number;
  /** Percentuale dei punti EFFETTIVAMENTE guadagnati dal gruppo (0 se il gruppo è a zero punti). */
  percentuale: number;
  /** Posizione 1-based, per punti decrescenti (poi per numero di faccende completate). */
  posizione: number;
}

/**
 * Classifica di un gruppo per un periodo (tipicamente una settimana), dati
 * i membri del gruppo (per includere anche chi ha zero punti, come
 * richiesto esplicitamente) e le occorrenze completate in quel periodo.
 */
export function calcolaClassifica(
  occorrenzeCompletate: OccorrenzaCompletataPerClassifica[],
  membriIds: string[]
): VoceClassifica[] {
  const perMembro = new Map<string, { punti: number; faccendeCompletate: number }>();
  for (const membroId of membriIds) {
    perMembro.set(membroId, { punti: 0, faccendeCompletate: 0 });
  }

  for (const occorrenza of occorrenzeCompletate) {
    const voce = perMembro.get(occorrenza.membroId);
    if (voce === undefined) {
      // Un'occorrenza completata da un membro non più nell'elenco passato
      // (es. uscito dal gruppo nel frattempo): si crea comunque una voce,
      // così i suoi punti storici restano visibili e non spariscono dal
      // totale del gruppo.
      perMembro.set(occorrenza.membroId, { punti: occorrenza.punti, faccendeCompletate: 1 });
      continue;
    }
    voce.punti += occorrenza.punti;
    voce.faccendeCompletate += 1;
  }

  const puntiTotaliGruppo = Array.from(perMembro.values()).reduce((somma, v) => somma + v.punti, 0);

  const classificaNonOrdinata = Array.from(perMembro.entries()).map(([membroId, v]) => ({
    membroId,
    punti: v.punti,
    faccendeCompletate: v.faccendeCompletate,
    percentuale: contributoClassifica(v.punti, puntiTotaliGruppo),
  }));

  classificaNonOrdinata.sort((a, b) => b.punti - a.punti || b.faccendeCompletate - a.faccendeCompletate);

  return classificaNonOrdinata.map((voce, indice) => ({ ...voce, posizione: indice + 1 }));
}
