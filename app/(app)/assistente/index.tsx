import { Feather } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BloccoDuro } from '@/components/BloccoDuro';
import { ConfermaAzioni } from '@/components/ConfermaAzioni';
import { useGruppoAttivo } from '@/hooks/useGruppoAttivo';
import { useInterpretazione } from '@/hooks/useInterpretazione';
import { useGruppoAttivoStore } from '@/store/gruppoAttivoStore';
import { coloriNB as colori, pesiNB as pesi } from '@/theme/neoBrutalista';

function messaggioErrore(errore: unknown): string {
  if (errore instanceof Error && errore.message.trim() !== '') {
    return errore.message;
  }
  return 'Qualcosa è andato storto. Riprova.';
}

export default function Assistente() {
  const gruppoAttivoId = useGruppoAttivoStore((stato) => stato.gruppoAttivoId);
  if (gruppoAttivoId === null) {
    return <Redirect href="/gruppi" />;
  }
  return <AssistenteDelGruppo gruppoAttivoId={gruppoAttivoId} />;
}

function AssistenteDelGruppo({ gruppoAttivoId }: { gruppoAttivoId: string }) {
  const insets = useSafeAreaInsets();
  const { membriAttivi } = useGruppoAttivo();
  const { interpreta, conferma } = useInterpretazione(gruppoAttivoId);
  const [testo, setTesto] = useState('');
  const [risposta, setRisposta] = useState('');

  function inviaRisposta() {
    const testoCombinato = `${testo} ${risposta}`.trim();
    setTesto(testoCombinato);
    setRisposta('');
    interpreta.mutate(testoCombinato);
  }

  function tornaIndietro() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }

  const inviaDisabilitato = interpreta.isPending || testo.trim() === '';
  const inviaRispostaDisabilitato = interpreta.isPending || risposta.trim() === '';

  return (
    <View style={styles.schermo}>
      <ScrollView
        contentContainerStyle={[
          styles.contenuto,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
        ]}
      >
        <View style={styles.rigaTitolo}>
          <Pressable onPress={tornaIndietro} hitSlop={8}>
            <BloccoDuro offset={2} colore={colori.panna} raggio={10} contenutoStyle={styles.quadrato}>
              <Feather name="arrow-left" size={17} color={colori.scuro} />
            </BloccoDuro>
          </Pressable>
          <Text style={styles.titolo}>Scrivi</Text>
        </View>

        <Text style={styles.sottotitolo}>
          Racconta cosa è successo, l&apos;assistente capisce cosa fare.
        </Text>

        <TextInput
          style={styles.input}
          value={testo}
          onChangeText={setTesto}
          placeholder="Es. «ho comprato il sale e ho speso 4 euro»"
          placeholderTextColor={colori.soft}
          multiline
        />

        <BloccoDuro
          style={inviaDisabilitato && styles.bottoneDisabilitato}
          offset={2.5}
          colore={colori.oro}
          raggio={12}
          contenutoStyle={styles.bottonePieno}
          onPress={inviaDisabilitato ? undefined : () => interpreta.mutate(testo)}
        >
          {interpreta.isPending ? (
            <ActivityIndicator color={colori.scuro} />
          ) : (
            <Text style={styles.testoBottonePieno}>Invia</Text>
          )}
        </BloccoDuro>

        {interpreta.error !== null && (
          <Text style={styles.testoErrore}>{messaggioErrore(interpreta.error)}</Text>
        )}

        {interpreta.data !== undefined &&
          (interpreta.data.ambiguo ? (
            <View style={styles.sezioneChiarimento}>
              <Text style={styles.testoChiarimento}>
                {interpreta.data.domanda_chiarimento ?? 'Non ho capito bene, puoi riscriverla?'}
              </Text>
              <TextInput
                style={styles.input}
                value={risposta}
                onChangeText={setRisposta}
                placeholder="Rispondi qui"
                placeholderTextColor={colori.soft}
                multiline
              />
              <BloccoDuro
                style={inviaRispostaDisabilitato && styles.bottoneDisabilitato}
                offset={2.5}
                colore={colori.oro}
                raggio={12}
                contenutoStyle={styles.bottonePieno}
                onPress={inviaRispostaDisabilitato ? undefined : inviaRisposta}
              >
                {interpreta.isPending ? (
                  <ActivityIndicator color={colori.scuro} />
                ) : (
                  <Text style={styles.testoBottonePieno}>Invia risposta</Text>
                )}
              </BloccoDuro>
            </View>
          ) : (
            <View style={styles.sezioneConferma}>
              <ConfermaAzioni
                key={interpreta.submittedAt}
                azioni={interpreta.data.azioni}
                membri={membriAttivi}
                confermando={conferma.isPending}
                onConferma={(azioniRisolte) =>
                  conferma.mutate(azioniRisolte, {
                    onSuccess: () => {
                      setTesto('');
                      setRisposta('');
                      interpreta.reset();
                    },
                  })
                }
              />
            </View>
          ))}

        {conferma.error !== null && (
          <Text style={styles.testoErrore}>{messaggioErrore(conferma.error)}</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  schermo: {
    flex: 1,
    backgroundColor: colori.crema,
  },
  contenuto: {
    paddingHorizontal: 16,
    gap: 12,
  },
  rigaTitolo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginBottom: 6,
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
  sottotitolo: {
    ...pesi.bold,
    fontSize: 13,
    color: colori.soft,
  },
  input: {
    minHeight: 96,
    backgroundColor: colori.panna,
    borderWidth: 2,
    borderColor: colori.scuro,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...pesi.semiBold,
    fontSize: 15,
    color: colori.scuro,
    textAlignVertical: 'top',
  },
  bottoneDisabilitato: {
    opacity: 0.5,
  },
  bottonePieno: {
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testoBottonePieno: {
    ...pesi.extraBold,
    fontSize: 12,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: colori.scuro,
  },
  testoErrore: {
    ...pesi.bold,
    fontSize: 12.5,
    color: colori.corallo,
    textAlign: 'center',
  },
  sezioneChiarimento: {
    gap: 12,
  },
  testoChiarimento: {
    ...pesi.bold,
    fontSize: 14,
    color: colori.scuro,
  },
  sezioneConferma: {
    marginTop: 4,
  },
});
