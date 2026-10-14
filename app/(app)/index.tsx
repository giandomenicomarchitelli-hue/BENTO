import { Feather } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { esci } from '@/api/auth';
import { BentoButton } from '@/components/BentoButton';
import { BentoScreen } from '@/components/BentoScreen';
import { GlassCard } from '@/components/GlassCard';
import { GlassTile } from '@/components/GlassTile';
import { useMieiGruppi } from '@/hooks/useMieiGruppi';
import { useProfilo } from '@/hooks/useProfilo';
import { accenti, coloriScuri, spaziatura, tipografia } from '@/theme/tokens';

export default function Homepage() {
  const router = useRouter();
  const { profilo, isLoading: profiloInCaricamento } = useProfilo();
  const { gruppi, isLoading: gruppiInCaricamento, error: erroreGruppi } = useMieiGruppi();

  // Serve un nome utente fisso prima di poter fare qualunque cosa.
  if (profiloInCaricamento) {
    return (
      <View style={styles.centrato}>
        <ActivityIndicator color={coloriScuri.testoPrimario} />
      </View>
    );
  }
  if (profilo === null) {
    return <Redirect href="/crea-profilo" />;
  }

  const sottotitoloGruppi =
    gruppi.length === 0
      ? 'Non fai ancora parte di nessun gruppo'
      : gruppi.length === 1
        ? gruppi[0].nome
        : 'Casa, viaggi, ufficio e altro';

  return (
    <BentoScreen>
      <View>
        <Text style={styles.marchio}>BENTO · EVERYTHING, TOGETHER</Text>
        <Text style={styles.saluto}>Ciao, {profilo.nome_utente}</Text>
      </View>

      {erroreGruppi ? (
        <GlassCard>
          <View style={styles.rigaErrore}>
            <Feather name="alert-circle" size={18} color={coloriScuri.testoSecondario} />
            <Text style={styles.testoErrore}>Non riesco a caricare i tuoi gruppi al momento.</Text>
          </View>
        </GlassCard>
      ) : (
        <GlassCard onPress={() => router.push('/gruppi')} variante="alta">
          <Text style={styles.etichettaHero}>I MIEI GRUPPI</Text>
          {gruppiInCaricamento ? (
            <ActivityIndicator color={coloriScuri.testoPrimario} style={styles.caricamentoHero} />
          ) : (
            <Text style={styles.numeroHero}>{gruppi.length}</Text>
          )}
          <Text style={styles.dettaglioHero}>{sottotitoloGruppi}</Text>
        </GlassCard>
      )}

      <View style={styles.righeTile}>
        <GlassTile
          icona="users"
          accento={accenti.gruppi}
          titolo="I tuoi gruppi"
          sottotitolo="Spesa, spese e liste"
          onPress={() => router.push('/gruppi')}
        />
        <GlassTile
          icona="repeat"
          accento={accenti.finanza}
          titolo="I miei saldi"
          sottotitolo="Con tutte le persone"
          onPress={() => router.push('/saldi-personali')}
        />
      </View>

      <View style={styles.spaziatore} />

      <View style={styles.piePagina}>
        <BentoButton
          variante="testo"
          etichetta={profilo.nome_utente}
          onPress={() => router.push('/profilo')}
        />
        <BentoButton variante="testo" etichetta="Esci" onPress={() => esci()} />
      </View>
    </BentoScreen>
  );
}

const styles = StyleSheet.create({
  centrato: {
    flex: 1,
    backgroundColor: coloriScuri.sfondo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marchio: {
    ...tipografia.didascalia,
    color: coloriScuri.testoSecondario,
  },
  saluto: {
    ...tipografia.display,
    color: coloriScuri.testoPrimario,
    marginTop: 4,
  },
  rigaErrore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spaziatura.sm,
  },
  testoErrore: {
    flex: 1,
    color: coloriScuri.testoSecondario,
    fontSize: 14,
  },
  etichettaHero: {
    ...tipografia.didascalia,
    color: coloriScuri.testoSecondario,
  },
  numeroHero: {
    ...tipografia.display,
    color: coloriScuri.testoPrimario,
    marginTop: 4,
  },
  caricamentoHero: {
    alignSelf: 'flex-start',
    marginTop: spaziatura.sm,
  },
  dettaglioHero: {
    fontSize: 13,
    color: coloriScuri.testoSecondario,
    marginTop: 4,
  },
  righeTile: {
    flexDirection: 'row',
    gap: spaziatura.md,
  },
  spaziatore: {
    flex: 1,
  },
  piePagina: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spaziatura.lg,
    borderTopWidth: 1,
    borderTopColor: coloriScuri.bordo,
  },
});
