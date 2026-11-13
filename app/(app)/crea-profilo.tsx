import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

import { BloccoDuro } from '@/components/BloccoDuro';
import { useProfilo } from '@/hooks/useProfilo';
import { coloriNB as colori, pesiNB as pesi } from '@/theme/neoBrutalista';

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
  const insets = useSafeAreaInsets();
  const [nomeUtente, setNomeUtente] = useState('');
  const [errore, setErrore] = useState<string | null>(null);

  // Il profilo si crea una volta sola: chi ce l'ha già torna in home.
  if (isLoading) {
    return (
      <View style={[styles.schermo, styles.centrato]}>
        <ActivityIndicator color={colori.scuro} />
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
    <View style={[styles.schermo, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.contenuto}>
        <Text style={styles.titolo}>Scegli il tuo nome utente</Text>
        <Text style={styles.sottotitolo}>
          È il nome con cui ti vedranno gli altri in ogni gruppo a cui parteciperai. Una volta
          scelto non potrai più cambiarlo, e nessun altro potrà usarlo.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Nome utente"
          placeholderTextColor={colori.soft}
          autoCapitalize="none"
          autoCorrect={false}
          value={nomeUtente}
          onChangeText={setNomeUtente}
        />

        {errore !== null && <Text style={styles.testoErrore}>{errore}</Text>}

        <BloccoDuro
          style={crea.isPending && styles.bottoneDisabilitato}
          offset={2.5}
          colore={colori.corallo}
          raggio={12}
          contenutoStyle={styles.bottonePieno}
          onPress={crea.isPending ? undefined : inviaForm}
        >
          {crea.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.testoBottonePieno}>Continua</Text>
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
  },
  centrato: {
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
});
