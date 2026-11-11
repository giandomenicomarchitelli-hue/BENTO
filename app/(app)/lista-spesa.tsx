import { Feather } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ArticoloSpesa } from '@/api/articoliSpesa';
import { Baran } from '@/components/Baran';
import { BloccoDuro } from '@/components/BloccoDuro';
import { ShoppingListAddForm } from '@/components/ShoppingListAddForm';
import { ShoppingListHeader } from '@/components/ShoppingListHeader';
import { PARETE } from '@/components/Vassoio';
import { VoceSpuntabile } from '@/components/VoceSpuntabile';
import { useArticoliSpesa } from '@/hooks/useArticoliSpesa';
import { useGruppoAttivo } from '@/hooks/useGruppoAttivo';
import { useAuthStore } from '@/store/authStore';
import { useGruppoAttivoStore } from '@/store/gruppoAttivoStore';
import { coloriNB as colori, pesiNB as pesi } from '@/theme/neoBrutalista';

export default function ListaSpesa() {
  const gruppoAttivoId = useGruppoAttivoStore((stato) => stato.gruppoAttivoId);

  if (gruppoAttivoId === null) {
    return <Redirect href="/gruppi" />;
  }

  return <ListaSpesaDelGruppo gruppoAttivoId={gruppoAttivoId} />;
}

function ListaSpesaDelGruppo({ gruppoAttivoId }: { gruppoAttivoId: string }) {
  const insets = useSafeAreaInsets();
  const { gruppo, membri } = useGruppoAttivo();
  const utenteId = useAuthStore((stato) => stato.session?.user.id);
  const { articoli, isLoading, error, aggiungi, elimina } = useArticoliSpesa(gruppoAttivoId);
  const [compratiVisibili, setCompratiVisibili] = useState(false);

  const ilMioMembroId = membri.find((m) => m.utente_id === utenteId)?.id ?? null;

  function aggiungiArticoloAllaLista(nome: string, nota: string | null) {
    if (ilMioMembroId === null) {
      return;
    }
    aggiungi.mutate({ nome, creatoDaMembroId: ilMioMembroId, note: nota });
  }

  function tornaIndietro() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/gruppi');
    }
  }

  function apriRegistraSpesa(articolo: ArticoloSpesa) {
    // Segnare comprato NON avviene qui: si apre solo il form di
    // registrazione spesa esistente, che decide lui (con un'azione
    // esplicita dell'utente) se creare una spesa e segnare comprato, o
    // segnare comprato senza spesa. Vedi spese/nuova.tsx.
    router.push({
      pathname: '/spese/nuova',
      params: {
        articoloId: articolo.id,
        nomeArticolo: articolo.nome,
        notaEsistente: articolo.note ?? undefined,
      },
    });
  }

  const daComprare = articoli.filter((a) => a.stato === 'da_comprare');
  const comprati = articoli.filter((a) => a.stato === 'comprato');

  return (
    <View style={styles.schermo}>
      <ScrollView
        contentContainerStyle={[
          styles.contenuto,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
        ]}
      >
        <ShoppingListHeader
          nomeGruppo={gruppo?.nome ?? null}
          totale={articoli.length}
          comprati={comprati.length}
          onIndietro={tornaIndietro}
        />
        <ShoppingListAddForm onAggiungi={aggiungiArticoloAllaLista} />

        {isLoading ? (
          <View style={styles.statoContenitore}>
            <ActivityIndicator color={colori.scuro} />
          </View>
        ) : error !== null && error !== undefined ? (
          <View style={styles.statoContenitore}>
            <Feather name="alert-circle" size={44} color={colori.scuro} />
            <Text style={styles.statoTesto}>Non riesco a caricare la lista al momento.</Text>
          </View>
        ) : articoli.length === 0 ? (
          <View style={styles.statoContenitore}>
            <Feather name="shopping-cart" size={44} color={colori.scuro} />
            <Text style={styles.statoTitolo}>Lista della spesa vuota</Text>
            <Text style={styles.statoTesto}>Aggiungi il primo articolo dal campo qui sopra.</Text>
          </View>
        ) : (
          <BloccoDuro offset={4} colore={colori.scuro} raggio={18} contenutoStyle={styles.elenco}>
            <View style={styles.righe}>
              {daComprare.map((articolo) => (
                <VoceSpuntabile
                  key={articolo.id}
                  testo={articolo.nome}
                  fatto={false}
                  nota={articolo.note}
                  onTocca={() => apriRegistraSpesa(articolo)}
                  onApriModifica={() => router.push({ pathname: '/articoli/[id]', params: { id: articolo.id } })}
                  onElimina={() => elimina.mutate(articolo.id)}
                />
              ))}
              {comprati.length > 0 && (
                <Baran
                  etichetta={`Comprati · ${comprati.length}`}
                  onPress={() => setCompratiVisibili((v) => !v)}
                  aperto={compratiVisibili}
                />
              )}
              {compratiVisibili &&
                comprati.map((articolo) => (
                  <Animated.View key={articolo.id} entering={FadeIn.duration(150)} exiting={FadeOut.duration(120)}>
                    <VoceSpuntabile
                      testo={articolo.nome}
                      fatto
                      acquirente={{
                        nome: membri.find((m) => m.id === articolo.comprato_da)?.nome ?? null,
                        prezzoCentesimi: articolo.prezzo_centesimi,
                      }}
                      onTocca={() => apriRegistraSpesa(articolo)}
                      onApriModifica={() => router.push({ pathname: '/articoli/[id]', params: { id: articolo.id } })}
                      onElimina={() => elimina.mutate(articolo.id)}
                    />
                  </Animated.View>
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
    gap: 14,
  },
  elenco: {
    borderRadius: 18 - 2.5,
    overflow: 'hidden',
    backgroundColor: colori.scuro,
  },
  righe: {
    gap: PARETE,
    backgroundColor: colori.scuro,
  },
  statoContenitore: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    gap: 8,
  },
  statoTitolo: {
    ...pesi.extraBold,
    fontSize: 16,
    color: colori.scuro,
    marginTop: 4,
  },
  statoTesto: {
    fontSize: 13,
    color: colori.soft,
    textAlign: 'center',
  },
});
