import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { GlassCard } from '@/components/GlassCard';
import { IconBadge } from '@/components/IconBadge';
import { bento, spaziatura } from '@/theme/tokens';

type Props = {
  icona: keyof typeof Feather.glyphMap;
  accento: string;
  titolo: string;
  onPress: () => void;
};

/** Riga cliccabile in stile vetro (icona + titolo + freccia), per elenchi di destinazioni semplici. */
export function GlassListRow({ icona, accento, titolo, onPress }: Props) {
  return (
    <GlassCard onPress={onPress} elevazione="bassa" style={styles.card}>
      <View style={styles.riga}>
        <IconBadge icona={icona} colore={accento} dimensione={36} />
        <Text style={styles.titolo} numberOfLines={1}>
          {titolo}
        </Text>
        <Feather name="chevron-right" size={18} color={bento.testoMuto} />
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
  },
  riga: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spaziatura.md,
  },
  titolo: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: bento.testoPrimario,
  },
});
