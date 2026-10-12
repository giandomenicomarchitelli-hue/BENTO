import { Link, Redirect } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { esci } from '@/api/auth';
import { useMieiGruppi } from '@/hooks/useMieiGruppi';
import { useAuthStore } from '@/store/authStore';
import { useGruppoAttivoStore } from '@/store/gruppoAttivoStore';

export default function Home() {
  const email = useAuthStore((stato) => stato.session?.user.email);
  const { gruppi, isLoading } = useMieiGruppi();
  const gruppoAttivoId = useGruppoAttivoStore((stato) => stato.gruppoAttivoId);
  const impostaGruppoAttivo = useGruppoAttivoStore((stato) => stato.impostaGruppoAttivo);

  const primoGruppo = gruppi[0] ?? null;

  useEffect(() => {
    if (primoGruppo !== null && gruppoAttivoId !== primoGruppo.id) {
      impostaGruppoAttivo(primoGruppo.id);
    }
  }, [primoGruppo, gruppoAttivoId, impostaGruppoAttivo]);

  if (isLoading) {
    return (
      <View style={styles.centrato}>
        <ActivityIndicator />
      </View>
    );
  }

  if (primoGruppo === null) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <View style={styles.contenitore}>
      <Text style={styles.titolo}>{primoGruppo.nome}</Text>
      <Text style={styles.sottotitolo}>
        Fase 1 in corso: lista della spesa e spese condivise con saldo.
      </Text>
      {email !== undefined && <Text style={styles.email}>Accesso effettuato come {email}</Text>}

      <Link href="/lista-spesa" style={styles.link}>
        Lista della spesa
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
  sottotitolo: {
    fontSize: 15,
    textAlign: 'center',
    color: '#555',
  },
  email: {
    fontSize: 13,
    color: '#888',
    marginTop: 16,
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
