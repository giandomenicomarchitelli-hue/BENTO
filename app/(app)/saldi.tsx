import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { useGruppoAttivo } from '@/hooks/useGruppoAttivo';
import { useSaldi } from '@/hooks/useSaldi';
import { formattaEuro } from '@/lib/formato';
import { useGruppoAttivoStore } from '@/store/gruppoAttivoStore';

export default function Saldi() {
  const gruppoAttivoId = useGruppoAttivoStore((stato) => stato.gruppoAttivoId);
  const { membri } = useGruppoAttivo();
  const { transazioni, isLoading } = useSaldi(gruppoAttivoId);

  const nomeMembro = (membroId: string) =>
    membri.find((m) => m.id === membroId)?.nome ?? 'Qualcuno';

  if (isLoading) {
    return (
      <View style={styles.centrato}>
        <ActivityIndicator />
      </View>
    );
  }

  if (transazioni.length === 0) {
    return (
      <View style={styles.centrato}>
        <Text style={styles.inPari}>Siete in pari! 🎉</Text>
        <Text style={styles.sottotitolo}>Nessun saldo da regolare al momento.</Text>
      </View>
    );
  }

  return (
    <View style={styles.contenitore}>
      <FlatList
        data={transazioni}
        keyExtractor={(t, indice) => `${t.da}-${t.a}-${indice}`}
        renderItem={({ item }) => (
          <View style={styles.riga}>
            <Text style={styles.testo}>
              <Text style={styles.nome}>{nomeMembro(item.da)}</Text> deve a{' '}
              <Text style={styles.nome}>{nomeMembro(item.a)}</Text>
            </Text>
            <Text style={styles.importo}>{formattaEuro(item.importoCentesimi)}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  centrato: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24,
  },
  inPari: {
    fontSize: 20,
    fontWeight: '600',
  },
  sottotitolo: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
  },
  contenitore: {
    flex: 1,
    padding: 16,
  },
  riga: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
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
});
