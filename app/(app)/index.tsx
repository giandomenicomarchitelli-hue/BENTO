import { Pressable, StyleSheet, Text, View } from 'react-native';

import { esci } from '@/api/auth';
import { useAuthStore } from '@/store/authStore';

export default function Home() {
  const email = useAuthStore((stato) => stato.session?.user.email);

  return (
    <View style={styles.contenitore}>
      <Text style={styles.titolo}>Gestione Casa</Text>
      <Text style={styles.sottotitolo}>
        Fase 1 in corso: lista della spesa e spese condivise con saldo.
      </Text>
      {email !== undefined && <Text style={styles.email}>Accesso effettuato come {email}</Text>}

      <Pressable style={styles.bottone} onPress={() => esci()}>
        <Text style={styles.testoBottone}>Esci</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
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
