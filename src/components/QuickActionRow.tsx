import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IconBadge } from '@/components/IconBadge';
import { bento, spaziatura } from '@/theme/tokens';

export type QuickAction = {
  icona: keyof typeof Feather.glyphMap;
  /** Colore d'accento (vedi `accenti` in tokens.ts) - solo identità visiva. */
  accento: string;
  etichetta: string;
  onPress: () => void;
};

type Props = {
  azioni: QuickAction[];
};

/** Riga orizzontale di azioni rapide (icona + etichetta), per le scorciatoie della home. */
export function QuickActionRow({ azioni }: Props) {
  return (
    <View style={styles.riga}>
      {azioni.map((azione) => (
        <Pressable
          key={azione.etichetta}
          onPress={azione.onPress}
          style={({ pressed }) => [styles.colonna, pressed && styles.premuta]}
        >
          <IconBadge icona={azione.icona} colore={azione.accento} dimensione={48} />
          <Text style={styles.etichetta} numberOfLines={2}>
            {azione.etichetta}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  riga: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  colonna: {
    alignItems: 'center',
    gap: spaziatura.sm,
    width: 76,
  },
  premuta: {
    opacity: 0.7,
  },
  etichetta: {
    fontSize: 12,
    fontWeight: '600',
    color: bento.testoSecondario,
    textAlign: 'center',
  },
});
