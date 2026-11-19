import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import MarkdownIt from 'markdown-it';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Markdown from 'react-native-markdown-display';

import type { FotoNotaPersonale } from '@/api/fotoNotePersonali';
import { BloccoDuro } from '@/components/BloccoDuro';
import { useFotoNotePersonali } from '@/hooks/useFotoNotePersonali';
import { useNotePersonali } from '@/hooks/useNotePersonali';
import { confermaAzione } from '@/lib/conferma';
import { useAuthStore } from '@/store/authStore';
import { coloriNB as colori, pesiNB as pesi } from '@/theme/neoBrutalista';

export default function DettaglioNotaPersonale() {
  const insets = useSafeAreaInsets();
  const { id, titolo: titoloIniziale } = useLocalSearchParams<{ id: string; titolo?: string }>();
  const utenteId = useAuthStore((stato) => stato.session?.user.id) ?? null;
  const { note, isLoading, aggiorna, elimina: eliminaNota } = useNotePersonali(utenteId);
  const { foto, aggiungi, elimina: eliminaFoto } = useFotoNotePersonali(id ?? null, utenteId);

  const nota = note.find((n) => n.id === id);

  const [titolo, setTitolo] = useState(titoloIniziale ?? '');
  const [contenuto, setContenuto] = useState('');
  const [modalitaAnteprima, setModalitaAnteprima] = useState(false);
  const [fotoAperta, setFotoAperta] = useState<FotoNotaPersonale | null>(null);
  const inizializzato = useRef(false);
  const ultimoSalvato = useRef<{ titolo: string; contenuto: string } | null>(null);

  useEffect(() => {
    if (!inizializzato.current && nota !== undefined) {
      // `titolo` partiva solo dal parametro di navigazione (una copia
      // potenzialmente non aggiornata) e non veniva mai riallineato a
      // `nota.titolo` una volta arrivati i dati veri: salvare poteva
      // sovrascrivere in silenzio un titolo cambiato altrove con quello
      // vecchio. Stesso momento di inizializzazione già usato per
      // `contenuto`, che il parametro di navigazione non porta affatto.
      setTitolo(nota.titolo);
      setContenuto(nota.contenuto);
      ultimoSalvato.current = { titolo: nota.titolo, contenuto: nota.contenuto };
      inizializzato.current = true;
    }
  }, [nota]);

  // Autosalvataggio: niente più bottone "Salva". Aspetta una pausa nella
  // digitazione (non un salvataggio ad ogni tasto), salta il giro finché
  // titolo/contenuto non sono stati caricati dalla nota vera (altrimenti il
  // primo render dopo l'inizializzazione si "autosalverebbe" da solo) e
  // salta anche se non è cambiato nulla da ultimoSalvato - evita scritture
  // ripetute identiche quando l'utente smette di scrivere.
  useEffect(() => {
    if (!inizializzato.current || titolo.trim() === '') {
      return;
    }
    if (ultimoSalvato.current?.titolo === titolo && ultimoSalvato.current?.contenuto === contenuto) {
      return;
    }
    const timer = setTimeout(() => {
      aggiorna.mutate({ id, titolo, contenuto });
      ultimoSalvato.current = { titolo, contenuto };
    }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titolo, contenuto, id]);

  function tornaIndietro() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/personale/note');
    }
  }

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
    const asset = risultato.assets[0];
    aggiungi.mutate({ uri: asset.uri, fileWeb: asset.file, mimeType: asset.mimeType });
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

  const titoloVuoto = titolo.trim() === '';

  if (isLoading || nota === undefined) {
    return (
      <View style={styles.schermo}>
        <View style={[styles.contenuto, { paddingTop: insets.top + 16 }]}>
          <View style={styles.rigaTitolo}>
            <Pressable onPress={tornaIndietro} hitSlop={8}>
              <BloccoDuro offset={2} colore={colori.panna} raggio={10} contenutoStyle={styles.quadrato}>
                <Feather name="arrow-left" size={17} color={colori.scuro} />
              </BloccoDuro>
            </Pressable>
            <Text style={styles.etichettaTestata}>Nota</Text>
          </View>
          <ActivityIndicator color={colori.scuro} style={styles.caricamento} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.schermo} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.contenuto, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
      >
        <View style={styles.rigaTitolo}>
          <Pressable onPress={tornaIndietro} hitSlop={8}>
            <BloccoDuro offset={2} colore={colori.panna} raggio={10} contenutoStyle={styles.quadrato}>
              <Feather name="arrow-left" size={17} color={colori.scuro} />
            </BloccoDuro>
          </Pressable>
          <Text style={styles.etichettaTestata}>Nota</Text>
        </View>

        <TextInput
          style={styles.inputTitolo}
          placeholder="Titolo"
          placeholderTextColor={colori.soft}
          value={titolo}
          onChangeText={setTitolo}
        />

        <View style={styles.rigaChip}>
          <Pressable
            onPress={() => setModalitaAnteprima(false)}
            style={[styles.chip, !modalitaAnteprima && styles.chipAttivo]}
          >
            <Text style={styles.testoChip}>Scrivi</Text>
          </Pressable>
          <Pressable
            onPress={() => setModalitaAnteprima(true)}
            style={[styles.chip, modalitaAnteprima && styles.chipAttivo]}
          >
            <Text style={styles.testoChip}>Anteprima</Text>
          </Pressable>
        </View>

        <View style={styles.editor}>
          {modalitaAnteprima ? (
            <Markdown style={markdownStyle} markdownit={parserMarkdown}>{contenuto}</Markdown>
          ) : (
            <TextInput
              style={styles.inputContenuto}
              placeholder="Scrivi qui la tua nota..."
              placeholderTextColor={colori.soft}
              value={contenuto}
              onChangeText={setContenuto}
              multiline
              textAlignVertical="top"
            />
          )}
        </View>

        {aggiorna.error !== null && (
          <Text style={styles.errore}>{aggiorna.error.message}</Text>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.rigaFoto}>
            {foto.map((f) => (
              <View key={f.id} style={styles.fotoContenitore}>
                <Pressable onPress={() => setFotoAperta(f)}>
                  <Image source={{ uri: f.url }} style={styles.miniatura} />
                </Pressable>
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
                <ActivityIndicator color={colori.scuro} />
              ) : (
                <Text style={styles.piu}>+</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>

        {aggiungi.error !== null && (
          <Text style={styles.errore}>{aggiungi.error.message}</Text>
        )}

        <Text style={styles.statoSalvataggio}>
          {titoloVuoto ? 'Serve un titolo per salvare' : aggiorna.isPending ? 'Salvataggio…' : 'Salvato'}
        </Text>

        <Pressable onPress={confermaEliminaNota} hitSlop={8} style={styles.eliminaNota}>
          <Text style={styles.eliminaNotaTesto}>Elimina nota</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={fotoAperta !== null} transparent animationType="fade" onRequestClose={() => setFotoAperta(null)}>
        <Pressable style={styles.sfondoFoto} onPress={() => setFotoAperta(null)}>
          {fotoAperta !== null && (
            <Image source={{ uri: fotoAperta.url }} style={styles.fotoIntera} resizeMode="contain" />
          )}
          <Pressable
            onPress={() => setFotoAperta(null)}
            hitSlop={12}
            style={[styles.chiudiFoto, { top: insets.top + 16 }]}
          >
            <Feather name="x" size={20} color="#fff" />
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const markdownStyle = {
  body: { color: colori.scuro },
};

// typographer: false evita che virgolette/puntini vengano silenziosamente
// "corretti" (il testo salvato non deve mai differire da quello digitato);
// breaks: true preserva i ritorni a capo singoli, come in un editor di note.
const parserMarkdown = MarkdownIt({ typographer: false, breaks: true });

const styles = StyleSheet.create({
  schermo: {
    flex: 1,
    backgroundColor: colori.crema,
  },
  contenuto: {
    paddingHorizontal: 16,
    gap: 14,
  },
  caricamento: {
    marginTop: 40,
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
  etichettaTestata: {
    ...pesi.extraBold,
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: colori.soft,
  },
  inputTitolo: {
    ...pesi.extraBold,
    fontSize: 17,
    color: colori.scuro,
    borderWidth: 2.5,
    borderColor: colori.scuro,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 13,
    backgroundColor: colori.panna,
  },
  rigaChip: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 7,
  },
  chip: {
    borderWidth: 2,
    borderColor: colori.scuro,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: colori.panna,
  },
  chipAttivo: {
    backgroundColor: colori.viola,
  },
  testoChip: {
    ...pesi.extraBold,
    fontSize: 11,
    color: colori.scuro,
  },
  editor: {
    minHeight: 200,
    borderWidth: 2.5,
    borderColor: colori.scuro,
    borderRadius: 14,
    backgroundColor: colori.panna,
    padding: 12,
  },
  inputContenuto: {
    flex: 1,
    fontSize: 15,
    color: colori.scuro,
  },
  errore: {
    color: colori.corallo,
    fontSize: 13,
  },
  rigaFoto: {
    flexDirection: 'row',
    gap: 10,
  },
  fotoContenitore: {
    alignItems: 'center',
    gap: 4,
  },
  miniatura: {
    width: 72,
    height: 72,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colori.scuro,
  },
  eliminaFoto: {
    ...pesi.bold,
    color: colori.corallo,
    fontSize: 11,
  },
  tileAggiungi: {
    width: 72,
    height: 72,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colori.scuro,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileAggiungiDisabilitata: {
    opacity: 0.5,
  },
  piu: {
    fontSize: 28,
    color: colori.scuro,
  },
  statoSalvataggio: {
    ...pesi.bold,
    fontSize: 11.5,
    color: colori.soft,
    textAlign: 'center',
  },
  eliminaNota: {
    alignSelf: 'center',
  },
  eliminaNotaTesto: {
    ...pesi.bold,
    color: colori.corallo,
    fontSize: 14,
  },
  sfondoFoto: {
    flex: 1,
    backgroundColor: 'rgba(22,20,18,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fotoIntera: {
    width: '92%',
    height: '80%',
  },
  chiudiFoto: {
    position: 'absolute',
    right: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
