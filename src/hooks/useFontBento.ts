import {
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { useFonts } from 'expo-font';

/**
 * Font dello stile neo-brutalista della Home (vedi app/(app)/index.tsx).
 * Caricato qui, localmente, invece che in app/_layout.tsx - stesso motivo
 * di useFontFumetto.ts: resta locale a questa schermata, non rallenta
 * l'avvio del resto dell'app. Nessuna variante 900/Black esiste per
 * questo font: 800 (ExtraBold) è il peso massimo disponibile.
 */
export function useFontBento() {
  return useFonts({
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
}
