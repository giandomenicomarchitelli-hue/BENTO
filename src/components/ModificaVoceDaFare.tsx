import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';

import { BloccoDuro } from '@/components/BloccoDuro';
import { coloriNB as colori, pesiNB as pesi } from '@/theme/neoBrutalista';

type Props = {
  testo: string;
  note: string | null;
  salvando: boolean;
  onSalva: (testo: string, note: string | null) => void;
};

/** Form di modifica per un articolo non ancora acquistato: nome e note. */
export function ModificaVoceDaFare({ testo, note, salvando, onSalva }: Props) {
  const [bozzaTesto, setBozzaTesto] = useState(testo);
  const [bozzaNote, setBozzaNote] = useState(note ?? '');

  const invariato = bozzaTesto.trim() === testo && (bozzaNote.trim() || null) === note;

  return (
    <View style={styles.contenitore}>
      <Text style={styles.titolo}>Modifica articolo</Text>

      <View style={styles.campo}>
        <Text style={styles.etichetta}>Nome</Text>
        <TextInput
          style={styles.input}
          value={bozzaTesto}
          onChangeText={setBozzaTesto}
          placeholder="Nome articolo"
          placeholderTextColor={colori.soft}
          autoFocus
          returnKeyType="next"
        />
      </View>

      <View style={styles.campo}>
        <Text style={styles.etichetta}>Note (opzionale)</Text>
        <TextInput
          style={styles.input}
          value={bozzaNote}
          onChangeText={setBozzaNote}
          placeholder="Es. la marca, la quantità…"
          placeholderTextColor={colori.soft}
          returnKeyType="done"
        />
      </View>

      <BloccoDuro
        style={(invariato || bozzaTesto.trim() === '' || salvando) && styles.bottoneDisabilitato}
        offset={2.5}
        colore={colori.menta}
        raggio={12}
        contenutoStyle={styles.bottonePieno}
        onPress={
          invariato || bozzaTesto.trim() === '' || salvando
            ? undefined
            : () => onSalva(bozzaTesto.trim(), bozzaNote.trim() === '' ? null : bozzaNote.trim())
        }
      >
        {salvando ? (
          <ActivityIndicator color={colori.scuro} />
        ) : (
          <Text style={styles.testoBottonePieno}>Salva modifiche</Text>
        )}
      </BloccoDuro>
    </View>
  );
}

const styles = StyleSheet.create({
  contenitore: {
    padding: 24,
    gap: 16,
  },
  titolo: {
    ...pesi.extraBold,
    fontSize: 22,
    letterSpacing: -0.4,
    textAlign: 'center',
    color: colori.scuro,
    marginBottom: 8,
  },
  campo: {
    gap: 4,
  },
  etichetta: {
    ...pesi.extraBold,
    fontSize: 12.5,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: colori.soft,
  },
  input: {
    borderWidth: 2,
    borderColor: colori.scuro,
    borderRadius: 11,
    backgroundColor: colori.panna,
    paddingHorizontal: 13,
    paddingVertical: 10,
    ...pesi.semiBold,
    fontSize: 15,
    color: colori.scuro,
  },
  bottoneDisabilitato: {
    opacity: 0.5,
  },
  bottonePieno: {
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  testoBottonePieno: {
    ...pesi.extraBold,
    fontSize: 12,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: colori.scuro,
  },
});
