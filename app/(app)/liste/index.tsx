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
    return <Redirect href="/" />;
  }

  return <ListeDelGruppo gruppoAttivoId={gruppoAttivoId} />;
}

function ListeDelGruppo({ gruppoAttivoId }: { gruppoAttivoId: string }) {
  const { membri } = useGruppoAttivo();
  const utenteId = useAuthStore((stato) => stato.session?.user.id);
  const { liste, isLoading, crea, elimina } = useListe(gruppoAttivoId);
  const [nuovaLista, setNuovaLista] = useState('');

  const ilMioMembroId = membri.find((m) => m.utente_id === utenteId)?.id ?? null;

  function creaLista() {
    const nome = nuovaLista.trim();
    if (nome === '' || ilMioMembroId === null) {
      return;
    }
    crea.mutate({ nome, creatoDaMembroId: ilMioMembroId });
    setNuovaLista('');
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
    router.push({ pathname: '/liste/[id]', params: { id: lista.id, nome: lista.nome } });
  }

  return (
    <View style={styles.contenitore}>
      <View style={styles.rigaInput}>
        <TextInput
          style={styles.input}
          placeholder="Nuova lista (es. Film da vedere)"
          value={nuovaLista}
          onChangeText={setNuovaLista}
          onSubmitEditing={creaLista}
          returnKeyType="done"
        />
        <Pressable style={styles.bottoneAggiungi} onPress={creaLista}>
          <Text style={styles.testoBottoneAggiungi}>+</Text>
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
              <Text style={styles.nomeLista}>{item.nome}</Text>
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
  rigaInput: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
  },
  bottoneAggiungi: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#2d6cdf',
    alignItems: 'center',
    justifyContent: 'center',
  },
  testoBottoneAggiungi: {
    color: '#fff',
    fontSize: 22,
    lineHeight: 24,
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
  elimina: {
    color: '#c0392b',
    fontSize: 13,
  },
});
