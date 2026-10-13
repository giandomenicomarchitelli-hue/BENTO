import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useProfilo } from '@/hooks/useProfilo';

export default function Profilo() {
  const { profilo, isLoading } = useProfilo();
  const [copiato, setCopiato] = useState(false);

  if (isLoading || profilo === null) {
    return (
      <View style={styles.centrato}>
        <ActivityIndicator />
      </View>
    );
  }

  const copiaCodice = async () => {
    await Clipboard.setStringAsync(profilo.codice_utente);
    setCopiato(true);
    setTimeout(() => setCopiato(false), 2000);
  };

  return (
    <View style={styles.contenitore}>
      <Text style={styles.etichetta}>Nome utente</Text>
      <Text style={styles.nomeUtente}>{profilo.nome_utente}</Text>
      <Text style={styles.suggerimento}>
        Fisso: è il nome con cui ti vedono gli altri in ogni gruppo.
      </Text>

      <Text style={[styles.etichetta, styles.etichettaCodice]}>Codice utente</Text>
      <Pressable style={styles.riquadroCodice} onPress={copiaCodice}>
        <Text style={styles.codice}>{profilo.codice_utente}</Text>
      </Pressable>
      <Text style={styles.suggerimento}>
        {copiato ? 'Copiato!' : 'Tocca il codice per copiarlo'}
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
  },
  etichetta: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
  },
  etichettaCodice: {
    marginTop: 32,
  },
  nomeUtente: {
    fontSize: 24,
    fontWeight: '700',
  },
  riquadroCodice: {
    borderWidth: 1,
    borderColor: '#2d6cdf',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  codice: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 2,
    color: '#2d6cdf',
  },
  suggerimento: {
    fontSize: 13,
    color: '#888',
    marginTop: 8,
  },
});
