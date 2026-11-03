import * as ImagePicker from 'expo-image-picker';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Markdown from 'react-native-markdown-display';

import type { FotoNotaPersonale } from '@/api/fotoNotePersonali';
import { BentoButton } from '@/components/BentoButton';
import { BentoScreen } from '@/components/BentoScreen';
import { GlassCard } from '@/components/GlassCard';
import { useFotoNotePersonali } from '@/hooks/useFotoNotePersonali';
import { useNotePersonali } from '@/hooks/useNotePersonali';
import { confermaAzione } from '@/lib/conferma';
import { useAuthStore } from '@/store/authStore';
import { bento, raggio, semantica, spaziatura } from '@/theme/tokens';

export default function DettaglioNotaPersonale() {
  const { id, titolo: titoloIniziale } = useLocalSearchParams<{ id: string; titolo?: string }>();
  const utenteId = useAuthStore((stato) => stato.session?.user.id) ?? null;
  const { note, aggiorna, elimina: eliminaNota } = useNotePersonali(utenteId);
  const { foto, aggiungi, elimina: eliminaFoto } = useFotoNotePersonali(id ?? null, utenteId);

  const nota = note.find((n) => n.id === id);

  const [titolo, setTitolo] = useState(titoloIniziale ?? '');
  const [contenuto, setContenuto] = useState('');
  const [modalitaAnteprima, setModalitaAnteprima] = useState(false);
  const inizializzato = useRef(false);

  useEffect(() => {
    if (!inizializzato.current && nota !== undefined) {
      setContenuto(nota.contenuto);
      inizializzato.current = true;
    }
  }, [nota]);

  async function confermaEliminaFoto(f: FotoNotaPersonale) {
    const conferma = await confermaAzione('Eliminare questa foto?', 'Non si può annullare.', 'Elimina');
    if (conferma) {
      eliminaFoto.mutate(f);
    }
  }

  async function aggiungiFoto() {
    const permesso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permesso.granted) {
      return;
    }
    const risultato = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (risultato.canceled) {
      return;
    }
    aggiungi.mutate({ uri: risultato.assets[0].uri });
  }

  async function confermaEliminaNota() {
    const conferma = await confermaAzione(
      'Eliminare questa nota?',
      'Il contenuto e le foto di questa nota andranno persi.',
      'Elimina'
    );
    if (conferma) {
      eliminaNota.mutate(id);
      router.back();
    }
  }

  return (
    <BentoScreen>
      {titoloIniziale !== undefined && <Stack.Screen options={{ title: titoloIniziale }} />}

      <GlassCard>
        <View style={styles.form}>
          <TextInput
            style={styles.inputTitolo}
            placeholder="Titolo"
            placeholderTextColor={bento.testoMuto}
            value={titolo}
            onChangeText={setTitolo}
          />

          <Pressable onPress={() => setModalitaAnteprima((precedente) => !precedente)}>
            <Text style={styles.toggleAnteprima}>
              {modalitaAnteprima ? 'Modifica' : 'Anteprima'}
            </Text>
          </Pressable>

          {modalitaAnteprima ? (
            <View style={styles.anteprimaContenitore}>
              <Markdown style={markdownStyle}>{contenuto}</Markdown>
            </View>
          ) : (
            <TextInput
              style={styles.inputContenuto}
              placeholder="Scrivi qui la tua nota..."
              placeholderTextColor={bento.testoMuto}
              value={contenuto}
              onChangeText={setContenuto}
              multiline
              textAlignVertical="top"
            />
          )}

          <BentoButton
            etichetta="Salva"
            onPress={() => aggiorna.mutate({ id, titolo, contenuto })}
            disabilitato={titolo.trim() === '' || aggiorna.isPending}
          />

          {aggiorna.error !== null && (
            <Text style={styles.errore}>{aggiorna.error.message}</Text>
          )}
        </View>
      </GlassCard>

      <GlassCard>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.rigaFoto}>
            {foto.map((f) => (
              <View key={f.id} style={styles.fotoContenitore}>
                <Image source={{ uri: f.url }} style={styles.miniatura} />
                <Pressable onPress={() => confermaEliminaFoto(f)} hitSlop={8}>
                  <Text style={styles.eliminaFoto}>Elimina</Text>
                </Pressable>
              </View>
            ))}
            <Pressable
              style={[styles.tileAggiungi, aggiungi.isPending && styles.tileAggiungiDisabilitata]}
              onPress={aggiungiFoto}
              disabled={aggiungi.isPending}
            >
              {aggiungi.isPending ? (
                <ActivityIndicator color={bento.testoPrimario} />
              ) : (
                <Text style={styles.piu}>+</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>

        {aggiungi.error !== null && (
          <Text style={styles.errore}>{aggiungi.error.message}</Text>
        )}
      </GlassCard>

      <Pressable onPress={confermaEliminaNota} hitSlop={8} style={styles.eliminaNota}>
        <Text style={styles.eliminaNotaTesto}>Elimina nota</Text>
      </Pressable>
    </BentoScreen>
  );
}

const markdownStyle = {
  body: { color: bento.testoPrimario },
};

const styles = StyleSheet.create({
  form: {
    gap: spaziatura.md,
  },
  inputTitolo: {
    fontSize: 18,
    fontWeight: '600',
    color: bento.testoPrimario,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: bento.sfondoAlt,
    borderRadius: raggio.sm,
  },
  toggleAnteprima: {
    alignSelf: 'flex-end',
    color: semantica.info,
    fontSize: 13,
    fontWeight: '600',
  },
  inputContenuto: {
    minHeight: 200,
    fontSize: 15,
    color: bento.testoPrimario,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: bento.sfondoAlt,
    borderRadius: raggio.sm,
  },
  anteprimaContenitore: {
    minHeight: 200,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: bento.sfondoAlt,
    borderRadius: raggio.sm,
  },
  errore: {
    color: semantica.pericolo,
    fontSize: 13,
  },
  rigaFoto: {
    flexDirection: 'row',
    gap: spaziatura.sm,
  },
  fotoContenitore: {
    alignItems: 'center',
    gap: 4,
  },
  miniatura: {
    width: 72,
    height: 72,
    borderRadius: raggio.sm,
    backgroundColor: bento.sfondoAlt,
  },
  eliminaFoto: {
    color: semantica.pericolo,
    fontSize: 11,
    fontWeight: '600',
  },
  tileAggiungi: {
    width: 72,
    height: 72,
    borderRadius: raggio.sm,
    backgroundColor: bento.sfondoAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileAggiungiDisabilitata: {
    opacity: 0.5,
  },
  piu: {
    fontSize: 28,
    color: bento.testoSecondario,
  },
  eliminaNota: {
    alignSelf: 'center',
  },
  eliminaNotaTesto: {
    color: semantica.pericolo,
    fontSize: 14,
    fontWeight: '600',
  },
});
