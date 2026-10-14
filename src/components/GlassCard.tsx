import { BlurView } from 'expo-blur';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { coloriScuri, elevazione, raggio, vetro } from '@/theme/tokens';

type Props = {
  children: React.ReactNode;
  onPress?: () => void;
  /** 'alta' per una superficie leggermente più chiara (es. card dentro un'altra card). */
  variante?: 'base' | 'alta';
  intensita?: 'bassa' | 'media' | 'alta';
  style?: StyleProp<ViewStyle>;
};

const intensitaBlur = {
  bassa: vetro.intensitaBassa,
  media: vetro.intensitaMedia,
  alta: vetro.intensitaAlta,
};

/**
 * Superficie "vetro" di base del tema scuro: blur + tinta navy translucida
 * + bordo sottile luminoso. Il blur da solo non porta la tinta del brand,
 * quindi sotto c'è sempre un overlay di colore - su web/Android senza un
 * buon supporto del blur nativo la card resta comunque leggibile, solo
 * meno sfocata (expo-blur degrada già da sé in quel caso).
 */
export function GlassCard({
  children,
  onPress,
  variante = 'base',
  intensita = 'media',
  style,
}: Props) {
  return (
    <View style={[styles.ombra, style]}>
      <Pressable
        onPress={onPress}
        disabled={onPress === undefined}
        style={({ pressed }) => [styles.clip, onPress !== undefined && pressed && styles.premuta]}
      >
        <BlurView
          intensity={intensitaBlur[intensita]}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: variante === 'alta' ? vetro.superficieAlta : vetro.superficie },
          ]}
        />
        <View style={styles.riflesso} />
        <View style={styles.contenuto}>{children}</View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  ombra: {
    borderRadius: raggio.xl,
    ...elevazione.media,
  },
  clip: {
    borderRadius: raggio.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: coloriScuri.bordo,
    overflow: 'hidden',
  },
  premuta: {
    opacity: 0.85,
  },
  riflesso: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth * 2,
    backgroundColor: vetro.riflesso,
  },
  contenuto: {
    padding: 20,
  },
});
