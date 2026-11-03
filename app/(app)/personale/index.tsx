import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { BentoScreen } from '@/components/BentoScreen';
import { GlassTile } from '@/components/GlassTile';
import { accenti, bento, spaziatura, tipografia } from '@/theme/tokens';

export default function PersonaleHome() {
  const router = useRouter();

  return (
    <BentoScreen senzaIntestazione>
      <Text style={styles.titolo}>Personale</Text>

      <View style={styles.griglia}>
        <View style={styles.rigaGriglia}>
          <GlassTile
            icona="bookmark"
            accento={accenti.oro}
            titolo="Liste"
            onPress={() => router.push('/personale/liste')}
          />
          <GlassTile
            icona="file-text"
            accento={accenti.viola}
            titolo="Note"
            onPress={() => router.push('/personale/note')}
          />
        </View>
        <View style={styles.rigaGriglia}>
          <GlassTile icona="calendar" accento={accenti.indaco} titolo="Calendario" badge="Presto" />
        </View>
      </View>
    </BentoScreen>
  );
}

const styles = StyleSheet.create({
  titolo: {
    ...tipografia.titolo,
    color: bento.testoPrimario,
  },
  griglia: {
    gap: spaziatura.md,
  },
  rigaGriglia: {
    flexDirection: 'row',
    gap: spaziatura.md,
  },
});
