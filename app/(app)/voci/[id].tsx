import { Feather } from '@expo/vector-icons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { VoceLista } from '@/api/vociLista';
import { BloccoDuro } from '@/components/BloccoDuro';
import { ModificaAcquisto } from '@/components/ModificaAcquisto';
import { ModificaVoceDaFare } from '@/components/ModificaVoceDaFare';
import { useVociLista } from '@/hooks/useVociLista';
import { confermaAzione } from '@/lib/conferma';
import { coloriNB as colori, pesiNB as pesi } from '@/theme/neoBrutalista';

export default function ModificaVoce() {
  const { id, listaId } = useLocalSearchParams<{ id: string; listaId?: string }>();
  const { voci, isLoading, aggiorna, elimina } = useVociLista(listaId ?? null);
  const insets = useSafeAreaInsets();
  const [annullando, setAnnullando] = useState(false);

  if (listaId === undefined) {
    return <Redirect href="/gruppi" />;
  }

  const voce = voci.find((v) => v.id === id);

  function tornaIndietro() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace({ pathname: '/liste/[id]', params: { id: listaId } });
    }
  }

  if (isLoading || voce === undefined) {
    return (
      <View style={[styles.schermo, styles.centrato]}>
        <ActivityIndicator color={colori.scuro} />
      </View>
    );
  }

  async function confermaEliminaVoce(voceCorrente: VoceLista) {
    const conferma = await confermaAzione(
      `Eliminare "${voceCorrente.testo}"?`,
      'La voce verrà rimossa dalla lista.',
      'Elimina'
    );
    if (conferma) {
      elimina.mutate(voceCorrente.id, { onSuccess: () => router.back() });
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
            {voce.testo}
          </Text>
        </View>

        <BloccoDuro offset={3} colore={colori.panna} raggio={16}>
          {voce.fatto ? (
            <ModificaAcquisto
              nome={voce.testo}
              prezzoCentesimi={voce.prezzo_centesimi}
              note={voce.note}
              salvando={aggiorna.isPending}
              annullando={annullando}
              onSalva={(prezzoCentesimi, note) => {
                aggiorna.mutate({ id: voce.id, prezzoCentesimi, note });
              }}
              onAnnullaAcquisto={() => {
                setAnnullando(true);
                aggiorna.mutate(
                  { id: voce.id, fatto: false, prezzoCentesimi: null, note: null },
                  {
                    onSettled: () => setAnnullando(false),
                    onSuccess: () => router.back(),
                  }
                );
              }}
            />
          ) : (
            <ModificaVoceDaFare
              testo={voce.testo}
              note={voce.note}
              salvando={aggiorna.isPending}
              onSalva={(testo, note) => {
                aggiorna.mutate(
                  { id: voce.id, testo, note },
                  { onSuccess: () => router.back() }
                );
              }}
            />
          )}
        </BloccoDuro>

        <Pressable onPress={() => confermaEliminaVoce(voce)} hitSlop={8} style={styles.eliminaContenitore}>
          <Text style={styles.elimina}>Elimina voce</Text>
        </Pressable>
      </ScrollView>
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
  eliminaContenitore: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  elimina: {
    ...pesi.extraBold,
    fontSize: 12.5,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: colori.corallo,
  },
});
