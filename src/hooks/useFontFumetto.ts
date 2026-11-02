import { Fredoka_600SemiBold, Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import {
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { useFonts } from 'expo-font';

/**
 * Font dello stile "fumetto retrò anni '70" usato dai prototipi isolati
 * (prototipo-ui/gruppi/casa). Caricati qui invece che in app/_layout.tsx
 * apposta: restano locali ai 3 prototipi, non toccano l'avvio del resto
 * dell'app.
 */
export function useFontFumetto() {
  return useFonts({
    Fredoka_700Bold,
    Fredoka_600SemiBold,
    SpaceGrotesk_700Bold,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });
}
