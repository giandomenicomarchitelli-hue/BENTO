import { cubicBezier } from 'react-native-reanimated';

/**
 * Palette "neo-brutalista" condivisa da Home e Personale (bordi spessi
 * neri, ombre dure a blocco, nessun vetro/blur) - un restyling isolato di
 * queste due schermate, non un nuovo tema globale: il resto dell'app
 * resta sul tema "Hybrid Liquid Glass" di theme/tokens.ts.
 */
export const coloriNB = {
  crema: '#F7F4EC',
  /** Riempimento chiaro degli scomparti. Più caldo del fondo, così si stacca. */
  panna: '#FFFDF6',
  scuro: '#161412',
  corallo: '#EE5D50',
  oro: '#FDCB4E',
  menta: '#72C4B8',
  viola: '#C4B5FD',
  /** Testo secondario dentro uno scomparto: scuro attenuato, non grigio. */
  soft: 'rgba(22,20,18,0.88)',
};

/**
 * Il corallo non riempie mai uno scomparto: resta al marchio e al bottone
 * centrale della barra. È il prezzo per avere, sulla futura schermata
 * Saldi, un rosso che legge come "soldi in uscita" e non come "sezione".
 */

/**
 * Colori del denaro. Si usano SOLO come colore del testo su fondo chiaro,
 * mai come riempimento di una superficie - altrimenti un importo si
 * confonde con una sezione. Entrambi sopra 4,5:1 sul fondo panna.
 *
 * Decisi ora, prima di rifare la schermata Saldi che li userà: è più
 * facile fissare la semantica adesso che dopo aver scritto la schermata.
 */
export const soldiNB = {
  credito: '#1E7A4F',
  debito: '#C53A2B',
};

/**
 * Nessuna variante 900/Black esiste per Plus Jakarta Sans (vedi
 * useFontBento.ts) - 800 ExtraBold è il peso massimo reale caricato.
 */
export const pesiNB = {
  extraBold: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontWeight: '800' as const },
  bold: { fontFamily: 'PlusJakartaSans_700Bold', fontWeight: '700' as const },
};

/** Curva di ease-out decisa (skill animate-expo), per il feedback al tocco di BloccoDuro. */
export const EASE_OUT_NB = cubicBezier(0.23, 1, 0.32, 1);
