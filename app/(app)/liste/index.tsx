import { Feather } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Lista } from '@/api/liste';
import { BloccoDuro } from '@/components/BloccoDuro';
import { PARETE } from '@/components/Vassoio';
import { useGruppoAttivo } from '@/hooks/useGruppoAttivo';
import { useListe } from '@/hooks/useListe';
import { confermaAzione } from '@/lib/conferma';
import { useAuthStore } from '@/store/authStore';
import { useGruppoAttivoStore } from '@/store/gruppoAttivoStore';
import { coloriNB as colori, pesiNB as pesi } from '@/theme/neoBrutalista';

export default function Liste() {
  const gruppoAttivoId = useGruppoAttivoStore((stato) => stato.gruppoAttivoId);

  if (gruppoAttivoId === null) {
    return <Redirect href="/gruppi" />;
  }

  return <ListeDelGruppo gruppoAttivoId={gruppoAttivoId} />;
}

function ListeDelGruppo({ gruppoAttivoId }: { gruppoAttivoId: string }) {
  const insets = useSafeAreaInsets();
  const { membri } = useGruppoAttivo();
  const utenteId = useAuthStore((stato) => stato.session?.user.id);
  const { liste, isLoading, crea, elimina } = useListe(gruppoAttivoId);
  const [nuovaLista, setNuovaLista] = useState('');
  const [mostraInHome, setMostraInHome] = useState(false);
  const [conPrezzi, setConPrezzi] = useState(false);

  const ilMioMembroId = membri.find((m) => m.utente_id === utenteId)?.id ?? null;

  function tornaIndietro() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/personale');
    }
  }

  function creaLista() {
    const nome = nuovaLista.trim();
    if (nome === '' || ilMioMembroId === null) {
      return;
    }
    crea.mutate({ nome, creatoDaMembroId: ilMioMembroId, mostraInHome, conPrezzi });
    setNuovaLista('');
    setMostraInHome(false);
    setConPrezzi(false);
  }

  async function confermaEliminaLista(lista: Lista) {
    const conferma = await confermaAzione(
      `Eliminare "${lista.nome}"?`,
      'Tutte le voci di questa lista andranno perse.',
      'Elimina'
    );
    if (conferma) {
      elimina.mutate(lista.id);
    }
  }

  function apriLista(lista: Lista) {
    router.push({
      pathname: '/liste/[id]',
      params: { id: lista.id, nome: lista.nome, conPrezzi: lista.con_prezzi ? '1' : '0' },
    });
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
          <Text style={styles.titolo}>Liste del gruppo</Text>
        </View>

        <BloccoDuro offset={3} colore={colori.panna} raggio={16} contenutoStyle={styles.pannello}>
          <TextInput
            style={styles.input}
            placeholder="Nuova lista (es. Film da vedere)"
            placeholderTextColor={colori.soft}
            value={nuovaLista}
            onChangeText={setNuovaLista}
            onSubmitEditing={creaLista}
            returnKeyType="done"
          />

          <View style={styles.rigaChip}>
            <Pressable
              style={[styles.chip, mostraInHome && styles.chipAttivo]}
              onPress={() => setMostraInHome((v) => !v)}
            >
              <View style={[styles.puntino, mostraInHome && styles.puntinoAttivo]} />
              <Text style={styles.testoChip}>Mostra in home</Text>
            </Pressable>
            <Pressable
              style={[styles.chip, conPrezzi && styles.chipAttivo]}
              onPress={() => setConPrezzi((v) => !v)}
            >
              <View style={[styles.puntino, conPrezzi && styles.puntinoAttivo]} />
              <Text style={styles.testoChip}>Con prezzi</Text>
            </Pressable>
          </View>

          <BloccoDuro
            offset={2.5}
            colore={colori.corallo}
            raggio={11}
            contenutoStyle={styles.bottoneCrea}
            onPress={nuovaLista.trim() === '' ? undefined : creaLista}
            style={nuovaLista.trim() === '' && styles.bottoneCreaDisabilitato}
          >
            <Text style={styles.testoBottoneCrea}>Crea lista</Text>
          </BloccoDuro>
        </BloccoDuro>

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
                    {(lista.mostra_in_home || lista.con_prezzi) && (
                      <Text style={styles.dettaglioLista} numberOfLines={1}>
                        {[lista.mostra_in_home && 'in home', lista.con_prezzi && 'con prezzi']
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    )}
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
  pannello: {
    padding: 12,
    gap: 10,
  },
  input: {
    borderWidth: 2,
    borderColor: colori.scuro,
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 11,
    paddingVertical: 9,
    fontSize: 13,
    fontWeight: '700',
    color: colori.scuro,
  },
  rigaChip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    borderColor: colori.scuro,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  chipAttivo: {
    backgroundColor: colori.viola,
  },
  puntino: {
    width: 12,
    height: 12,
    borderWidth: 1.6,
    borderColor: colori.scuro,
    borderRadius: 3,
  },
  puntinoAttivo: {
    backgroundColor: colori.scuro,
  },
  testoChip: {
    ...pesi.extraBold,
    fontSize: 10.5,
    color: colori.scuro,
  },
  bottoneCrea: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottoneCreaDisabilitato: {
    opacity: 0.4,
  },
  testoBottoneCrea: {
    ...pesi.extraBold,
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: '#fff',
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
  dettaglioLista: {
    fontSize: 11,
    color: colori.soft,
    marginTop: 2,
  },
  bottoneMenu: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
