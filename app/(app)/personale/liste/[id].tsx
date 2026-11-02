import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { VoceListaPersonale } from '@/api/vociListaPersonali';
import { BentoButton } from '@/components/BentoButton';
import { BentoScreen } from '@/components/BentoScreen';
import { GlassCard } from '@/components/GlassCard';
import { useVociListaPersonali } from '@/hooks/useVociListaPersonali';
import { confermaAzione } from '@/lib/conferma';
import { accenti, bento, raggio, semantica, spaziatura } from '@/theme/tokens';

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
    <BentoScreen>
      {nome !== undefined && <Stack.Screen options={{ title: nome }} />}

      <GlassCard>
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Aggiungi una voce"
            placeholderTextColor={bento.testoMuto}
            value={nuovaVoce}
            onChangeText={setNuovaVoce}
            onSubmitEditing={aggiungiVoce}
            returnKeyType="done"
          />
          <BentoButton
            etichetta="Aggiungi"
            onPress={aggiungiVoce}
            disabilitato={nuovaVoce.trim() === ''}
          />
        </View>
      </GlassCard>

      {isLoading ? (
        <ActivityIndicator color={bento.testoPrimario} style={styles.caricamento} />
      ) : voci.length === 0 ? (
        <Text style={styles.vuoto}>Nessuna voce in questa lista.</Text>
      ) : (
        <View style={styles.elenco}>
          {voci.map((voce) => (
            <GlassCard key={voce.id} elevazione="bassa">
              <View style={styles.riga}>
                <Pressable
                  style={styles.rigaCliccabile}
                  onPress={() => aggiorna.mutate({ id: voce.id, fatto: !voce.fatto })}
                >
                  <View style={[styles.casella, voce.fatto && styles.caselladSelezionata]}>
                    {voce.fatto && <Text style={styles.segno}>✓</Text>}
                  </View>
                  <Text style={[styles.testoVoce, voce.fatto && styles.testoVoceFatto]}>
                    {voce.testo}
                  </Text>
                </Pressable>
                <Pressable onPress={() => confermaEliminaVoce(voce)} hitSlop={8}>
                  <Text style={styles.elimina}>Elimina</Text>
                </Pressable>
              </View>
            </GlassCard>
          ))}
        </View>
      )}
    </BentoScreen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spaziatura.md,
  },
  input: {
    fontSize: 16,
    color: bento.testoPrimario,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: bento.sfondoAlt,
    borderRadius: raggio.sm,
  },
  caricamento: {
    marginTop: spaziatura.xl,
  },
  vuoto: {
    textAlign: 'center',
    color: bento.testoSecondario,
    marginTop: spaziatura.xl,
  },
  elenco: {
    gap: spaziatura.sm,
  },
  riga: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spaziatura.md,
  },
  rigaCliccabile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spaziatura.md,
  },
  casella: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: accenti.menta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caselladSelezionata: {
    backgroundColor: accenti.menta,
  },
  segno: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  testoVoce: {
    flex: 1,
    fontSize: 16,
    color: bento.testoPrimario,
  },
  testoVoceFatto: {
    textDecorationLine: 'line-through',
    color: bento.testoMuto,
  },
  elimina: {
    color: semantica.pericolo,
    fontSize: 13,
    fontWeight: '600',
  },
});
