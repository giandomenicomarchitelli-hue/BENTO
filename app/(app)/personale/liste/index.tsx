import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ListaPersonale } from '@/api/listePersonali';
import { BloccoDuro } from '@/components/BloccoDuro';
import { PARETE } from '@/components/Vassoio';
import { useListePersonali } from '@/hooks/useListePersonali';
import { confermaAzione } from '@/lib/conferma';
import { useAuthStore } from '@/store/authStore';
import { coloriNB as colori, pesiNB as pesi } from '@/theme/neoBrutalista';

/**
 * Nessun redirect/guard legato a un gruppo: le liste personali sono scoped
 * solo per utente. Senza utenteId (non dovrebbe succedere dentro (app)/)
 * l'hook resta semplicemente in attesa, mostrando l'elenco vuoto.
 */
export default function ListePersonali() {
  const insets = useSafeAreaInsets();
  const utenteId = useAuthStore((stato) => stato.session?.user.id) ?? null;
  const { liste, isLoading, crea, elimina } = useListePersonali(utenteId);
  const [nuovaLista, setNuovaLista] = useState('');

  function tornaIndietro() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/personale');
    }
  }

  function creaLista() {
    const nome = nuovaLista.trim();
    if (nome === '') {
      return;
    }
    crea.mutate({ nome });
    setNuovaLista('');
  }

  async function confermaEliminaLista(lista: ListaPersonale) {
    const conferma = await confermaAzione(
      `Eliminare "${lista.nome}"?`,
      'Tutte le voci di questa lista andranno perse.',
      'Elimina'
    );
    if (conferma) {
      elimina.mutate(lista.id);
    }
  }

  function apriLista(lista: ListaPersonale) {
    router.push({ pathname: '/personale/liste/[id]', params: { id: lista.id, nome: lista.nome } });
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
          <Text style={styles.titolo}>Le mie liste</Text>
        </View>

        <View style={styles.formAggiunta}>
          <TextInput
            style={styles.input}
            placeholder="Nuova lista (es. Film da vedere)"
            placeholderTextColor={colori.soft}
            value={nuovaLista}
            onChangeText={setNuovaLista}
            onSubmitEditing={creaLista}
            returnKeyType="done"
          />
          <BloccoDuro
            style={nuovaLista.trim() === '' && styles.bottoneAggiungiDisabilitato}
            offset={2.5}
            colore={colori.corallo}
            raggio={11}
            contenutoStyle={styles.bottoneAggiungi}
            onPress={nuovaLista.trim() === '' ? undefined : creaLista}
          >
            <Feather name="plus" size={20} color="#fff" />
          </BloccoDuro>
        </View>

        {isLoading ? (
          <ActivityIndicator color={colori.scuro} style={styles.caricamento} />
        ) : liste.length === 0 ? (
          <Text style={styles.vuoto}>Nessuna lista ancora. Creane una qui sopra.</Text>
        ) : (
          <BloccoDuro offset={4} colore={colori.scuro} raggio={16} contenutoStyle={styles.elenco}>
            <View style={styles.righe}>
              {liste.map((lista) => (
                <View key={lista.id} style={styles.riga}>
                  <Pressable onPress={() => apriLista(lista)} style={styles.contenutoRiga}>
                    <Text style={styles.nomeLista} numberOfLines={1}>{lista.nome}</Text>
                  </Pressable>
                  <Pressable onPress={() => confermaEliminaLista(lista)} hitSlop={10} style={styles.bottoneMenu}>
                    <Feather name="more-vertical" size={15} color={colori.soft} />
                  </Pressable>
                </View>
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
  },
  formAggiunta: {
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
  bottoneAggiungi: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottoneAggiungiDisabilitato: {
    opacity: 0.4,
  },
  caricamento: {
    marginTop: 20,
  },
  vuoto: {
    ...pesi.bold,
    fontSize: 13,
    color: colori.soft,
    textAlign: 'center',
    marginTop: 20,
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
  riga: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colori.panna,
    paddingVertical: 11,
    paddingHorizontal: 13,
    gap: 10,
  },
  contenutoRiga: {
    flex: 1,
    minWidth: 0,
  },
  nomeLista: {
    ...pesi.extraBold,
    fontSize: 14.5,
    color: colori.scuro,
  },
  bottoneMenu: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
