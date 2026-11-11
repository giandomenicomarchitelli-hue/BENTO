import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { NotaPersonale } from '@/api/notePersonali';
import { BloccoDuro } from '@/components/BloccoDuro';
import { PARETE } from '@/components/Vassoio';
import { useNotePersonali } from '@/hooks/useNotePersonali';
import { confermaAzione } from '@/lib/conferma';
import { useAuthStore } from '@/store/authStore';
import { coloriNB as colori, pesiNB as pesi } from '@/theme/neoBrutalista';

export default function NotePersonali() {
  const insets = useSafeAreaInsets();
  const utenteId = useAuthStore((stato) => stato.session?.user.id) ?? null;
  const { note, isLoading, crea, elimina } = useNotePersonali(utenteId);
  const [nuovoTitolo, setNuovoTitolo] = useState('');

  function tornaIndietro() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/personale');
    }
  }

  function creaNota() {
    const titolo = nuovoTitolo.trim();
    if (titolo === '') { return; }
    crea.mutate({ titolo });
    setNuovoTitolo('');
  }

  async function confermaEliminaNota(nota: NotaPersonale) {
    const conferma = await confermaAzione(
      `Eliminare "${nota.titolo}"?`,
      'Il contenuto e le foto di questa nota andranno persi.',
      'Elimina'
    );
    if (conferma) { elimina.mutate(nota.id); }
  }

  function apriNota(nota: NotaPersonale) {
    router.push({ pathname: '/personale/note/[id]', params: { id: nota.id, titolo: nota.titolo } });
  }

  return (
    <View style={styles.schermo}>
      <ScrollView
        contentContainerStyle={[styles.contenuto, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
      >
        <View style={styles.rigaTitolo}>
          <Pressable onPress={tornaIndietro} hitSlop={8}>
            <BloccoDuro offset={2} colore={colori.panna} raggio={10} contenutoStyle={styles.quadrato}>
              <Feather name="arrow-left" size={17} color={colori.scuro} />
            </BloccoDuro>
          </Pressable>
          <Text style={styles.titolo}>Note</Text>
        </View>

        <View style={styles.formAggiunta}>
          <TextInput
            style={styles.input}
            placeholder="Nuova nota (es. Idee regalo)"
            placeholderTextColor={colori.soft}
            value={nuovoTitolo}
            onChangeText={setNuovoTitolo}
            onSubmitEditing={creaNota}
            returnKeyType="done"
          />
          <Pressable
            onPress={creaNota}
            disabled={nuovoTitolo.trim() === ''}
            style={[styles.bottoneAggiungi, nuovoTitolo.trim() === '' && styles.bottoneAggiungiDisabilitato]}
          >
            <Feather name="plus" size={20} color="#fff" />
          </Pressable>
        </View>

        <BloccoDuro offset={4} colore={colori.scuro} raggio={16} contenutoStyle={styles.elenco}>
          {isLoading ? (
            <ActivityIndicator color={colori.panna} style={styles.statoVuoto} />
          ) : note.length === 0 ? (
            <Text style={styles.testoVuoto}>Nessuna nota ancora. Creane una qui sopra.</Text>
          ) : (
            <View style={styles.righe}>
              {note.map((nota) => (
                <View key={nota.id} style={styles.riga}>
                  <Pressable onPress={() => apriNota(nota)} style={styles.contenutoRiga}>
                    <Text style={styles.titoloNota} numberOfLines={1}>{nota.titolo}</Text>
                    <Text style={styles.anteprima} numberOfLines={1}>
                      <Text style={styles.data}>{format(new Date(nota.aggiornato_il), "d MMM, HH:mm", { locale: it })}</Text>
                      {nota.contenuto !== '' ? `  ${nota.contenuto}` : ''}
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => confermaEliminaNota(nota)} hitSlop={10} style={styles.bottoneElimina}>
                    <Feather name="trash-2" size={16} color={colori.corallo} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </BloccoDuro>
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
    fontSize: 26,
    letterSpacing: -0.9,
    textTransform: 'uppercase',
    color: colori.scuro,
  },
  formAggiunta: {
    flexDirection: 'row',
    gap: 9,
  },
  input: {
    flex: 1,
    borderWidth: 2,
    borderColor: colori.scuro,
    borderRadius: 11,
    backgroundColor: colori.panna,
    paddingHorizontal: 13,
    paddingVertical: 10,
    fontSize: 14.5,
    fontWeight: '600',
    color: colori.scuro,
  },
  bottoneAggiungi: {
    width: 42,
    height: 42,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colori.scuro,
    backgroundColor: colori.corallo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottoneAggiungiDisabilitato: {
    opacity: 0.4,
  },
  elenco: {
    borderRadius: 16 - 2.5,
    overflow: 'hidden',
    backgroundColor: colori.scuro,
  },
  statoVuoto: {
    paddingVertical: 20,
  },
  testoVuoto: {
    ...pesi.bold,
    fontSize: 13,
    color: colori.panna,
    textAlign: 'center',
    paddingVertical: 20,
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
    gap: 2,
  },
  titoloNota: {
    ...pesi.extraBold,
    fontSize: 14.5,
    color: colori.scuro,
  },
  anteprima: {
    fontSize: 12,
    color: colori.soft,
  },
  data: {
    ...pesi.extraBold,
    fontSize: 12,
    color: colori.soft,
  },
  bottoneElimina: {
    padding: 4,
  },
});
