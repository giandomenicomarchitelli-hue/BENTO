import { Link, Redirect } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import type { SpesaConQuote } from '@/api/spese';
import { useGruppoAttivo } from '@/hooks/useGruppoAttivo';
import { useSpese } from '@/hooks/useSpese';
import { useGruppoAttivoStore } from '@/store/gruppoAttivoStore';
import { formattaEuro } from '@/lib/formato';

export default function Spese() {
  const gruppoAttivoId = useGruppoAttivoStore((stato) => stato.gruppoAttivoId);

  if (gruppoAttivoId === null) {
    return <Redirect href="/" />;
  }

  return <SpeseDelGruppo gruppoAttivoId={gruppoAttivoId} />;
}

function SpeseDelGruppo({ gruppoAttivoId }: { gruppoAttivoId: string }) {
  const { membri } = useGruppoAttivo();
  const { spese, isLoading, annulla } = useSpese(gruppoAttivoId);

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
    <View style={styles.contenitore}>
      <Link href="/spese/nuova" style={styles.bottoneNuova}>
        + Nuova spesa
      </Link>

      {isLoading ? (
        <ActivityIndicator style={styles.caricamento} />
      ) : spese.length === 0 ? (
        <Text style={styles.vuoto}>Nessuna spesa registrata.</Text>
      ) : (
        <FlatList
          data={spese}
          keyExtractor={(spesa) => spesa.id}
          renderItem={({ item }) => <RigaSpesa spesa={item} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenitore: {
    flex: 1,
    padding: 16,
    gap: 12,
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
  },
  caricamento: {
    marginTop: 24,
  },
  vuoto: {
    textAlign: 'center',
    color: '#888',
    marginTop: 24,
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
  importo: {
    fontSize: 16,
    fontWeight: '600',
  },
  annulla: {
    color: '#c0392b',
    fontSize: 13,
  },
});
