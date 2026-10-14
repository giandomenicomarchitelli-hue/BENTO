import { Feather } from '@expo/vector-icons';
import { Text, View, StyleSheet } from 'react-native';

import { GlassCard } from '@/components/GlassCard';
import { coloriScuri, raggio, spaziatura, tipografia } from '@/theme/tokens';

type Props = {
  icona: keyof typeof Feather.glyphMap;
  /** Colore d'accento della sezione (vedi `accenti` in tokens.ts) - solo identità visiva. */
  accento: string;
  titolo: string;
  sottotitolo?: string;
  onPress: () => void;
};

/** Tile di navigazione su superficie vetro, per le azioni principali della home. */
export function GlassTile({ icona, accento, titolo, sottotitolo, onPress }: Props) {
  return (
    <GlassCard onPress={onPress} style={styles.card}>
      <View style={[styles.iconaContenitore, { backgroundColor: `${accento}26` }]}>
        <Feather name={icona} size={20} color={accento} />
      </View>
      <Text style={styles.titolo}>{titolo}</Text>
      {sottotitolo !== undefined && <Text style={styles.sottotitolo}>{sottotitolo}</Text>}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
  },
  iconaContenitore: {
    width: 40,
    height: 40,
    borderRadius: raggio.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spaziatura.md,
  },
  titolo: {
    ...tipografia.corpo,
    fontSize: 16,
    color: coloriScuri.testoPrimario,
  },
  sottotitolo: {
    ...tipografia.corpoSecondario,
    color: coloriScuri.testoSecondario,
    marginTop: 2,
  },
});
