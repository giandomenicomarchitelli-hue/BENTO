import { Redirect, Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { ArticoloSpesa } from '@/api/articoliSpesa';
import { ModificaAcquisto } from '@/components/ModificaAcquisto';
import { ModificaArticoloDaComprare } from '@/components/ModificaArticoloDaComprare';
import { useArticoliSpesa } from '@/hooks/useArticoliSpesa';
import { useGruppoAttivoStore } from '@/store/gruppoAttivoStore';
import { confermaAzione } from '@/lib/conferma';

export default function ModificaArticolo() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const gruppoAttivoId = useGruppoAttivoStore((stato) => stato.gruppoAttivoId);
  const { articoli, isLoading, aggiorna, elimina } = useArticoliSpesa(gruppoAttivoId);
  const [annullando, setAnnullando] = useState(false);

  if (gruppoAttivoId === null) {
    return <Redirect href="/gruppi" />;
  }

  const articolo = articoli.find((a) => a.id === id);

  if (isLoading || articolo === undefined) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  async function confermaEliminaArticolo(articoloCorrente: ArticoloSpesa) {
    const conferma = await confermaAzione(
      `Eliminare "${articoloCorrente.nome}"?`,
      'L’articolo verrà rimosso dalla lista della spesa.',
      'Elimina'
    );
    if (conferma) {
      elimina.mutate(articoloCorrente.id, { onSuccess: () => router.back() });
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: articolo.nome }} />

      {articolo.stato === 'comprato' ? (
        <ModificaAcquisto
          nome={articolo.nome}
          prezzoCentesimi={articolo.prezzo_centesimi}
          note={articolo.note}
          salvando={aggiorna.isPending}
          annullando={annullando}
          onSalva={(prezzoCentesimi, note) => {
            aggiorna.mutate({ id: articolo.id, prezzoCentesimi, note });
          }}
          onAnnullaAcquisto={() => {
            setAnnullando(true);
            aggiorna.mutate(
              {
                id: articolo.id,
                stato: 'da_comprare',
                compratoDa: null,
                prezzoCentesimi: null,
                note: null,
              },
              {
                onSettled: () => setAnnullando(false),
                onSuccess: () => router.back(),
              }
            );
          }}
        />
      ) : (
        <ModificaArticoloDaComprare
          nome={articolo.nome}
          note={articolo.note}
          salvando={aggiorna.isPending}
          onSalva={(nome, note) => {
            aggiorna.mutate(
              { id: articolo.id, nome, note },
              { onSuccess: () => router.back() }
            );
          }}
        />
      )}

      <Pressable onPress={() => confermaEliminaArticolo(articolo)} hitSlop={8} style={styles.eliminaContenitore}>
        <Text style={styles.elimina}>Elimina articolo</Text>
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
