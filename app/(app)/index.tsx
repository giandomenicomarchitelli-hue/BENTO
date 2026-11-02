import { Redirect, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { BentoScreen } from '@/components/BentoScreen';
import { GlassCard } from '@/components/GlassCard';
import { IconBadge } from '@/components/IconBadge';
import { useProfilo } from '@/hooks/useProfilo';
import { accenti, bento, spaziatura, tipografia } from '@/theme/tokens';

export default function Homepage() {
  const router = useRouter();
  const { profilo, isLoading: profiloInCaricamento } = useProfilo();

  // Serve un nome utente fisso prima di poter fare qualunque cosa.
  if (profiloInCaricamento) {
    return (
      <View style={styles.centrato}>
        <ActivityIndicator color={bento.testoPrimario} />
      </View>
    );
  }
  if (profilo === null) {
    return <Redirect href="/crea-profilo" />;
  }

  return (
    <BentoScreen senzaIntestazione>
      <Text style={styles.saluto}>Ciao, {profilo.nome_utente}</Text>

      <View style={styles.scelte}>
        <GlassCard onPress={() => router.push('/personale')} style={styles.tile}>
          <IconBadge icona="user" colore={accenti.indaco} dimensione={56} />
          <Text style={styles.titoloTile}>Personale</Text>
          <Text style={styles.sottotitoloTile}>Le tue cose private</Text>
        </GlassCard>
        <GlassCard onPress={() => router.push('/gruppi')} style={styles.tile}>
          <IconBadge icona="users" colore={accenti.menta} dimensione={56} />
          <Text style={styles.titoloTile}>Gruppi</Text>
          <Text style={styles.sottotitoloTile}>Quello che condividi con gli altri</Text>
        </GlassCard>
      </View>
    </BentoScreen>
  );
}

const styles = StyleSheet.create({
  centrato: {
    flex: 1,
    backgroundColor: bento.sfondo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saluto: {
    ...tipografia.display,
    fontSize: 28,
    color: bento.testoPrimario,
  },
  scelte: {
    gap: spaziatura.md,
  },
  tile: {
    width: '100%',
    paddingVertical: spaziatura.xl,
    alignItems: 'center',
  },
  titoloTile: {
    ...tipografia.corpo,
    fontSize: 20,
    color: bento.testoPrimario,
    marginTop: spaziatura.md,
  },
  sottotitoloTile: {
    ...tipografia.corpoSecondario,
    color: bento.testoSecondario,
    marginTop: 2,
    textAlign: 'center',
  },
});
