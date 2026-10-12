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

import type { ArticoloSpesa } from '@/api/articoliSpesa';
import { useArticoliSpesa } from '@/hooks/useArticoliSpesa';
import { useGruppoAttivo } from '@/hooks/useGruppoAttivo';
import { useAuthStore } from '@/store/authStore';
import { useGruppoAttivoStore } from '@/store/gruppoAttivoStore';

function RigaArticolo({
  articolo,
  onTocca,
  onElimina,
}: {
  articolo: ArticoloSpesa;
  onTocca: () => void;
  onElimina: () => void;
}) {
  const comprato = articolo.stato === 'comprato';
  return (
    <Pressable style={styles.riga} onPress={onTocca}>
      <View style={[styles.casella, comprato && styles.caselladSelezionata]}>
        {comprato && <Text style={styles.segno}>✓</Text>}
      </View>
      <Text style={[styles.nomeArticolo, comprato && styles.nomeArticoloComprato]}>
        {articolo.nome}
      </Text>
      <Pressable onPress={onElimina} hitSlop={8}>
        <Text style={styles.elimina}>Elimina</Text>
      </Pressable>
    </Pressable>
  );
}

export default function ListaSpesa() {
  const gruppoAttivoId = useGruppoAttivoStore((stato) => stato.gruppoAttivoId);
  const { membri } = useGruppoAttivo();
  const utenteId = useAuthStore((stato) => stato.session?.user.id);
  const { articoli, isLoading, aggiungi, aggiornaStato, elimina } =
    useArticoliSpesa(gruppoAttivoId);
  const [nuovoArticolo, setNuovoArticolo] = useState('');

  const ilMioMembroId = membri.find((m) => m.utente_id === utenteId)?.id ?? null;

  function aggiungiArticoloAllaLista() {
    const nome = nuovoArticolo.trim();
    if (nome === '' || ilMioMembroId === null) {
      return;
    }
    aggiungi.mutate({ nome, creatoDaMembroId: ilMioMembroId });
    setNuovoArticolo('');
  }

  const daComprare = articoli.filter((a) => a.stato === 'da_comprare');
  const comprati = articoli.filter((a) => a.stato === 'comprato');
  const elencoOrdinato = [...daComprare, ...comprati];

  return (
    <View style={styles.contenitore}>
      <View style={styles.rigaInput}>
        <TextInput
          style={styles.input}
          placeholder="Aggiungi un articolo"
          value={nuovoArticolo}
          onChangeText={setNuovoArticolo}
          onSubmitEditing={aggiungiArticoloAllaLista}
          returnKeyType="done"
        />
        <Pressable style={styles.bottoneAggiungi} onPress={aggiungiArticoloAllaLista}>
          <Text style={styles.testoBottoneAggiungi}>+</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.caricamento} />
      ) : elencoOrdinato.length === 0 ? (
        <Text style={styles.vuoto}>Nessun articolo in lista.</Text>
      ) : (
        <FlatList
          data={elencoOrdinato}
          keyExtractor={(articolo) => articolo.id}
          renderItem={({ item }) => (
            <RigaArticolo
              articolo={item}
              onTocca={() =>
                aggiornaStato.mutate({
                  id: item.id,
                  stato: item.stato === 'da_comprare' ? 'comprato' : 'da_comprare',
                })
              }
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
  nomeArticolo: {
    flex: 1,
    fontSize: 16,
  },
  nomeArticoloComprato: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  elimina: {
    color: '#c0392b',
    fontSize: 13,
  },
});
