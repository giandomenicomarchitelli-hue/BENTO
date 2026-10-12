import { Stack, useLocalSearchParams } from 'expo-router';
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

import type { VoceLista } from '@/api/vociLista';
import { useGruppoAttivo } from '@/hooks/useGruppoAttivo';
import { useVociLista } from '@/hooks/useVociLista';
import { useAuthStore } from '@/store/authStore';

function RigaVoce({
  voce,
  onTocca,
  onElimina,
}: {
  voce: VoceLista;
  onTocca: () => void;
  onElimina: () => void;
}) {
  return (
    <Pressable style={styles.riga} onPress={onTocca}>
      <View style={[styles.casella, voce.fatto && styles.caselladSelezionata]}>
        {voce.fatto && <Text style={styles.segno}>✓</Text>}
      </View>
      <Text style={[styles.testoVoce, voce.fatto && styles.testoVoceFatto]}>{voce.testo}</Text>
      <Pressable onPress={onElimina} hitSlop={8}>
        <Text style={styles.elimina}>Elimina</Text>
      </Pressable>
    </Pressable>
  );
}

export default function DettaglioLista() {
  const { id, nome } = useLocalSearchParams<{ id: string; nome?: string }>();
  const { membri } = useGruppoAttivo();
  const utenteId = useAuthStore((stato) => stato.session?.user.id);
  const { voci, isLoading, aggiungi, aggiornaStato, elimina } = useVociLista(id ?? null);
  const [nuovaVoce, setNuovaVoce] = useState('');

  const ilMioMembroId = membri.find((m) => m.utente_id === utenteId)?.id ?? null;

  function aggiungiVoceAllaLista() {
    const testo = nuovaVoce.trim();
    if (testo === '' || ilMioMembroId === null) {
      return;
    }
    aggiungi.mutate({ testo, creatoDaMembroId: ilMioMembroId });
    setNuovaVoce('');
  }

  const daFare = voci.filter((v) => !v.fatto);
  const fatte = voci.filter((v) => v.fatto);
  const elencoOrdinato = [...daFare, ...fatte];

  return (
    <View style={styles.contenitore}>
      {nome !== undefined && <Stack.Screen options={{ title: nome }} />}

      <View style={styles.rigaInput}>
        <TextInput
          style={styles.input}
          placeholder="Aggiungi una voce"
          value={nuovaVoce}
          onChangeText={setNuovaVoce}
          onSubmitEditing={aggiungiVoceAllaLista}
          returnKeyType="done"
        />
        <Pressable style={styles.bottoneAggiungi} onPress={aggiungiVoceAllaLista}>
          <Text style={styles.testoBottoneAggiungi}>+</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.caricamento} />
      ) : elencoOrdinato.length === 0 ? (
        <Text style={styles.vuoto}>Nessuna voce in questa lista.</Text>
      ) : (
        <FlatList
          data={elencoOrdinato}
          keyExtractor={(voce) => voce.id}
          renderItem={({ item }) => (
            <RigaVoce
              voce={item}
              onTocca={() => aggiornaStato.mutate({ id: item.id, fatto: !item.fatto })}
              onElimina={() => elimina.mutate(item.id)}
            />
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
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  casella: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#2d6cdf',
    alignItems: 'center',
    justifyContent: 'center',
  },
  caselladSelezionata: {
    backgroundColor: '#2d6cdf',
  },
  segno: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  testoVoce: {
    flex: 1,
    fontSize: 16,
  },
  testoVoceFatto: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  elimina: {
    color: '#c0392b',
    fontSize: 13,
  },
});
