import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

import { entraInGruppo } from '@/api/membri';
import { BloccoDuro } from '@/components/BloccoDuro';
import { useInvalidaMieiGruppi } from '@/hooks/useMieiGruppi';
import { coloriNB as colori, pesiNB as pesi } from '@/theme/neoBrutalista';

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
  const insets = useSafeAreaInsets();
  const [codiceInvito, setCodiceInvito] = useState('');
  const [errore, setErrore] = useState<string | null>(null);
  const [inviando, setInviando] = useState(false);

  const invalidaMieiGruppi = useInvalidaMieiGruppi();

  function tornaIndietro() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/gruppi');
    }
  }

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
    <View style={[styles.schermo, { paddingTop: insets.top + 16, paddingBottom: insets.bottom }]}>
      <View style={styles.rigaTitolo}>
        <Pressable onPress={tornaIndietro} hitSlop={8}>
          <BloccoDuro offset={2} colore={colori.panna} raggio={10} contenutoStyle={styles.quadrato}>
            <Feather name="arrow-left" size={17} color={colori.scuro} />
          </BloccoDuro>
        </Pressable>
        <Text style={styles.titolo}>Unisciti a un gruppo</Text>
      </View>

      <View style={styles.contenuto}>
        <TextInput
          style={styles.input}
          placeholder="Codice invito"
          placeholderTextColor={colori.soft}
          autoCapitalize="none"
          value={codiceInvito}
          onChangeText={setCodiceInvito}
        />

        {errore !== null && <Text style={styles.testoErrore}>{errore}</Text>}

        <BloccoDuro
          style={inviando && styles.bottoneDisabilitato}
          offset={2.5}
          colore={colori.menta}
          raggio={12}
          contenutoStyle={styles.bottonePieno}
          onPress={inviando ? undefined : inviaForm}
        >
          {inviando ? (
            <ActivityIndicator color={colori.scuro} />
          ) : (
            <Text style={styles.testoBottonePieno}>Unisciti</Text>
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
    color: colori.scuro,
  },
});
