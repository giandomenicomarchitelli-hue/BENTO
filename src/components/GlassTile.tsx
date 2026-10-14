import { Feather } from '@expo/vector-icons';
import { Text, StyleSheet } from 'react-native';

import { GlassCard } from '@/components/GlassCard';
import { IconBadge } from '@/components/IconBadge';
import { bento, spaziatura, tipografia } from '@/theme/tokens';

type Props = {
  icona: keyof typeof Feather.glyphMap;
  /** Colore d'accento (vedi `accenti` in tokens.ts) - solo identità visiva. */
  accento: string;
  titolo: string;
  sottotitolo?: string;
  onPress: () => void;
};

/** Tile di navigazione su superficie vetro, per le azioni principali della home. */
export function GlassTile({ icona, accento, titolo, sottotitolo, onPress }: Props) {
  return (
    <GlassCard onPress={onPress} style={styles.card}>
      <IconBadge icona={icona} colore={accento} />
      <Text style={styles.titolo}>{titolo}</Text>
      {sottotitolo !== undefined && <Text style={styles.sottotitolo}>{sottotitolo}</Text>}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
  },
  titolo: {
    ...tipografia.corpo,
    fontSize: 16,
    color: bento.testoPrimario,
    marginTop: spaziatura.md,
  },
  sottotitolo: {
    ...tipografia.corpoSecondario,
    color: bento.testoSecondario,
    marginTop: 2,
  },
});
