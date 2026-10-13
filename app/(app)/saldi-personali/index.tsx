import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { useSaldiAggregati, type SaldoPersona } from '@/hooks/useSaldiAggregati';
import { formattaEuro } from '@/lib/formato';

export default function SaldiPersonali() {
  const { persone, isLoading } = useSaldiAggregati();

  function apriPersona(persona: SaldoPersona) {
    router.push({
      pathname: '/saldi-personali/[utenteId]',
      params: { utenteId: persona.utenteId, nome: persona.nome },
    });
  }

  if (isLoading) {
    return (
      <View style={styles.centrato}>
        <ActivityIndicator />
      </View>
    );
  }

  if (persone.length === 0) {
    return (
      <View style={styles.centrato}>
        <Text style={styles.inPari}>Sei in pari con tutti! 🎉</Text>
        <Text style={styles.sottotitolo}>
          Nessun saldo aperto con nessuno, in nessuno dei tuoi gruppi.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.contenitore}>
      <Text style={styles.sottotitolo}>
        Saldo netto con ogni persona, sommato su tutti i gruppi in comune.
      </Text>
      <FlatList
        data={persone}
        keyExtractor={(persona) => persona.utenteId}
        renderItem={({ item }) => {
          const miDeve = item.nettoCentesimi > 0;
          return (
            <Pressable style={styles.riga} onPress={() => apriPersona(item)}>
              <Text style={styles.testo}>
                {miDeve ? (
                  <>
                    <Text style={styles.nome}>{item.nome}</Text> ti deve
                  </>
                ) : (
                  <>
                    Devi a <Text style={styles.nome}>{item.nome}</Text>
                  </>
                )}
              </Text>
              <Text style={[styles.importo, miDeve ? styles.importoCredito : styles.importoDebito]}>
                {formattaEuro(Math.abs(item.nettoCentesimi))}
              </Text>
            </Pressable>
          );
        }}
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
  contenitore: {
    flex: 1,
    padding: 16,
  },
  inPari: {
    fontSize: 20,
    fontWeight: '600',
  },
  sottotitolo: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    marginBottom: 8,
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
  },
  nome: {
    fontWeight: '600',
  },
  importo: {
    fontSize: 16,
    fontWeight: '700',
  },
  importoCredito: {
    color: '#2e7d32',
  },
  importoDebito: {
    color: '#c0392b',
  },
});
