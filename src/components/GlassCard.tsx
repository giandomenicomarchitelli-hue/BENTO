import { BlurView } from 'expo-blur';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { bento, elevazione as elevazioneToken, raggio, vetro } from '@/theme/tokens';

type Props = {
  children: React.ReactNode;
  onPress?: () => void;
  /** 'alta' per una superficie leggermente più opaca/bianca (es. la card in evidenza). */
  variante?: 'base' | 'alta';
  intensita?: 'bassa' | 'media' | 'alta';
  /**
   * Profondità dell'ombra (token `elevazione` in theme/tokens.ts). 'bassa'
   * per righe secondarie dentro un elenco (es. GlassListRow), dove
   * un'ombra piena come le card principali risulterebbe troppo pesante e
   * appiattirebbe la gerarchia visiva tra contenuto primario e di supporto.
   */
  elevazione?: 'bassa' | 'media' | 'alta';
  style?: StyleProp<ViewStyle>;
};

const intensitaBlur = {
  bassa: vetro.intensitaBassa,
  media: vetro.intensitaMedia,
  alta: vetro.intensitaAlta,
};

/**
 * Superficie "vetro" di base del tema chiaro: bianco translucido + blur
 * leggero + bordo sottile + ombra morbida. Il blur qui è puramente
 * decorativo (intensità bassa per design, non per limite tecnico) - su
 * web/Android senza un buon supporto la card resta comunque perfettamente
 * leggibile come superficie bianca semi-trasparente (expo-blur degrada da
 * sé in quel caso, non serve un fallback aggiuntivo).
 */
export function GlassCard({
  children,
  onPress,
  variante = 'base',
  intensita = 'media',
  elevazione = 'media',
  style,
}: Props) {
  return (
    <View style={[styles.ombra, elevazioneToken[elevazione], style]}>
      <Pressable
        onPress={onPress}
        disabled={onPress === undefined}
        style={({ pressed }) => [styles.clip, onPress !== undefined && pressed && styles.premuta]}
      >
        <BlurView
          intensity={intensitaBlur[intensita]}
          tint="light"
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor:
                variante === 'alta' ? bento.superficieTranslucida : bento.superficieMuta,
            },
          ]}
        />
        <View style={styles.contenuto}>{children}</View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  ombra: {
    borderRadius: raggio.xl,
  },
  clip: {
    borderRadius: raggio.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: bento.bordoSoft,
    overflow: 'hidden',
  },
  premuta: {
    opacity: 0.85,
  },
  contenuto: {
    padding: 20,
  },
});
