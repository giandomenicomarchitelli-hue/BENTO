import { cubicBezier } from 'react-native-reanimated';

/**
 * Palette "neo-brutalista" condivisa da Home e Personale (bordi spessi
 * neri, ombre dure a blocco, nessun vetro/blur) - un restyling isolato di
 * queste due schermate, non un nuovo tema globale: il resto dell'app
 * resta sul tema "Hybrid Liquid Glass" di theme/tokens.ts.
 */
export const coloriNB = {
  crema: '#F8F9FA',
  cremaCard: '#F3EFE6',
  scuro: '#1A1817',
  corallo: '#EE5D50',
  oro: '#FDCB4E',
  menta: '#72C4B8',
  viola: '#C4B5FD',
  grigioTesto: '#716C65',
};

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
