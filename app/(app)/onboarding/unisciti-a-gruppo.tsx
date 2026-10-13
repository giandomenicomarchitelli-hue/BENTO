import { router } from 'expo-router';
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

import { entraInGruppo } from '@/api/membri';
import { useInvalidaMieiGruppi } from '@/hooks/useMieiGruppi';

const schema = z.object({
  codiceInvito: z.string().trim().min(1, 'Inserisci il codice invito'),
});

function messaggioErrore(errore: unknown): string {
  if (errore instanceof Error && errore.message.includes('Codice invito non valido')) {
    return 'Codice invito non valido.';
  }
  return 'Qualcosa è andato storto. Riprova.';
}

export default function UniscitiAGruppo() {
  const [codiceInvito, setCodiceInvito] = useState('');
  const [errore, setErrore] = useState<string | null>(null);
  const [inviando, setInviando] = useState(false);

  const invalidaMieiGruppi = useInvalidaMieiGruppi();

  async function inviaForm() {
    const risultato = schema.safeParse({ codiceInvito });
    if (!risultato.success) {
      setErrore(risultato.error.issues[0].message);
      return;
    }

    setErrore(null);
    setInviando(true);
    try {
      await entraInGruppo(risultato.data.codiceInvito);
      await invalidaMieiGruppi();
      router.replace('/gruppi');
    } catch (e) {
      setErrore(messaggioErrore(e));
    } finally {
      setInviando(false);
    }
  }

  return (
    <View style={styles.contenitore}>
      <Text style={styles.titolo}>Unisciti a un gruppo</Text>

      <TextInput
        style={styles.input}
        placeholder="Codice invito"
        autoCapitalize="none"
        value={codiceInvito}
        onChangeText={setCodiceInvito}
      />

      {errore !== null && <Text style={styles.errore}>{errore}</Text>}

      <Pressable style={styles.bottone} onPress={inviaForm} disabled={inviando}>
        {inviando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.testoBottone}>Unisciti</Text>
        )}
      </Pressable>
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
