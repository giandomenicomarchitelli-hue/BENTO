import { Feather } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
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
  conPrezzi,
  onTocca,
  onApriModifica,
  onElimina,
}: {
  voce: VoceLista;
  conPrezzi: boolean;
  onTocca: () => void;
  onApriModifica: () => void;
  onElimina: () => void;
}) {
  // Una voce fatta di una lista "con prezzi" si modifica/annulla dalla sua
  // pagina di dettaglio, non più con un tap diretto (per non togliere la
  // spunta per sbaglio). Le liste senza prezzi restano un tap diretto.
  const bloccata = voce.fatto && conPrezzi;

  const contenuto = (
    <>
      <View style={[styles.casella, voce.fatto && styles.caselladSelezionata]}>
        {voce.fatto && <Text style={styles.segno}>✓</Text>}
      </View>
      <View style={styles.testiVoce}>
        <Text style={[styles.testoVoce, voce.fatto && styles.testoVoceFatto]}>{voce.testo}</Text>
        {!voce.fatto && voce.note !== null && voce.note !== '' && (
          <Text style={styles.notaVoce}>{voce.note}</Text>
        )}
      </View>
    </>
  );

  return (
    <View style={styles.riga}>
      {bloccata ? (
        <>
          {contenuto}
          <Pressable onPress={onApriModifica} hitSlop={8} style={styles.bottoneAltro}>
            <Feather name="more-vertical" size={18} color="#888" />
          </Pressable>
        </>
      ) : (
        <>
          <Pressable style={styles.rigaCliccabile} onPress={onTocca}>
            {contenuto}
          </Pressable>
          <Pressable onPress={onApriModifica} hitSlop={8} style={styles.bottoneAltro}>
            <Feather name="more-vertical" size={18} color="#888" />
          </Pressable>
        </>
      )}
      <Pressable onPress={onElimina} hitSlop={8}>
        <Text style={styles.elimina}>Elimina</Text>
      </Pressable>
    </View>
  );
}

export default function DettaglioLista() {
  const { id, nome, conPrezzi } = useLocalSearchParams<{
    id: string;
    nome?: string;
    conPrezzi?: string;
  }>();
  const { membri } = useGruppoAttivo();
  const utenteId = useAuthStore((stato) => stato.session?.user.id);
  const { voci, isLoading, aggiungi, aggiorna, elimina } = useVociLista(id ?? null);
  const [nuovaVoce, setNuovaVoce] = useState('');
  const [nuovaNota, setNuovaNota] = useState('');

  const ilMioMembroId = membri.find((m) => m.utente_id === utenteId)?.id ?? null;

  function aggiungiVoceAllaLista() {
    const testo = nuovaVoce.trim();
    if (testo === '' || ilMioMembroId === null) {
      return;
    }
    aggiungi.mutate({
      testo,
      creatoDaMembroId: ilMioMembroId,
      note: nuovaNota.trim() === '' ? null : nuovaNota.trim(),
    });
    setNuovaVoce('');
    setNuovaNota('');
  }

  const daFare = voci.filter((v) => !v.fatto);
  const fatte = voci.filter((v) => v.fatto);
  const elencoOrdinato = [...daFare, ...fatte];

  return (
    <View style={styles.contenitore}>
      {nome !== undefined && <Stack.Screen options={{ title: nome }} />}

      <View style={styles.formAggiungi}>
        <View style={styles.rigaInput}>
          <TextInput
            style={styles.input}
            placeholder="Aggiungi una voce"
            value={nuovaVoce}
            onChangeText={setNuovaVoce}
            onSubmitEditing={aggiungiVoceAllaLista}
            returnKeyType={conPrezzi === '1' ? 'next' : 'done'}
          />
          <Pressable style={styles.bottoneAggiungi} onPress={aggiungiVoceAllaLista}>
            <Text style={styles.testoBottoneAggiungi}>+</Text>
          </Pressable>
        </View>
        {conPrezzi === '1' && (
          <TextInput
            style={styles.inputNota}
            placeholder="Note (opzionale)"
            value={nuovaNota}
            onChangeText={setNuovaNota}
            onSubmitEditing={aggiungiVoceAllaLista}
            returnKeyType="done"
          />
        )}
        {voci.length >= 3 && (
          <Pressable
            style={styles.bottoneSfida}
            onPress={() => router.push({ pathname: '/sfide/nuova', params: { listaId: id } })}
          >
            <Text style={styles.testoBottoneSfida}>Inizia sfida</Text>
          </Pressable>
        )}
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
              conPrezzi={conPrezzi === '1'}
              onTocca={() => {
                if (!item.fatto && conPrezzi === '1') {
                  // Segnare fatta una voce di una lista "con prezzi" apre il
                  // form per registrare la spesa (o saltarlo).
                  router.push({
                    pathname: '/spese/nuova',
                    params: {
                      voceListaId: item.id,
                      listaId: id,
                      nomeVoce: item.testo,
                      notaEsistente: item.note ?? undefined,
                    },
                  });
                } else {
                  aggiorna.mutate({ id: item.id, fatto: !item.fatto });
                }
              }}
              onApriModifica={() =>
                router.push({
                  pathname: '/voci/[id]',
                  params: { id: item.id, listaId: id as string },
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
  formAggiungi: {
    gap: 8,
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
  inputNota: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
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
  bottoneSfida: {
    borderWidth: 1,
    borderColor: '#2d6cdf',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  testoBottoneSfida: {
    color: '#2d6cdf',
    fontSize: 15,
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
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  rigaCliccabile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bottoneAltro: {
    padding: 4,
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
  testiVoce: {
    flex: 1,
  },
  testoVoce: {
    fontSize: 16,
  },
  testoVoceFatto: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  notaVoce: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  elimina: {
    color: '#c0392b',
    fontSize: 13,
  },
});
