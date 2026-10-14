import { Pressable, StyleSheet, Text, View } from 'react-native';

import { bento, tipografia } from '@/theme/tokens';

type Props = {
  titolo: string;
  azione?: {
    etichetta: string;
    onPress: () => void;
  };
};

/** Titolo di sezione, con un eventuale link di azione allineato a destra (es. "Vedi tutti"). */
export function SectionHeader({ titolo, azione }: Props) {
  return (
    <View style={styles.riga}>
      <Text style={styles.titolo}>{titolo}</Text>
      {azione !== undefined && (
        <Pressable onPress={azione.onPress} hitSlop={8}>
          <Text style={styles.azione}>{azione.etichetta}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  riga: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titolo: {
    ...tipografia.titoloSezione,
    color: bento.testoPrimario,
  },
  azione: {
    fontSize: 13,
    fontWeight: '600',
    color: bento.testoSecondario,
  },
});
