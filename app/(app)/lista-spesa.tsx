import { Redirect, router } from 'expo-router';
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
  nomeCompratore,
  onTocca,
  onElimina,
}: {
  articolo: ArticoloSpesa;
  nomeCompratore: string | null;
  onTocca: () => void;
  onElimina: () => void;
}) {
  const comprato = articolo.stato === 'comprato';
  return (
    <Pressable style={styles.riga} onPress={onTocca}>
      <View style={[styles.casella, comprato && styles.caselladSelezionata]}>
        {comprato && <Text style={styles.segno}>✓</Text>}
      </View>
      <View style={styles.testiArticolo}>
        <Text style={[styles.nomeArticolo, comprato && styles.nomeArticoloComprato]}>
          {articolo.nome}
        </Text>
        {comprato && nomeCompratore !== null && (
          <Text style={styles.compratoDa}>Comprato da {nomeCompratore}</Text>
        )}
      </View>
      <Pressable onPress={onElimina} hitSlop={8}>
        <Text style={styles.elimina}>Elimina</Text>
      </Pressable>
    </Pressable>
  );
}

export default function ListaSpesa() {
  const gruppoAttivoId = useGruppoAttivoStore((stato) => stato.gruppoAttivoId);

  if (gruppoAttivoId === null) {
    return <Redirect href="/gruppi" />;
  }

  return <ListaSpesaDelGruppo gruppoAttivoId={gruppoAttivoId} />;
}

function ListaSpesaDelGruppo({ gruppoAttivoId }: { gruppoAttivoId: string }) {
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
              nomeCompratore={membri.find((m) => m.id === item.comprato_da)?.nome ?? null}
              onTocca={() => {
                if (item.stato === 'da_comprare') {
                  // Segnare comprato apre il form per registrare la spesa
                  // (o saltarlo, se non si vuole registrare nulla).
                  router.push({
                    pathname: '/spese/nuova',
                    params: { articoloId: item.id, nomeArticolo: item.nome },
                  });
                } else {
                  aggiornaStato.mutate({ id: item.id, stato: 'da_comprare' });
                }
              }}
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
  testiArticolo: {
    flex: 1,
  },
  nomeArticolo: {
    fontSize: 16,
  },
  nomeArticoloComprato: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  compratoDa: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  elimina: {
    color: '#c0392b',
    fontSize: 13,
  },
});
