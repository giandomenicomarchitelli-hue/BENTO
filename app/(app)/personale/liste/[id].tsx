import { Feather } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';

import type { VoceListaPersonale } from '@/api/vociListaPersonali';
import { BentoScreen } from '@/components/BentoScreen';
import { BloccoDuro } from '@/components/BloccoDuro';
import { PARETE } from '@/components/Vassoio';
import { VoceSpuntabile } from '@/components/VoceSpuntabile';
import { useVociListaPersonali } from '@/hooks/useVociListaPersonali';
import { confermaAzione } from '@/lib/conferma';
import { coloriNB as colori } from '@/theme/neoBrutalista';

export default function DettaglioListaPersonale() {
  const { id, nome } = useLocalSearchParams<{ id: string; nome?: string }>();
  const { voci, isLoading, aggiungi, aggiorna, elimina } = useVociListaPersonali(id ?? null);
  const [nuovaVoce, setNuovaVoce] = useState('');

  function aggiungiVoce() {
    const testo = nuovaVoce.trim();
    if (testo === '') {
      return;
    }
    aggiungi.mutate({ testo });
    setNuovaVoce('');
  }

  async function confermaEliminaVoce(voce: VoceListaPersonale) {
    const conferma = await confermaAzione(
      `Eliminare "${voce.testo}"?`,
      'La voce verrà rimossa dalla lista.',
      'Elimina'
    );
    if (conferma) {
      elimina.mutate(voce.id);
    }
  }

  return (
    <View style={styles.contenitore}>
      {nome !== undefined && <Stack.Screen options={{ title: nome }} />}

      <BentoScreen>
        <View style={styles.rigaInput}>
          <TextInput
            style={styles.input}
            placeholder="Aggiungi una voce"
            placeholderTextColor={colori.soft}
            value={nuovaVoce}
            onChangeText={setNuovaVoce}
            onSubmitEditing={aggiungiVoce}
            returnKeyType="done"
          />
          <BloccoDuro
            style={nuovaVoce.trim() === '' && styles.cellaAggiungiDisabilitata}
            offset={2.5}
            colore={colori.corallo}
            raggio={11}
            contenutoStyle={styles.bottoneAggiungi}
            onPress={nuovaVoce.trim() === '' ? undefined : aggiungiVoce}
          >
            <Feather name="plus" size={20} color="#fff" />
          </BloccoDuro>
        </View>

        {isLoading ? (
          <ActivityIndicator color={colori.scuro} style={styles.caricamento} />
        ) : voci.length === 0 ? (
          <Text style={styles.vuoto}>Nessuna voce in questa lista.</Text>
        ) : (
          <BloccoDuro offset={4} colore={colori.scuro} raggio={16} contenutoStyle={styles.elenco}>
            <View style={styles.righe}>
              {voci.map((voce) => (
                <VoceSpuntabile
                  key={voce.id}
                  testo={voce.testo}
                  fatto={voce.fatto}
                  onTocca={() => aggiorna.mutate({ id: voce.id, fatto: !voce.fatto })}
                  onApriModifica={() => confermaEliminaVoce(voce)}
                  onElimina={() => elimina.mutate(voce.id)}
                />
              ))}
            </View>
          </BloccoDuro>
        )}
      </BentoScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  contenitore: {
    flex: 1,
  },
  rigaInput: {
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
  cellaAggiungiDisabilitata: {
    opacity: 0.4,
  },
  bottoneAggiungi: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caricamento: {
    marginTop: 24,
  },
  vuoto: {
    fontSize: 13,
    fontWeight: '700',
    color: colori.soft,
    textAlign: 'center',
    marginTop: 24,
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
});
