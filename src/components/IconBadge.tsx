import { Feather } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { raggio } from '@/theme/tokens';

type Props = {
  icona: keyof typeof Feather.glyphMap;
  /** Colore d'accento (vedi `accenti` in tokens.ts) - solo identità visiva. */
  colore: string;
  dimensione?: number;
};

/** Badge circolare/arrotondato con un'icona, tinta sul colore d'accento passato. */
export function IconBadge({ icona, colore, dimensione = 40 }: Props) {
  return (
    <View
      style={[
        styles.contenitore,
        {
          width: dimensione,
          height: dimensione,
          borderRadius: raggio.md,
          backgroundColor: `${colore}1F`,
        },
      ]}
    >
      <Feather name={icona} size={Math.round(dimensione * 0.5)} color={colore} />
    </View>
  );
}

const styles = StyleSheet.create({
  contenitore: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
