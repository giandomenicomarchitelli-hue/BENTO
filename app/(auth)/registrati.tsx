import { Link } from 'expo-router';
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

import { registrati } from '@/api/auth';

const schema = z
  .object({
    email: z.string().trim().email('Email non valida'),
    password: z.string().min(6, 'La password deve avere almeno 6 caratteri'),
    confermaPassword: z.string(),
  })
  .refine((dati) => dati.password === dati.confermaPassword, {
    message: 'Le password non coincidono',
    path: ['confermaPassword'],
  });

function messaggioErrore(errore: unknown): string {
  if (errore instanceof Error && errore.message.includes('already registered')) {
    return 'Esiste già un account con questa email.';
  }
  return 'Qualcosa è andato storto. Riprova.';
}

export default function Registrati() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confermaPassword, setConfermaPassword] = useState('');
  const [errore, setErrore] = useState<string | null>(null);
  const [inviando, setInviando] = useState(false);
  const [richiedeConferma, setRichiedeConferma] = useState(false);

  async function inviaForm() {
    const risultato = schema.safeParse({ email, password, confermaPassword });
    if (!risultato.success) {
      setErrore(risultato.error.issues[0].message);
      return;
    }

    setErrore(null);
    setInviando(true);
    try {
      const sessioneCreata = await registrati(risultato.data.email, risultato.data.password);
      if (!sessioneCreata) {
        setRichiedeConferma(true);
      }
    } catch (e) {
      setErrore(messaggioErrore(e));
    } finally {
      setInviando(false);
    }
  }

  if (richiedeConferma) {
    return (
      <View style={styles.contenitore}>
        <Text style={styles.titolo}>Controlla la tua email</Text>
        <Text style={styles.sottotitolo}>
          Ti abbiamo inviato un link di conferma a {email}. Confermalo per poter accedere.
        </Text>
        <Link href="/(auth)/accedi" style={styles.link}>
          Torna al login
        </Link>
      </View>
    );
  }

  return (
    <View style={styles.contenitore}>
      <Text style={styles.titolo}>Crea un account</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        textContentType="emailAddress"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        textContentType="newPassword"
        value={password}
        onChangeText={setPassword}
      />
      <TextInput
        style={styles.input}
        placeholder="Conferma password"
        secureTextEntry
        textContentType="newPassword"
        value={confermaPassword}
        onChangeText={setConfermaPassword}
      />

      {errore !== null && <Text style={styles.errore}>{errore}</Text>}

      <Pressable style={styles.bottone} onPress={inviaForm} disabled={inviando}>
        {inviando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.testoBottone}>Crea account</Text>
        )}
      </Pressable>

      <Link href="/(auth)/accedi" style={styles.link}>
        Hai già un account? Accedi
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  contenitore: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  titolo: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  sottotitolo: {
    fontSize: 15,
    textAlign: 'center',
    color: '#555',
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
  link: {
    textAlign: 'center',
    marginTop: 12,
    color: '#2d6cdf',
  },
});
