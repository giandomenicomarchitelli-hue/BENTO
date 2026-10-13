import { Link, Redirect } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { esci } from '@/api/auth';
import { useGruppoAttivo } from '@/hooks/useGruppoAttivo';
import { useListe } from '@/hooks/useListe';
import { useAuthStore } from '@/store/authStore';
import { useGruppoAttivoStore } from '@/store/gruppoAttivoStore';

export default function Dashboard() {
  const email = useAuthStore((stato) => stato.session?.user.email);
  const gruppoAttivoId = useGruppoAttivoStore((stato) => stato.gruppoAttivoId);
  const { gruppo, isLoading } = useGruppoAttivo();
  const { liste } = useListe(gruppoAttivoId);
  const listeInHome = liste.filter((l) => l.mostra_in_home);

  // Si arriva qui solo scegliendo un gruppo dall'elenco gruppi; senza un
  // gruppo attivo selezionato (es. link diretto, o store appena resettato)
  // si torna all'elenco gruppi.
  if (gruppoAttivoId === null) {
    return <Redirect href="/gruppi" />;
  }

  if (isLoading || gruppo === null) {
    return (
      <View style={styles.centrato}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.contenitore}>
      <Text style={styles.titolo}>{gruppo.nome}</Text>
      {email !== undefined && <Text style={styles.email}>Accesso effettuato come {email}</Text>}

      <Link href="/lista-spesa" style={styles.link}>
        Lista della spesa
      </Link>
      <Link href="/saldi" style={styles.link}>
        Saldi e spese
      </Link>
      <Link href="/liste" style={styles.link}>
        Liste
      </Link>
      {listeInHome.map((lista) => (
        <Link
          key={lista.id}
          href={{ pathname: '/liste/[id]', params: { id: lista.id, nome: lista.nome, conPrezzi: lista.con_prezzi ? '1' : '0' } }}
          style={styles.link}
        >
          {lista.nome}
        </Link>
      ))}
      <Link href="/gruppo" style={styles.link}>
        Il tuo gruppo
      </Link>

      <Pressable style={styles.bottone} onPress={() => esci()}>
        <Text style={styles.testoBottone}>Esci</Text>
      </Pressable>
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  titolo: {
    fontSize: 24,
    fontWeight: '600',
  },
  email: {
    fontSize: 13,
    color: '#888',
    marginTop: 8,
  },
  link: {
    marginTop: 20,
    color: '#2d6cdf',
    fontSize: 16,
    fontWeight: '600',
  },
  bottone: {
    marginTop: 24,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#c0392b',
  },
  testoBottone: {
    color: '#c0392b',
    fontSize: 15,
    fontWeight: '600',
  },
});
