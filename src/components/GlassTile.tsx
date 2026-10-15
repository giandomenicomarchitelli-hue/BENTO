import { Feather } from '@expo/vector-icons';
import { Text, View, StyleSheet } from 'react-native';

import { Badge } from '@/components/Badge';
import { GlassCard } from '@/components/GlassCard';
import { IconBadge } from '@/components/IconBadge';
import { bento, spaziatura, tipografia } from '@/theme/tokens';

type Props = {
  icona: keyof typeof Feather.glyphMap;
  /** Colore d'accento (vedi `accenti` in tokens.ts) - solo identità visiva. */
  accento: string;
  titolo: string;
  sottotitolo?: string;
  /**
   * Assente per una tile non interattiva (anteprima di una funzione non
   * ancora disponibile): niente Pressable, nessuna azione da intraprendere.
   */
  onPress?: () => void;
  /** Etichetta pillola in alto a destra (es. "Presto"), per segnare una funzione non ancora disponibile. */
  badge?: string;
};

/** Tile di navigazione su superficie vetro, per le azioni principali della home/dashboard. */
export function GlassTile({ icona, accento, titolo, sottotitolo, onPress, badge }: Props) {
  return (
    <GlassCard onPress={onPress} style={styles.card}>
      <View style={styles.rigaAlta}>
        <IconBadge icona={icona} colore={accento} />
        {badge !== undefined && <Badge testo={badge} tono="neutro" />}
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
  rigaAlta: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
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
