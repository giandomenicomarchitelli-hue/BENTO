import { Redirect, Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { VoceLista } from '@/api/vociLista';
import { ModificaAcquisto } from '@/components/ModificaAcquisto';
import { ModificaVoceDaFare } from '@/components/ModificaVoceDaFare';
import { useVociLista } from '@/hooks/useVociLista';
import { confermaAzione } from '@/lib/conferma';

export default function ModificaVoce() {
  const { id, listaId } = useLocalSearchParams<{ id: string; listaId?: string }>();
  const { voci, isLoading, aggiorna, elimina } = useVociLista(listaId ?? null);
  const [annullando, setAnnullando] = useState(false);

  if (listaId === undefined) {
    return <Redirect href="/gruppi" />;
  }

  const voce = voci.find((v) => v.id === id);

  if (isLoading || voce === undefined) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
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
    <>
      <Stack.Screen options={{ title: voce.testo }} />

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

      <Pressable onPress={() => confermaEliminaVoce(voce)} hitSlop={8} style={styles.eliminaContenitore}>
        <Text style={styles.elimina}>Elimina voce</Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  eliminaContenitore: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  elimina: {
    color: '#c0392b',
    fontSize: 14,
    fontWeight: '600',
  },
});
