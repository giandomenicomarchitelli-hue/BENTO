import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colori } from '@/theme/tokens';

type Props = {
  icona: keyof typeof Feather.glyphMap;
  titolo: string;
  meta?: string;
  onPress: () => void;
};

/** Riga cliccabile con icona, titolo ed eventuale testo secondario, usata dentro ListGroup. */
export function ListRow({ icona, titolo, meta, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.riga, pressed && styles.rigaPremuta]}
    >
      <View style={styles.iconaContenitore}>
        <Feather name={icona} size={16} color={colori.inchiostro700} />
      </View>
      <View style={styles.contenuto}>
        <Text style={styles.titolo} numberOfLines={1}>
          {titolo}
        </Text>
        {meta !== undefined && <Text style={styles.meta}>{meta}</Text>}
      </View>
      <Feather name="chevron-right" size={16} color={colori.inchiostro300} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  riga: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rigaPremuta: {
    backgroundColor: colori.inchiostro100,
  },
  iconaContenitore: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: colori.inchiostro100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contenuto: {
    flex: 1,
    gap: 2,
  },
  titolo: {
    fontSize: 15,
    fontWeight: '600',
    color: colori.inchiostro900,
  },
  meta: {
    fontSize: 12.5,
    color: colori.inchiostro500,
  },
});
