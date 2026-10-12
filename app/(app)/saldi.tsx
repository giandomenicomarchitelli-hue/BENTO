import { Link, Redirect } from 'expo-router';
import { ActivityIndicator, ScrollView, Pressable, StyleSheet, Text, View } from 'react-native';

import type { SpesaConQuote } from '@/api/spese';
import { useGruppoAttivo } from '@/hooks/useGruppoAttivo';
import { useSaldi } from '@/hooks/useSaldi';
import { useSpese } from '@/hooks/useSpese';
import { formattaEuro } from '@/lib/formato';
import { useGruppoAttivoStore } from '@/store/gruppoAttivoStore';

export default function Saldi() {
  const gruppoAttivoId = useGruppoAttivoStore((stato) => stato.gruppoAttivoId);

  if (gruppoAttivoId === null) {
    return <Redirect href="/" />;
  }

  return <SaldiDelGruppo gruppoAttivoId={gruppoAttivoId} />;
}

function SaldiDelGruppo({ gruppoAttivoId }: { gruppoAttivoId: string }) {
  const { membri } = useGruppoAttivo();
  const { transazioni, isLoading: saldiInCaricamento } = useSaldi(gruppoAttivoId);
  const { spese, isLoading: speseInCaricamento, annulla } = useSpese(gruppoAttivoId);

  const nomeMembro = (membroId: string) =>
    membri.find((m) => m.id === membroId)?.nome ?? 'Qualcuno';

  function RigaSpesa({ spesa }: { spesa: SpesaConQuote }) {
    return (
      <View style={styles.riga}>
        <View style={styles.rigaTesto}>
          <Text style={styles.descrizione}>
            {spesa.descrizione !== '' ? spesa.descrizione : 'Spesa'}
          </Text>
          <Text style={styles.dettaglio}>
            {nomeMembro(spesa.pagato_da)} · {spesa.data}
          </Text>
        </View>
        <Text style={styles.importo}>{formattaEuro(spesa.importo_centesimi)}</Text>
        <Pressable onPress={() => annulla.mutate(spesa.id)} hitSlop={8}>
          <Text style={styles.annulla}>Annulla</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.contenitore} contentContainerStyle={styles.contenuto}>
      <Link href="/spese/nuova" style={styles.bottoneNuova}>
        + Nuova spesa
      </Link>

      <Text style={styles.titoloSezione}>Saldi</Text>
      {saldiInCaricamento ? (
        <ActivityIndicator style={styles.caricamento} />
      ) : transazioni.length === 0 ? (
        <Text style={styles.vuoto}>Siete in pari! 🎉</Text>
      ) : (
        transazioni.map((t, indice) => (
          <View key={`${t.da}-${t.a}-${indice}`} style={styles.riga}>
            <Text style={styles.testo}>
              <Text style={styles.nome}>{nomeMembro(t.da)}</Text> deve a{' '}
              <Text style={styles.nome}>{nomeMembro(t.a)}</Text>
            </Text>
            <Text style={styles.importo}>{formattaEuro(t.importoCentesimi)}</Text>
          </View>
        ))
      )}

      <Text style={styles.titoloSezione}>Spese</Text>
      {speseInCaricamento ? (
        <ActivityIndicator style={styles.caricamento} />
      ) : spese.length === 0 ? (
        <Text style={styles.vuoto}>Nessuna spesa registrata.</Text>
      ) : (
        spese.map((spesa) => <RigaSpesa key={spesa.id} spesa={spesa} />)
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenitore: {
    flex: 1,
  },
  contenuto: {
    padding: 16,
    gap: 8,
  },
  bottoneNuova: {
    backgroundColor: '#2d6cdf',
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    borderRadius: 8,
    paddingVertical: 12,
    textAlign: 'center',
    overflow: 'hidden',
    marginBottom: 8,
  },
  titoloSezione: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    marginTop: 16,
  },
  caricamento: {
    marginTop: 12,
  },
  vuoto: {
    textAlign: 'center',
    color: '#888',
    marginTop: 12,
  },
  riga: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  rigaTesto: {
    flex: 1,
  },
  descrizione: {
    fontSize: 16,
  },
  dettaglio: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  testo: {
    fontSize: 16,
    flex: 1,
  },
  nome: {
    fontWeight: '600',
  },
  importo: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2d6cdf',
  },
  annulla: {
    color: '#c0392b',
    fontSize: 13,
  },
});
