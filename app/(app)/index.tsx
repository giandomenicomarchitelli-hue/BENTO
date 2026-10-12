import { router, Link } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { esci } from '@/api/auth';
import type { Gruppo } from '@/api/gruppi';
import { useMieiGruppi } from '@/hooks/useMieiGruppi';
import { useGruppoAttivoStore } from '@/store/gruppoAttivoStore';

export default function Home() {
  const { gruppi, isLoading } = useMieiGruppi();
  const impostaGruppoAttivo = useGruppoAttivoStore((stato) => stato.impostaGruppoAttivo);

  function apriGruppo(gruppo: Gruppo) {
    impostaGruppoAttivo(gruppo.id);
    router.push('/dashboard');
  }

  return (
    <View style={styles.contenitore}>
      <Text style={styles.titolo}>I tuoi gruppi</Text>

      {isLoading ? (
        <ActivityIndicator style={styles.caricamento} />
      ) : gruppi.length === 0 ? (
        <Text style={styles.vuoto}>Non fai ancora parte di nessun gruppo.</Text>
      ) : (
        <FlatList
          data={gruppi}
          keyExtractor={(gruppo) => gruppo.id}
          style={styles.elenco}
          renderItem={({ item }) => (
            <Pressable style={styles.riga} onPress={() => apriGruppo(item)}>
              <Text style={styles.nomeGruppo}>{item.nome}</Text>
              <Text style={styles.tipoGruppo}>{item.tipo}</Text>
            </Pressable>
          )}
        />
      )}

      <View style={styles.azioni}>
        <Link href="/onboarding/crea-gruppo" style={styles.bottone}>
          Crea un gruppo
        </Link>
        <Link href="/onboarding/unisciti-a-gruppo" style={styles.bottoneSecondario}>
          Ho un codice invito
        </Link>
      </View>

      <Pressable style={styles.bottoneEsci} onPress={() => esci()}>
        <Text style={styles.testoBottoneEsci}>Esci</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  contenitore: {
    flex: 1,
    padding: 24,
  },
  titolo: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  caricamento: {
    marginTop: 24,
  },
  vuoto: {
    textAlign: 'center',
    color: '#888',
    marginTop: 8,
    marginBottom: 16,
  },
  elenco: {
    flexGrow: 0,
    marginBottom: 16,
  },
  riga: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  nomeGruppo: {
    fontSize: 17,
    fontWeight: '600',
  },
  tipoGruppo: {
    fontSize: 13,
    color: '#888',
    textTransform: 'capitalize',
  },
  azioni: {
    gap: 8,
  },
  bottone: {
    backgroundColor: '#2d6cdf',
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    borderRadius: 8,
    paddingVertical: 14,
    textAlign: 'center',
    overflow: 'hidden',
  },
  bottoneSecondario: {
    borderWidth: 1,
    borderColor: '#2d6cdf',
    color: '#2d6cdf',
    fontSize: 16,
    fontWeight: '600',
    borderRadius: 8,
    paddingVertical: 14,
    textAlign: 'center',
    overflow: 'hidden',
  },
  bottoneEsci: {
    marginTop: 24,
    alignSelf: 'center',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#c0392b',
  },
  testoBottoneEsci: {
    color: '#c0392b',
    fontSize: 15,
    fontWeight: '600',
  },
});
