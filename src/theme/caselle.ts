import { coloriNB } from '@/theme/neoBrutalista';

/**
 * Colori tra cui scegliere per personalizzare una casella. Il corallo resta
 * escluso di proposito: è riservato a marchio/soldi, mai al riempimento di
 * uno scomparto (vedi il commento in neoBrutalista.ts).
 */
export const PALETTE_CASELLE = [coloriNB.panna, coloriNB.oro, coloriNB.menta, coloriNB.viola];

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
];
