import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

import { accedi } from '@/api/auth';
import { BloccoDuro } from '@/components/BloccoDuro';
import { MarchioBento } from '@/components/MarchioBento';
import { coloriNB as colori, pesiNB as pesi } from '@/theme/neoBrutalista';

const schema = z.object({
  email: z.string().trim().email('Email non valida'),
  password: z.string().min(6, 'La password deve avere almeno 6 caratteri'),
});

function messaggioErrore(errore: unknown): string {
  if (errore instanceof Error && errore.message.includes('Invalid login credentials')) {
    return 'Email o password non corrette.';
  }
  return 'Qualcosa è andato storto. Riprova.';
}

export default function Accedi() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errore, setErrore] = useState<string | null>(null);
  const [inviando, setInviando] = useState(false);

  async function inviaForm() {
    const risultato = schema.safeParse({ email, password });
    if (!risultato.success) {
      setErrore(risultato.error.issues[0].message);
      return;
    }

    setErrore(null);
    setInviando(true);
    try {
      await accedi(risultato.data.email, risultato.data.password);
    } catch (e) {
      setErrore(messaggioErrore(e));
    } finally {
      setInviando(false);
    }
  }

  return (
    <View style={[styles.schermo, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.contenuto}>
        <View style={styles.marchioRiga}>
          <MarchioBento />
          <Text style={styles.marchio}>
            BENTO<Text style={styles.puntoMarchio}>.</Text>
          </Text>
        </View>

        <Text style={styles.titolo}>Bentornato</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colori.soft}
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colori.soft}
          secureTextEntry
          textContentType="password"
          value={password}
          onChangeText={setPassword}
        />

        {errore !== null && <Text style={styles.testoErrore}>{errore}</Text>}

        <BloccoDuro
          style={inviando && styles.bottoneDisabilitato}
          offset={2.5}
          colore={colori.corallo}
          raggio={12}
          contenutoStyle={styles.bottonePieno}
          onPress={inviando ? undefined : inviaForm}
        >
          {inviando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.testoBottonePieno}>Accedi</Text>
          )}
        </BloccoDuro>

        <Link href="/(auth)/registrati" style={styles.link}>
          Non hai un account? Registrati
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  schermo: {
    flex: 1,
    backgroundColor: colori.crema,
  },
  contenuto: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  marchioRiga: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  marchio: {
    ...pesi.extraBold,
    fontSize: 25,
    letterSpacing: -0.5,
    color: colori.scuro,
  },
  puntoMarchio: {
    color: colori.corallo,
  },
  titolo: {
    ...pesi.extraBold,
    fontSize: 22,
    letterSpacing: -0.4,
    textAlign: 'center',
    color: colori.scuro,
    marginBottom: 8,
  },
  input: {
    borderWidth: 2,
    borderColor: colori.scuro,
    borderRadius: 11,
    backgroundColor: colori.panna,
    paddingHorizontal: 13,
    paddingVertical: 12,
    ...pesi.semiBold,
    fontSize: 15,
    color: colori.scuro,
  },
  testoErrore: {
    ...pesi.bold,
    fontSize: 12.5,
    color: colori.corallo,
    textAlign: 'center',
  },
  bottoneDisabilitato: {
    opacity: 0.5,
  },
  bottonePieno: {
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  testoBottonePieno: {
    ...pesi.extraBold,
    fontSize: 12,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: '#fff',
  },
  link: {
    textAlign: 'center',
    marginTop: 12,
    ...pesi.bold,
    fontSize: 13,
    color: colori.viola,
  },
});
