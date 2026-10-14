import { StyleSheet, Text, View } from 'react-native';

import { colori } from '@/theme/tokens';

type Props = {
  nome: string;
  dimensione?: number;
};

/** Cerchio con l'iniziale di una persona, per liste membri e simili. */
export function Avatar({ nome, dimensione = 36 }: Props) {
  const iniziale = nome.trim().charAt(0).toUpperCase() || '?';

  return (
    <View
      style={[
        styles.cerchio,
        { width: dimensione, height: dimensione, borderRadius: dimensione / 2 },
      ]}
    >
      <Text style={[styles.testo, { fontSize: dimensione * 0.4 }]}>{iniziale}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cerchio: {
    backgroundColor: colori.blu100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testo: {
    fontWeight: '700',
    color: colori.blu700,
  },
});
