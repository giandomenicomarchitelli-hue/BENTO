import { Feather } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

import { registrati } from '@/api/auth';
import { BloccoDuro } from '@/components/BloccoDuro';
import { coloriNB as colori, pesiNB as pesi } from '@/theme/neoBrutalista';

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

function tornaIndietro() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/accedi');
  }
}

export default function Registrati() {
  const insets = useSafeAreaInsets();
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
      <View style={[styles.schermo, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.contenuto}>
          <Text style={styles.titolo}>Controlla la tua email</Text>
          <Text style={styles.sottotitolo}>
            Ti abbiamo inviato un link di conferma a {email}. Confermalo per poter accedere.
          </Text>
          <Link href="/(auth)/accedi" style={styles.link}>
            Torna al login
          </Link>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.schermo, { paddingTop: insets.top + 16, paddingBottom: insets.bottom }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.rigaTitolo}>
        <Pressable onPress={tornaIndietro} hitSlop={8}>
          <BloccoDuro offset={2} colore={colori.panna} raggio={10} contenutoStyle={styles.quadrato}>
            <Feather name="arrow-left" size={17} color={colori.scuro} />
          </BloccoDuro>
        </Pressable>
      </View>

      <View style={styles.contenuto}>
        <Text style={styles.titolo}>Crea un account</Text>

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
          textContentType="newPassword"
          value={password}
          onChangeText={setPassword}
        />
        <TextInput
          style={styles.input}
          placeholder="Conferma password"
          placeholderTextColor={colori.soft}
          secureTextEntry
          textContentType="newPassword"
          value={confermaPassword}
          onChangeText={setConfermaPassword}
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
            <Text style={styles.testoBottonePieno}>Crea account</Text>
          )}
        </BloccoDuro>

        <Link href="/(auth)/accedi" style={styles.link}>
          Hai già un account? Accedi
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  schermo: {
    flex: 1,
    backgroundColor: colori.crema,
  },
  rigaTitolo: {
    alignItems: 'flex-start',
    paddingHorizontal: 16,
  },
  quadrato: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contenuto: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  titolo: {
    ...pesi.extraBold,
    fontSize: 22,
    letterSpacing: -0.4,
    textAlign: 'center',
    color: colori.scuro,
    marginBottom: 8,
  },
  sottotitolo: {
    ...pesi.semiBold,
    fontSize: 14,
    color: colori.soft,
    textAlign: 'center',
    marginBottom: 12,
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
