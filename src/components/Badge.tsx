import { StyleSheet, Text, View } from 'react-native';

import { colori } from '@/theme/tokens';

type Tono = 'neutro' | 'blu' | 'verde' | 'rosso';

type Props = {
  testo: string;
  tono?: Tono;
};

const sfondi: Record<Tono, string> = {
  neutro: colori.inchiostro100,
  blu: colori.blu50,
  verde: '#e7f5e8',
  rosso: '#fbeceb',
};

const testi: Record<Tono, string> = {
  neutro: colori.inchiostro500,
  blu: colori.blu700,
  verde: colori.verde700,
  rosso: colori.rosso600,
};

/** Etichetta a pillola per stati brevi (es. "3/5", "Per tutti"). */
export function Badge({ testo, tono = 'neutro' }: Props) {
  return (
    <View style={[styles.pillola, { backgroundColor: sfondi[tono] }]}>
      <Text style={[styles.testo, { color: testi[tono] }]}>{testo}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pillola: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  testo: {
    fontSize: 12,
    fontWeight: '700',
  },
});
