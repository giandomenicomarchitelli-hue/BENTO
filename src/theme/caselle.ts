import { coloriNB } from '@/theme/neoBrutalista';

/**
 * Accenti aggiunti solo per la personalizzazione delle caselle, oltre ai
 * quattro già usati altrove nell'app (panna/oro/menta/viola in
 * neoBrutalista.ts). Stessa famiglia "pastello saturo" del resto del
 * tema, scelti perché il testo/icone `coloriNB.scuro` sopra restano
 * sempre leggibili: contrasto minimo verificato 8,19:1 (sotto a quello
 * già più basso tra i quattro esistenti, menta a 5,89:1), ben oltre la
 * soglia 4,5:1 già usata come riferimento per viola.
 */
const rosa = '#F28FB3';
const azzurro = '#6FC3E8';
const limone = '#D4E157';
const pesca = '#F5A389';

/**
 * Colori tra cui scegliere per personalizzare una casella. Il corallo resta
 * escluso di proposito: è riservato a marchio/soldi, mai al riempimento di
 * uno scomparto (vedi il commento in neoBrutalista.ts).
 */
export const PALETTE_CASELLE = [
  coloriNB.panna,
  coloriNB.oro,
  coloriNB.menta,
  coloriNB.viola,
  rosa,
  azzurro,
  limone,
  pesca,
];

export interface DefinizioneCasella {
  chiave: string;
  etichetta: string;
  sezione: string;
  coloreDefault: string;
}

/**
 * Elenco di tutte le caselle personalizzabili (dashboard del gruppo +
 * sezione Personale), usato sia dalla schermata "Personalizza i colori"
 * per mostrarle tutte in lista, sia come fonte unica dei colori di
 * default - se un domani cambia il colore di partenza di una casella,
 * cambia solo qui.
 */
export const CASELLE_PERSONALIZZABILI: DefinizioneCasella[] = [
  { chiave: 'home.personale', etichetta: 'Personale', sezione: 'Home', coloreDefault: coloriNB.panna },
  { chiave: 'home.gruppi', etichetta: 'Gruppi', sezione: 'Home', coloreDefault: coloriNB.menta },
  { chiave: 'home.scrivi', etichetta: 'Scrivi', sezione: 'Home', coloreDefault: coloriNB.oro },
  { chiave: 'gruppi.crea', etichetta: 'Crea', sezione: 'Elenco gruppi', coloreDefault: coloriNB.menta },
  { chiave: 'gruppi.unisciti', etichetta: 'Unisciti', sezione: 'Elenco gruppi', coloreDefault: coloriNB.viola },
  { chiave: 'gruppi.saldi', etichetta: 'I miei saldi', sezione: 'Elenco gruppi', coloreDefault: coloriNB.panna },
  { chiave: 'dashboard.saldo', etichetta: 'Il tuo saldo', sezione: 'Dashboard gruppo', coloreDefault: coloriNB.panna },
  { chiave: 'dashboard.spesa', etichetta: 'Spesa', sezione: 'Dashboard gruppo', coloreDefault: coloriNB.menta },
  { chiave: 'dashboard.scrivi', etichetta: 'Scrivi', sezione: 'Dashboard gruppo', coloreDefault: coloriNB.oro },
  { chiave: 'dashboard.faccende', etichetta: 'Faccende', sezione: 'Dashboard gruppo', coloreDefault: coloriNB.viola },
  { chiave: 'dashboard.liste', etichetta: 'Liste', sezione: 'Dashboard gruppo', coloreDefault: coloriNB.panna },
  { chiave: 'dashboard.sfide', etichetta: 'Sfide', sezione: 'Dashboard gruppo', coloreDefault: coloriNB.oro },
  { chiave: 'dashboard.calendario', etichetta: 'Calendario', sezione: 'Dashboard gruppo', coloreDefault: coloriNB.menta },
  { chiave: 'dashboard.note', etichetta: 'Note', sezione: 'Dashboard gruppo', coloreDefault: coloriNB.viola },
  { chiave: 'personale.liste', etichetta: 'Liste', sezione: 'Personale', coloreDefault: coloriNB.oro },
  { chiave: 'personale.note', etichetta: 'Note', sezione: 'Personale', coloreDefault: coloriNB.viola },
  { chiave: 'personale.calendario', etichetta: 'Calendario', sezione: 'Personale', coloreDefault: coloriNB.panna },
  { chiave: 'personale.allenamenti', etichetta: 'Allenamenti', sezione: 'Personale', coloreDefault: coloriNB.menta },
  { chiave: 'personale.piano-terapeutico', etichetta: 'Piano terapeutico', sezione: 'Personale', coloreDefault: rosa },
];

/** Cosa serve al selettore per aprirsi su una casella: la chiave con cui
 *  salvare la scelta, l'etichetta mostrata e il colore di partenza. */
export interface AperturaSelettoreColore {
  chiave: string;
  etichetta: string;
  coloreDefault: string;
}

/**
 * Apre il selettore su una delle caselle fisse dell'elenco qui sopra -
 * per le caselle dinamiche (es. il tassello di ogni gruppo nell'elenco
 * Gruppi, una per gruppo_id) il chiamante costruisce l'oggetto a mano,
 * perché etichetta e colore di partenza non stanno in un elenco statico.
 */
export function apriSelettore(chiave: string): AperturaSelettoreColore {
  const casella = CASELLE_PERSONALIZZABILI.find((c) => c.chiave === chiave);
  if (casella === undefined) {
    throw new Error(`Casella non registrata in CASELLE_PERSONALIZZABILI: ${chiave}`);
  }
  return casella;
}
