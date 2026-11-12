import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { VoceListaPersonale } from '@/api/vociListaPersonali';
import { BloccoDuro } from '@/components/BloccoDuro';
import { PARETE } from '@/components/Vassoio';
import { VoceSpuntabile } from '@/components/VoceSpuntabile';
import { useVociListaPersonali } from '@/hooks/useVociListaPersonali';
import { confermaAzione } from '@/lib/conferma';
import { coloriNB as colori, pesiNB as pesi } from '@/theme/neoBrutalista';

export default function DettaglioListaPersonale() {
  const { id, nome } = useLocalSearchParams<{ id: string; nome?: string }>();
  const { voci, isLoading, aggiungi, aggiorna, elimina } = useVociListaPersonali(id ?? null);
  const insets = useSafeAreaInsets();
  const [nuovaVoce, setNuovaVoce] = useState('');

  function aggiungiVoce() {
    const testo = nuovaVoce.trim();
    if (testo === '') {
      return;
    }
    aggiungi.mutate({ testo });
    setNuovaVoce('');
  }

  async function confermaEliminaVoce(voce: VoceListaPersonale) {
    const conferma = await confermaAzione(
      `Eliminare "${voce.testo}"?`,
      'La voce verrà rimossa dalla lista.',
      'Elimina'
    );
    if (conferma) {
      elimina.mutate(voce.id);
    }
  }

  function tornaIndietro() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/personale/liste');
    }
  }

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
          <Text style={styles.titolo} numberOfLines={1}>
            {nome ?? 'Lista'}
          </Text>
        </View>

        <View style={styles.rigaInput}>
          <TextInput
            style={styles.input}
            placeholder="Aggiungi una voce"
            placeholderTextColor={colori.soft}
            value={nuovaVoce}
            onChangeText={setNuovaVoce}
            onSubmitEditing={aggiungiVoce}
            returnKeyType="done"
          />
          <BloccoDuro
            style={nuovaVoce.trim() === '' && styles.cellaAggiungiDisabilitata}
            offset={2.5}
            colore={colori.corallo}
            raggio={11}
            contenutoStyle={styles.bottoneAggiungi}
            onPress={nuovaVoce.trim() === '' ? undefined : aggiungiVoce}
          >
            <Feather name="plus" size={20} color="#fff" />
          </BloccoDuro>
        </View>

        {isLoading ? (
          <ActivityIndicator color={colori.scuro} style={styles.caricamento} />
        ) : voci.length === 0 ? (
          <Text style={styles.vuoto}>Nessuna voce in questa lista.</Text>
        ) : (
          <BloccoDuro offset={4} colore={colori.scuro} raggio={16} contenutoStyle={styles.elenco}>
            <View style={styles.righe}>
              {voci.map((voce) => (
                <VoceSpuntabile
                  key={voce.id}
                  testo={voce.testo}
                  fatto={voce.fatto}
                  onTocca={() => {
                    if (!voce.fatto) {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    aggiorna.mutate({ id: voce.id, fatto: !voce.fatto });
                  }}
                  onApriModifica={() => confermaEliminaVoce(voce)}
                  onElimina={() => elimina.mutate(voce.id)}
                />
              ))}
            </View>
          </BloccoDuro>
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
  cellaAggiungiDisabilitata: {
    opacity: 0.4,
  },
  bottoneAggiungi: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caricamento: {
    marginTop: 24,
  },
  vuoto: {
    fontSize: 13,
    fontWeight: '700',
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
