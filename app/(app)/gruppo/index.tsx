import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { useGruppoAttivo } from '@/hooks/useGruppoAttivo';

export default function Gruppo() {
  const { gruppo, membri, isLoading } = useGruppoAttivo();
  const [copiato, setCopiato] = useState(false);

  if (isLoading || gruppo === null) {
    return (
      <View style={styles.centrato}>
        <ActivityIndicator />
      </View>
    );
  }

  const copiaCodice = async () => {
    await Clipboard.setStringAsync(gruppo.codice_invito);
    setCopiato(true);
    setTimeout(() => setCopiato(false), 2000);
  };

  const condividiCodice = () => {
    Share.share({
      message: `Unisciti al mio gruppo "${gruppo.nome}" su Gestione Casa! Codice invito: ${gruppo.codice_invito}`,
    });
  };

  return (
    <View style={styles.contenitore}>
      <Text style={styles.titolo}>{gruppo.nome}</Text>

      <Text style={styles.etichetta}>Codice invito</Text>
      <Pressable style={styles.riquadroCodice} onPress={copiaCodice}>
        <Text style={styles.codice}>{gruppo.codice_invito}</Text>
      </Pressable>
      <Text style={styles.suggerimento}>
        {copiato ? 'Copiato!' : 'Tocca il codice per copiarlo'}
      </Text>

      <Pressable style={styles.bottone} onPress={condividiCodice}>
        <Text style={styles.testoBottone}>Condividi invito</Text>
      </Pressable>

      <Text style={[styles.etichetta, styles.etichettaMembri]}>
        Membri ({membri.length})
      </Text>
      {membri.map((membro) => (
        <Text key={membro.id} style={styles.membro}>
          {membro.nome}
        </Text>
      ))}
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
  titolo: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24,
  },
  etichetta: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
  },
  riquadroCodice: {
    borderWidth: 1,
    borderColor: '#2d6cdf',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  codice: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 2,
    color: '#2d6cdf',
  },
  suggerimento: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
  },
  bottone: {
    backgroundColor: '#2d6cdf',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  testoBottone: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  etichettaMembri: {
    marginTop: 32,
  },
  membro: {
    fontSize: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
});
