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

import { creaGruppo } from '@/api/gruppi';
import { useInvalidaMieiGruppi } from '@/hooks/useMieiGruppi';
import { useGruppoAttivoStore } from '@/store/gruppoAttivoStore';

const TIPI_GRUPPO = [
  { valore: 'casa' as const, etichetta: 'Casa' },
  { valore: 'viaggio' as const, etichetta: 'Viaggio' },
  { valore: 'ufficio' as const, etichetta: 'Ufficio' },
  { valore: 'altro' as const, etichetta: 'Altro' },
];

const schema = z.object({
  nome: z.string().trim().min(1, 'Dai un nome al gruppo'),
});

export default function CreaGruppo() {
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<(typeof TIPI_GRUPPO)[number]['valore']>('casa');
  const [errore, setErrore] = useState<string | null>(null);
  const [inviando, setInviando] = useState(false);

  const invalidaMieiGruppi = useInvalidaMieiGruppi();
  const impostaGruppoAttivo = useGruppoAttivoStore((stato) => stato.impostaGruppoAttivo);

  async function inviaForm() {
    const risultato = schema.safeParse({ nome });
    if (!risultato.success) {
      setErrore(risultato.error.issues[0].message);
      return;
    }

    setErrore(null);
    setInviando(true);
    try {
      const gruppo = await creaGruppo({ nome: risultato.data.nome, tipo });
      impostaGruppoAttivo(gruppo.id);
      await invalidaMieiGruppi();
      router.replace('/');
    } catch {
      setErrore('Qualcosa è andato storto. Riprova.');
    } finally {
      setInviando(false);
    }
  }

  return (
    <View style={styles.contenitore}>
      <Text style={styles.titolo}>Crea un gruppo</Text>

      <TextInput
        style={styles.input}
        placeholder="Nome del gruppo (es. Casa di Via Roma)"
        value={nome}
        onChangeText={setNome}
      />

      <View style={styles.righeTipo}>
        {TIPI_GRUPPO.map((opzione) => (
          <Pressable
            key={opzione.valore}
            style={[styles.chip, tipo === opzione.valore && styles.chipSelezionato]}
            onPress={() => setTipo(opzione.valore)}
          >
            <Text
              style={[
                styles.testoChip,
                tipo === opzione.valore && styles.testoChipSelezionato,
              ]}
            >
              {opzione.etichetta}
            </Text>
          </Pressable>
        ))}
      </View>

      {errore !== null && <Text style={styles.errore}>{errore}</Text>}

      <Pressable style={styles.bottone} onPress={inviaForm} disabled={inviando}>
        {inviando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.testoBottone}>Crea</Text>
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
  righeTipo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipSelezionato: {
    backgroundColor: '#2d6cdf',
    borderColor: '#2d6cdf',
  },
  testoChip: {
    fontSize: 14,
    color: '#333',
  },
  testoChipSelezionato: {
    color: '#fff',
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
