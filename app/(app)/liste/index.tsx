import { router, Redirect } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { Lista } from '@/api/liste';
import { useGruppoAttivo } from '@/hooks/useGruppoAttivo';
import { useListe } from '@/hooks/useListe';
import { confermaAzione } from '@/lib/conferma';
import { useAuthStore } from '@/store/authStore';
import { useGruppoAttivoStore } from '@/store/gruppoAttivoStore';

export default function Liste() {
  const gruppoAttivoId = useGruppoAttivoStore((stato) => stato.gruppoAttivoId);

  if (gruppoAttivoId === null) {
    return <Redirect href="/gruppi" />;
  }

  return <ListeDelGruppo gruppoAttivoId={gruppoAttivoId} />;
}

function ListeDelGruppo({ gruppoAttivoId }: { gruppoAttivoId: string }) {
  const { membri } = useGruppoAttivo();
  const utenteId = useAuthStore((stato) => stato.session?.user.id);
  const { liste, isLoading, crea, elimina } = useListe(gruppoAttivoId);
  const [nuovaLista, setNuovaLista] = useState('');
  const [mostraInHome, setMostraInHome] = useState(false);
  const [conPrezzi, setConPrezzi] = useState(false);

  const ilMioMembroId = membri.find((m) => m.utente_id === utenteId)?.id ?? null;

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
    <View style={styles.contenitore}>
      <View style={styles.formNuovaLista}>
        <TextInput
          style={styles.input}
          placeholder="Nuova lista (es. Film da vedere)"
          value={nuovaLista}
          onChangeText={setNuovaLista}
          onSubmitEditing={creaLista}
          returnKeyType="done"
        />

        <View style={styles.righeChip}>
          <Pressable
            style={[styles.chip, mostraInHome && styles.chipSelezionato]}
            onPress={() => setMostraInHome((v) => !v)}
          >
            <Text style={[styles.testoChip, mostraInHome && styles.testoChipSelezionato]}>
              Mostra anche in home
            </Text>
          </Pressable>
          <Pressable
            style={[styles.chip, conPrezzi && styles.chipSelezionato]}
            onPress={() => setConPrezzi((v) => !v)}
          >
            <Text style={[styles.testoChip, conPrezzi && styles.testoChipSelezionato]}>
              Lista con prezzi (collegata ai saldi)
            </Text>
          </Pressable>
        </View>

        <Pressable style={styles.bottoneCrea} onPress={creaLista}>
          <Text style={styles.testoBottoneCrea}>Crea lista</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.caricamento} />
      ) : liste.length === 0 ? (
        <Text style={styles.vuoto}>Nessuna lista ancora. Creane una qui sopra.</Text>
      ) : (
        <FlatList
          data={liste}
          keyExtractor={(lista) => lista.id}
          renderItem={({ item }) => (
            <Pressable style={styles.riga} onPress={() => apriLista(item)}>
              <View>
                <Text style={styles.nomeLista}>{item.nome}</Text>
                {(item.mostra_in_home || item.con_prezzi) && (
                  <Text style={styles.dettaglioLista}>
                    {[item.mostra_in_home && 'in home', item.con_prezzi && 'con prezzi']
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                )}
              </View>
              <Pressable onPress={() => confermaEliminaLista(item)} hitSlop={8}>
                <Text style={styles.elimina}>Elimina</Text>
              </Pressable>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenitore: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  formNuovaLista: {
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
  },
  righeChip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipSelezionato: {
    backgroundColor: '#2d6cdf',
    borderColor: '#2d6cdf',
  },
  testoChip: {
    fontSize: 13,
    color: '#333',
  },
  testoChipSelezionato: {
    color: '#fff',
  },
  bottoneCrea: {
    backgroundColor: '#2d6cdf',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  testoBottoneCrea: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  caricamento: {
    marginTop: 24,
  },
  vuoto: {
    textAlign: 'center',
    color: '#888',
    marginTop: 24,
  },
  riga: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  nomeLista: {
    fontSize: 16,
  },
  dettaglioLista: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  elimina: {
    color: '#c0392b',
    fontSize: 13,
  },
});
