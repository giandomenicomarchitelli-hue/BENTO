import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { z } from 'zod';

import { useProfilo } from '@/hooks/useProfilo';

const schema = z.object({
  nomeUtente: z
    .string()
    .trim()
    .min(3, 'Almeno 3 caratteri')
    .max(30, 'Massimo 30 caratteri')
    .regex(/^[a-zA-Z0-9_]+$/, 'Solo lettere, numeri e underscore, senza spazi'),
});

export default function CreaProfilo() {
  const { profilo, isLoading, crea } = useProfilo();
  const [nomeUtente, setNomeUtente] = useState('');
  const [errore, setErrore] = useState<string | null>(null);

  // Il profilo si crea una volta sola: chi ce l'ha già torna in home.
  if (isLoading) {
    return (
      <View style={styles.centrato}>
        <ActivityIndicator />
      </View>
    );
  }
  if (profilo !== null) {
    return <Redirect href="/" />;
  }

  async function inviaForm() {
    const risultato = schema.safeParse({ nomeUtente });
    if (!risultato.success) {
      setErrore(risultato.error.issues[0].message);
      return;
    }

    setErrore(null);
    try {
      await crea.mutateAsync(risultato.data.nomeUtente);
      router.replace('/');
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Qualcosa è andato storto. Riprova.');
    }
  }

  return (
    <View style={styles.contenitore}>
      <Text style={styles.titolo}>Scegli il tuo nome utente</Text>
      <Text style={styles.sottotitolo}>
        È il nome con cui ti vedranno gli altri in ogni gruppo a cui parteciperai. Una volta
        scelto non potrai più cambiarlo, e nessun altro potrà usarlo.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Nome utente"
        autoCapitalize="none"
        autoCorrect={false}
        value={nomeUtente}
        onChangeText={setNomeUtente}
      />

      {errore !== null && <Text style={styles.errore}>{errore}</Text>}

      <Pressable style={styles.bottone} onPress={inviaForm} disabled={crea.isPending}>
        {crea.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.testoBottone}>Continua</Text>
        )}
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
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  titolo: {
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
  },
  sottotitolo: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  errore: {
    color: '#c0392b',
    textAlign: 'center',
  },
  bottone: {
    backgroundColor: '#2d6cdf',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  testoBottone: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
