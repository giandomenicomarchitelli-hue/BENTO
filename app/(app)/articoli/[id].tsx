import { Feather } from '@expo/vector-icons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ArticoloSpesa } from '@/api/articoliSpesa';
import { BloccoDuro } from '@/components/BloccoDuro';
import { ModificaAcquisto } from '@/components/ModificaAcquisto';
import { ModificaArticoloDaComprare } from '@/components/ModificaArticoloDaComprare';
import { useArticoliSpesa } from '@/hooks/useArticoliSpesa';
import { useGruppoAttivoStore } from '@/store/gruppoAttivoStore';
import { confermaAzione } from '@/lib/conferma';
import { coloriNB as colori, pesiNB as pesi } from '@/theme/neoBrutalista';

export default function ModificaArticolo() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const gruppoAttivoId = useGruppoAttivoStore((stato) => stato.gruppoAttivoId);
  const { articoli, isLoading, aggiorna, elimina } = useArticoliSpesa(gruppoAttivoId);
  const insets = useSafeAreaInsets();
  const [annullando, setAnnullando] = useState(false);

  if (gruppoAttivoId === null) {
    return <Redirect href="/gruppi" />;
  }

  const articolo = articoli.find((a) => a.id === id);

  function tornaIndietro() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/lista-spesa');
    }
  }

  if (isLoading || articolo === undefined) {
    return (
      <View style={[styles.schermo, styles.centrato]}>
        <ActivityIndicator color={colori.scuro} />
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
            {articolo.nome}
          </Text>
        </View>

        <BloccoDuro offset={3} colore={colori.panna} raggio={16}>
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
        </BloccoDuro>

        <Pressable onPress={() => confermaEliminaArticolo(articolo)} hitSlop={8} style={styles.eliminaContenitore}>
          <Text style={styles.elimina}>Elimina articolo</Text>
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
