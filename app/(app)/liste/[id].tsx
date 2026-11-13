import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BloccoDuro } from '@/components/BloccoDuro';
import { PARETE } from '@/components/Vassoio';
import { VoceSpuntabile } from '@/components/VoceSpuntabile';
import { useGruppoAttivo } from '@/hooks/useGruppoAttivo';
import { useVociLista } from '@/hooks/useVociLista';
import { useAuthStore } from '@/store/authStore';
import { coloriNB as colori, pesiNB as pesi } from '@/theme/neoBrutalista';

export default function DettaglioLista() {
  const { id, nome, conPrezzi } = useLocalSearchParams<{
    id: string;
    nome?: string;
    conPrezzi?: string;
  }>();
  const { membri } = useGruppoAttivo();
  const utenteId = useAuthStore((stato) => stato.session?.user.id);
  const { voci, isLoading, aggiungi, aggiorna, elimina } = useVociLista(id ?? null);
  const insets = useSafeAreaInsets();
  const [nuovaVoce, setNuovaVoce] = useState('');
  const [nuovaNota, setNuovaNota] = useState('');

  const laListaHaPrezzi = conPrezzi === '1';
  const ilMioMembroId = membri.find((m) => m.utente_id === utenteId)?.id ?? null;

  function tornaIndietro() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/liste');
    }
  }

  function aggiungiVoceAllaLista() {
    const testo = nuovaVoce.trim();
    if (testo === '' || ilMioMembroId === null) {
      return;
    }
    aggiungi.mutate({
      testo,
      creatoDaMembroId: ilMioMembroId,
      note: nuovaNota.trim() === '' ? null : nuovaNota.trim(),
    });
    setNuovaVoce('');
    setNuovaNota('');
  }

  const daFare = voci.filter((v) => !v.fatto);
  const fatte = voci.filter((v) => v.fatto);
  const elencoOrdinato = [...daFare, ...fatte];

  return (
    <KeyboardAvoidingView style={styles.schermo} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
          <Text style={styles.titolo} numberOfLines={1}>
            {nome ?? 'Lista'}
          </Text>
        </View>

        <View style={styles.formAggiungi}>
          <View style={styles.rigaInput}>
            <TextInput
              style={styles.input}
              placeholder="Aggiungi una voce"
              placeholderTextColor={colori.soft}
              value={nuovaVoce}
              onChangeText={setNuovaVoce}
              onSubmitEditing={aggiungiVoceAllaLista}
              returnKeyType={laListaHaPrezzi ? 'next' : 'done'}
            />
            <BloccoDuro
              style={nuovaVoce.trim() === '' && styles.cellaAggiungiDisabilitata}
              offset={2.5}
              colore={colori.corallo}
              raggio={11}
              contenutoStyle={styles.bottoneAggiungi}
              onPress={nuovaVoce.trim() === '' ? undefined : aggiungiVoceAllaLista}
            >
              <Feather name="plus" size={20} color="#fff" />
            </BloccoDuro>
          </View>
          {laListaHaPrezzi && (
            <TextInput
              style={styles.inputNota}
              placeholder="Note (opzionale)"
              placeholderTextColor={colori.soft}
              value={nuovaNota}
              onChangeText={setNuovaNota}
              onSubmitEditing={aggiungiVoceAllaLista}
              returnKeyType="done"
            />
          )}
          {voci.length >= 3 && (
            <BloccoDuro
              offset={2.5}
              colore={colori.oro}
              raggio={11}
              contenutoStyle={styles.bottoneSfida}
              onPress={() => router.push({ pathname: '/sfide/nuova', params: { listaId: id } })}
            >
              <Feather name="award" size={14} color={colori.scuro} />
              <Text style={styles.testoBottoneSfida}>Inizia sfida</Text>
            </BloccoDuro>
          )}
        </View>

        {isLoading ? (
          <ActivityIndicator color={colori.scuro} style={styles.caricamento} />
        ) : elencoOrdinato.length === 0 ? (
          <Text style={styles.vuoto}>Nessuna voce in questa lista.</Text>
        ) : (
          <BloccoDuro offset={4} colore={colori.scuro} raggio={16} contenutoStyle={styles.elenco}>
            <View style={styles.righe}>
              {elencoOrdinato.map((voce) => {
                const bloccata = voce.fatto && laListaHaPrezzi;
                return (
                  <VoceSpuntabile
                    key={voce.id}
                    testo={voce.testo}
                    fatto={voce.fatto}
                    nota={voce.note}
                    bloccata={bloccata}
                    acquirente={
                      voce.fatto && laListaHaPrezzi
                        ? { nome: null, prezzoCentesimi: voce.prezzo_centesimi }
                        : null
                    }
                    onTocca={() => {
                      if (!voce.fatto && laListaHaPrezzi) {
                        // Segnare fatta una voce di una lista "con prezzi" apre il
                        // form per registrare la spesa (o saltarlo).
                        router.push({
                          pathname: '/spese/nuova',
                          params: {
                            voceListaId: voce.id,
                            listaId: id,
                            nomeVoce: voce.testo,
                            notaEsistente: voce.note ?? undefined,
                          },
                        });
                      } else {
                        if (!voce.fatto) {
                          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }
                        aggiorna.mutate({ id: voce.id, fatto: !voce.fatto });
                      }
                    }}
                    onApriModifica={() =>
                      router.push({
                        pathname: '/voci/[id]',
                        params: { id: voce.id, listaId: id as string },
                      })
                    }
                    onElimina={() => elimina.mutate(voce.id)}
                  />
                );
              })}
            </View>
          </BloccoDuro>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  schermo: {
    flex: 1,
    backgroundColor: colori.crema,
  },
  contenuto: {
    paddingHorizontal: 16,
    gap: 16,
  },
  rigaTitolo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
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
    flexShrink: 1,
  },
  formAggiungi: {
    gap: 8,
  },
  rigaInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 2,
    borderColor: colori.scuro,
    borderRadius: 11,
    backgroundColor: colori.panna,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: '700',
    color: colori.scuro,
  },
  inputNota: {
    borderWidth: 2,
    borderColor: colori.scuro,
    borderRadius: 11,
    backgroundColor: colori.panna,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: colori.scuro,
  },
  cellaAggiungiDisabilitata: {
    opacity: 0.4,
  },
  bottoneAggiungi: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottoneSfida: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 10,
  },
  testoBottoneSfida: {
    ...pesi.extraBold,
    fontSize: 10.5,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: colori.scuro,
  },
  caricamento: {
    marginTop: 24,
  },
  vuoto: {
    ...pesi.bold,
    fontSize: 13,
    color: colori.soft,
    textAlign: 'center',
    marginTop: 24,
  },
  elenco: {
    borderRadius: 16 - 2.5,
    overflow: 'hidden',
    backgroundColor: colori.scuro,
  },
  righe: {
    gap: PARETE,
    backgroundColor: colori.scuro,
  },
});
