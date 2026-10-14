import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { bento, gradienti, raggio } from '@/theme/tokens';

type Props = {
  etichetta: string;
  onPress: () => void;
  variante?: 'primario' | 'vetro' | 'testo';
  caricando?: boolean;
  disabilitato?: boolean;
};

/** Bottone del tema Bento, in tre varianti: primario (gradiente), vetro (secondario), testo (ghost). */
export function BentoButton({
  etichetta,
  onPress,
  variante = 'primario',
  caricando = false,
  disabilitato = false,
}: Props) {
  const nonAttivo = disabilitato || caricando;

  const contenuto = caricando ? (
    <ActivityIndicator color={variante === 'primario' ? '#fff' : bento.testoPrimario} />
  ) : (
    <Text
      style={[
        styles.testo,
        variante === 'testo' && styles.testoGhost,
        variante === 'vetro' && styles.testoVetro,
      ]}
    >
      {etichetta}
    </Text>
  );

  if (variante === 'primario') {
    return (
      <Pressable onPress={onPress} disabled={nonAttivo}>
        {({ pressed }) => (
          <LinearGradient
            colors={gradienti.hero}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.base, (pressed || nonAttivo) && styles.premuto]}
          >
            {contenuto}
          </LinearGradient>
        )}
      </Pressable>
    );
  }

  if (variante === 'vetro') {
    return (
      <Pressable
        onPress={onPress}
        disabled={nonAttivo}
        style={({ pressed }) => [
          styles.base,
          styles.baseVetro,
          (pressed || nonAttivo) && styles.premuto,
        ]}
      >
        {contenuto}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={nonAttivo}
      style={({ pressed }) => [styles.baseTesto, (pressed || nonAttivo) && styles.premuto]}
    >
      {contenuto}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: raggio.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  baseVetro: {
    backgroundColor: bento.superficieTranslucida,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: bento.bordoForte,
  },
  baseTesto: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premuto: {
    opacity: 0.8,
  },
  testo: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  testoVetro: {
    color: bento.testoPrimario,
  },
  testoGhost: {
    color: bento.testoSecondario,
    fontWeight: '600',
  },
});
