import { Feather } from '@expo/vector-icons';
import { Link, Redirect, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { esci } from '@/api/auth';
import { GradientCard } from '@/components/GradientCard';
import { ListGroup } from '@/components/ListGroup';
import { ListRow } from '@/components/ListRow';
import { useMieiGruppi } from '@/hooks/useMieiGruppi';
import { useProfilo } from '@/hooks/useProfilo';
import { useSaldiAggregati } from '@/hooks/useSaldiAggregati';
import { formattaEuro } from '@/lib/formato';
import { colori, spaziatura, tipografia } from '@/theme/tokens';

export default function Homepage() {
  const router = useRouter();
  const { profilo, isLoading: profiloInCaricamento } = useProfilo();
  const { persone: personeConSaldo } = useSaldiAggregati();
  const { gruppi } = useMieiGruppi();

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

  const inPari = personeConSaldo.length === 0;
  // Saldo netto complessivo: crediti meno debiti su tutte le persone.
  const nettoComplessivoCentesimi = personeConSaldo.reduce((t, p) => t + p.nettoCentesimi, 0);

  return (
    <View style={styles.contenitore}>
      <View style={styles.intestazione}>
        <Text style={styles.titolo}>Bento</Text>
        <Text style={styles.payoff}>Everything, together.</Text>
      </View>

      <Link href="/gruppi" asChild>
        <GradientCard style={styles.cardHero}>
          <Text style={styles.etichettaHero}>I MIEI GRUPPI</Text>
          <Text style={styles.importoHero}>{gruppi.length}</Text>
          <Text style={styles.dettaglioHero}>
            {gruppi.length === 0
              ? 'Non fai ancora parte di nessun gruppo'
              : gruppi.length === 1
                ? gruppi[0].nome
                : 'Casa, viaggi, ufficio e altro'}
          </Text>
        </GradientCard>
      </Link>

      <View style={styles.sezione}>
        <ListGroup>
          <ListRow
            icona="repeat"
            titolo="I miei saldi"
            meta={
              inPari
                ? 'Sei in pari'
                : formattaEuro(Math.abs(nettoComplessivoCentesimi))
            }
            onPress={() => router.push('/saldi-personali')}
          />
        </ListGroup>
      </View>

      <View style={styles.spaziatore} />

      <View style={styles.piePagina}>
        <Link href="/profilo" style={styles.linkProfilo}>
          {profilo.nome_utente}
        </Link>
        <Pressable style={styles.bottoneEsci} onPress={() => esci()}>
          <Feather name="log-out" size={15} color={colori.rosso600} />
          <Text style={styles.testoEsci}>Esci</Text>
        </Pressable>
      </View>
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
    backgroundColor: colori.sfondoApp,
    padding: spaziatura.xl,
    paddingTop: spaziatura.xxl,
    gap: spaziatura.xxl,
  },
  intestazione: {
    alignItems: 'center',
  },
  titolo: {
    ...tipografia.titolo,
    color: colori.inchiostro900,
  },
  payoff: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '500',
    color: colori.inchiostro500,
  },
  cardHero: {
    gap: 4,
  },
  etichettaHero: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: 'rgba(255,255,255,0.8)',
  },
  importoHero: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    marginTop: 2,
  },
  dettaglioHero: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  sezione: {
    gap: 10,
  },
  spaziatore: {
    flex: 1,
  },
  piePagina: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colori.inchiostro150,
  },
  linkProfilo: {
    color: colori.blu600,
    fontSize: 14,
    fontWeight: '600',
  },
  bottoneEsci: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  testoEsci: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colori.rosso600,
  },
});
