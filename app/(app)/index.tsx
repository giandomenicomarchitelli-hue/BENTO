import { Link, Redirect } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { esci } from '@/api/auth';
import { useProfilo } from '@/hooks/useProfilo';
import { useSaldiAggregati } from '@/hooks/useSaldiAggregati';
import { formattaEuro } from '@/lib/formato';

export default function Homepage() {
  const { profilo, isLoading: profiloInCaricamento } = useProfilo();
  const { persone: personeConSaldo } = useSaldiAggregati();

  // Serve un nome utente fisso prima di poter fare qualunque cosa.
  if (profiloInCaricamento) {
    return (
      <View style={styles.centrato}>
        <ActivityIndicator />
      </View>
    );
  }
  if (profilo === null) {
    return <Redirect href="/crea-profilo" />;
  }

  return (
    <View style={styles.contenitore}>
      <Text style={styles.titolo}>Gestione Casa</Text>

      <View style={styles.scelte}>
        <Link href="/gruppi" asChild>
          <Pressable style={styles.carta}>
            <Text style={styles.testoCarta}>I tuoi gruppi</Text>
            <Text style={styles.dettaglioCarta}>
              Spesa, spese e liste dei gruppi a cui partecipi
            </Text>
          </Pressable>
        </Link>

        <Link href="/saldi-personali" asChild>
          <Pressable style={StyleSheet.flatten([styles.carta, styles.cartaSaldi])}>
            <Text style={[styles.testoCarta, styles.testoCartaSaldi]}>I miei saldi</Text>
            <Text style={[styles.dettaglioCarta, styles.dettaglioCartaSaldi]}>
              {personeConSaldo.length === 0
                ? 'Sei in pari con tutti'
                : personeConSaldo.length === 1
                  ? `Hai un saldo aperto con ${personeConSaldo[0].nome} (${formattaEuro(Math.abs(personeConSaldo[0].nettoCentesimi))}), sommato su tutti i gruppi in comune`
                  : `Hai saldi aperti con ${personeConSaldo.length} persone, sommati su tutti i gruppi in comune`}
            </Text>
          </Pressable>
        </Link>
      </View>

      <Link href="/profilo" style={styles.linkProfilo}>
        {profilo.nome_utente}
      </Link>

      <Text style={styles.bottoneEsci} onPress={() => esci()}>
        Esci
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centrato: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contenitore: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  titolo: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 32,
  },
  scelte: {
    gap: 16,
  },
  carta: {
    backgroundColor: '#2d6cdf',
    borderRadius: 12,
    padding: 20,
  },
  cartaSaldi: {
    backgroundColor: '#eaf0fd',
  },
  testoCarta: {
    fontSize: 19,
    fontWeight: '700',
    color: '#fff',
  },
  testoCartaSaldi: {
    color: '#2d6cdf',
  },
  dettaglioCarta: {
    fontSize: 13,
    color: '#e4ecfc',
    marginTop: 6,
  },
  dettaglioCartaSaldi: {
    color: '#4a76c4',
  },
  linkProfilo: {
    marginTop: 40,
    alignSelf: 'center',
    color: '#2d6cdf',
    fontSize: 14,
    fontWeight: '600',
  },
  bottoneEsci: {
    marginTop: 16,
    alignSelf: 'center',
    color: '#c0392b',
    fontSize: 14,
    fontWeight: '600',
  },
});
