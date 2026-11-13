import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

import { creaGruppo } from '@/api/gruppi';
import { BloccoDuro } from '@/components/BloccoDuro';
import { useInvalidaMieiGruppi } from '@/hooks/useMieiGruppi';
import { useGruppoAttivoStore } from '@/store/gruppoAttivoStore';
import { coloriNB as colori, pesiNB as pesi } from '@/theme/neoBrutalista';

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
  const insets = useSafeAreaInsets();
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<(typeof TIPI_GRUPPO)[number]['valore']>('casa');
  const [errore, setErrore] = useState<string | null>(null);
  const [inviando, setInviando] = useState(false);

  const invalidaMieiGruppi = useInvalidaMieiGruppi();
  const impostaGruppoAttivo = useGruppoAttivoStore((stato) => stato.impostaGruppoAttivo);

  function tornaIndietro() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/gruppi');
    }
  }

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
      router.replace('/gruppi');
    } catch {
      setErrore('Qualcosa è andato storto. Riprova.');
    } finally {
      setInviando(false);
    }
  }

  return (
    <View style={[styles.schermo, { paddingTop: insets.top + 16, paddingBottom: insets.bottom }]}>
      <View style={styles.rigaTitolo}>
        <Pressable onPress={tornaIndietro} hitSlop={8}>
          <BloccoDuro offset={2} colore={colori.panna} raggio={10} contenutoStyle={styles.quadrato}>
            <Feather name="arrow-left" size={17} color={colori.scuro} />
          </BloccoDuro>
        </Pressable>
        <Text style={styles.titolo}>Crea un gruppo</Text>
      </View>

      <View style={styles.contenuto}>
        <TextInput
          style={styles.input}
          placeholder="Nome del gruppo (es. Casa di Via Roma)"
          placeholderTextColor={colori.soft}
          value={nome}
          onChangeText={setNome}
        />

        <View style={styles.righeChip}>
          {TIPI_GRUPPO.map((opzione) => (
            <Pressable
              key={opzione.valore}
              style={[styles.chip, tipo === opzione.valore && styles.chipAttivo]}
              onPress={() => setTipo(opzione.valore)}
            >
              <Text style={styles.testoChip}>{opzione.etichetta}</Text>
            </Pressable>
          ))}
        </View>

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
            <Text style={styles.testoBottonePieno}>Crea</Text>
          )}
        </BloccoDuro>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  schermo: {
    flex: 1,
    backgroundColor: colori.crema,
    paddingHorizontal: 16,
  },
  rigaTitolo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginBottom: 18,
  },
  quadrato: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titolo: {
    ...pesi.extraBold,
    fontSize: 18,
    letterSpacing: -0.3,
    color: colori.scuro,
  },
  contenuto: {
    flex: 1,
    justifyContent: 'center',
    gap: 12,
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
  righeChip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    borderWidth: 2,
    borderColor: colori.scuro,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 7,
    backgroundColor: colori.panna,
  },
  chipAttivo: {
    backgroundColor: colori.viola,
  },
  testoChip: {
    ...pesi.extraBold,
    fontSize: 12.5,
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
});
