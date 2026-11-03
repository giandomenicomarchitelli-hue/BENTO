import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, StyleSheet, type StyleProp, View, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { coloriNB, EASE_OUT_NB } from '@/theme/neoBrutalista';

/**
 * "Ombra dura" neo-brutalista: un rettangolo scuro pieno, sfalsato di
 * `offset` px dietro la superficie visibile - non le proprietà shadow
 * (o elevation) di RN, che rendono in modo incoerente tra iOS/Android/web e non danno mai
 * il bordo netto voluto qui.
 *
 * `style` dimensiona/posiziona il blocco nel layout circostante (es.
 * flex:1 per due card affiancate); `contenutoStyle` è solo l'interno
 * (padding, gap, allineamento) - separati apposta, non un unico `style`
 * ambiguo.
 *
 * Con `onPress`, il blocco diventa il proprio Pressable e al tocco la
 * superficie si anima verso `offset` px in basso a destra, esattamente
 * sopra alla sua ombra dura - l'illusione di "premere il blocco nella sua
 * ombra".
 *
 * Transizione CSS di Reanimated (ricetta "Press feedback" della skill
 * animate-expo), non il modulo `Animated` core di RN: nessun gesto né
 * valore continuo qui (solo premi/rilascia), quindi non serve una
 * shared value. `pressRetentionOffset` evita che un lieve spostamento del
 * dito annulli la pressione.
 *
 * `gradiente` sostituisce `colore` con un riempimento a sfumatura - non
 * interattivo per costruzione, quindi niente Pressable/transizione di
 * pressione qui.
 */
export function BloccoDuro({
  children,
  style,
  contenutoStyle,
  colore,
  gradiente,
  offset = 3,
  raggio = 20,
  bordo = true,
  onPress,
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contenutoStyle?: StyleProp<ViewStyle>;
  colore?: string;
  gradiente?: [string, string];
  offset?: number;
  raggio?: number;
  bordo?: boolean;
  onPress?: () => void;
}) {
  const [premuto, setPremuto] = useState(false);
  const stileBordo = bordo
    ? { borderWidth: offset <= 2 ? 2 : 2.5, borderColor: coloriNB.scuro }
    : undefined;

  return (
    <View style={[styles.involucroOmbra, style]}>
      <View
        style={[
          styles.ombraDura,
          { top: offset, left: offset, right: -offset, bottom: -offset, borderRadius: raggio },
        ]}
      />
      {gradiente !== undefined ? (
        <LinearGradient
          colors={gradiente}
          style={[{ borderRadius: raggio }, stileBordo, contenutoStyle]}
        >
          {children}
        </LinearGradient>
      ) : (
        <Animated.View
          style={[
            {
              backgroundColor: colore,
              borderRadius: raggio,
              transform: [
                { translateX: premuto ? offset : 0 },
                { translateY: premuto ? offset : 0 },
              ],
              transitionProperty: 'transform',
              transitionDuration: '100ms',
              transitionTimingFunction: EASE_OUT_NB,
            },
            stileBordo,
          ]}
        >
          <Pressable
            onPress={onPress}
            onPressIn={() => setPremuto(true)}
            onPressOut={() => setPremuto(false)}
            disabled={onPress === undefined}
            pressRetentionOffset={16}
            style={[styles.riempimentoPressable, contenutoStyle]}
          >
            {children}
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  involucroOmbra: {
    position: 'relative',
  },
  ombraDura: {
    position: 'absolute',
    backgroundColor: coloriNB.scuro,
  },
  riempimentoPressable: {
    flex: 1,
  },
});
