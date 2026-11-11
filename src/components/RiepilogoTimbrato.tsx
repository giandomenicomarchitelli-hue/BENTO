import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { BloccoDuro } from '@/components/BloccoDuro';
import { coloriNB, pesiNB, soldiNB } from '@/theme/neoBrutalista';

type Props = {
  titolo: string;
  cifra: string;
  coloreCifra: string;
  /** true per mostrare e far scattare il timbro - resta true finché lo schermo non torna indietro. */
  timbrato: boolean;
  /** Chiamato a fine animazione (200ms): il chiamante ci fa `router.back()`. */
  onFineTimbro: () => void;
  /**
   * "Conto chiuso" (HANDOFF sezione 4): in più rispetto all'impatto del
   * timbro (sempre presente), un `notificationAsync(Success)` - solo per
   * "Salda tutto", che azzera davvero un conto, non per il pagamento di
   * un singolo debito.
   */
  contoChiuso?: boolean;
};

// Tempi tarati in HANDOFF.md sezione 3 ("Tempi e Peso"): 200ms totali,
// schiaccia a 0.9 al 42% (84ms), rimbalza a 1.035, assesta a 1. Solo il
// punto di schiacciata e il totale sono dati nell'handoff - la ripartizione
// fra rimbalzo e assestamento nei restanti 116ms è una scelta ragionevole,
// non un valore tarato (l'handoff stesso li chiama "punto di partenza, non
// valori finali": da rifare con le molle di Reanimated).
const DURATA_MS = 200;
const IMPATTO_MS = 84;
const RIMBALZO_MS = 58;
const ASSESTAMENTO_MS = DURATA_MS - IMPATTO_MS - RIMBALZO_MS;

/**
 * Il timbro (HANDOFF 10.2/10.4): atterra su un riquadro-riepilogo dopo
 * un'azione di denaro riuscita, non prima - è una conferma di cosa è
 * appena successo, non un'anticipazione. Condiviso fra "Salda un debito"
 * e "Salda tutto": stesso riquadro, stesso timbro, cambia solo titolo e
 * cifra.
 */
export function RiepilogoTimbrato({
  titolo,
  cifra,
  coloreCifra,
  timbrato,
  onFineTimbro,
  contoChiuso = false,
}: Props) {
  const scalaTimbro = useSharedValue(0);
  const colpoCarta = useSharedValue(0);

  useEffect(() => {
    if (!timbrato) {
      return;
    }
    scalaTimbro.value = 1;
    scalaTimbro.value = withSequence(
      withTiming(0.9, { duration: IMPATTO_MS }),
      withTiming(1.035, { duration: RIMBALZO_MS }),
      withTiming(1, { duration: ASSESTAMENTO_MS }, (finito) => {
        if (finito) {
          runOnJS(onFineTimbro)();
        }
      })
    );

    const idColpo = setTimeout(() => {
      colpoCarta.value = withSequence(withTiming(1, { duration: 50 }), withTiming(0, { duration: 90 }));
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      if (contoChiuso) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }, IMPATTO_MS);

    return () => clearTimeout(idColpo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timbrato]);

  const stileTimbro = useAnimatedStyle(() => ({
    opacity: scalaTimbro.value === 0 ? 0 : 1,
    transform: [{ scale: scalaTimbro.value }, { rotate: '-12deg' }],
  }));

  const stileColpo = useAnimatedStyle(() => ({
    transform: [{ translateY: colpoCarta.value * 1.5 }],
  }));

  return (
    <BloccoDuro offset={3.5} colore={coloriNB.panna} raggio={16} contenutoStyle={styles.carta}>
      <Animated.View style={stileColpo}>
        <Text style={styles.titolo}>{titolo}</Text>
        <Text style={[styles.cifra, { color: coloreCifra }]}>{cifra}</Text>
      </Animated.View>

      {timbrato && (
        <Animated.View style={[styles.timbro, stileTimbro]} pointerEvents="none">
          <View style={styles.anello} />
          <Text style={styles.testoTimbro}>Saldato</Text>
          <Text style={styles.dataTimbro}>{format(new Date(), 'd MMM', { locale: it })}</Text>
        </Animated.View>
      )}
    </BloccoDuro>
  );
}

const styles = StyleSheet.create({
  carta: {
    padding: 14,
    overflow: 'hidden',
  },
  titolo: {
    ...pesiNB.extraBold,
    fontSize: 10,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: coloriNB.soft,
  },
  cifra: {
    ...pesiNB.extraBold,
    fontSize: 26,
    fontVariant: ['tabular-nums'],
    marginTop: 4,
  },
  timbro: {
    position: 'absolute',
    right: 10,
    top: 14,
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 4,
    borderColor: soldiNB.credito,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  anello: {
    position: 'absolute',
    top: 5,
    left: 5,
    right: 5,
    bottom: 5,
    borderRadius: 46,
    borderWidth: 1.5,
    borderColor: soldiNB.credito,
    opacity: 0.55,
  },
  testoTimbro: {
    ...pesiNB.extraBold,
    fontSize: 14,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: soldiNB.credito,
  },
  dataTimbro: {
    ...pesiNB.extraBold,
    fontSize: 7,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: soldiNB.credito,
  },
});
