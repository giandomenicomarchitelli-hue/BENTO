import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

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
          returnKeyType="done"
        />
      </View>

      <Pressable
        style={[styles.bottone, (invariato || bozzaTesto.trim() === '') && styles.bottoneDisabilitato]}
        onPress={() => {
          const testoFinale = bozzaTesto.trim();
          if (testoFinale === '' || salvando) return;
          onSalva(testoFinale, bozzaNote.trim() === '' ? null : bozzaNote.trim());
        }}
        disabled={invariato || bozzaTesto.trim() === '' || salvando}
      >
        {salvando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.testoBottone}>Salva modifiche</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  contenitore: {
    padding: 24,
    gap: 16,
  },
  titolo: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  campo: {
    gap: 4,
  },
  etichetta: {
    fontSize: 13,
    color: '#888',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
  },
  bottone: {
    backgroundColor: '#2d6cdf',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  bottoneDisabilitato: {
    opacity: 0.4,
  },
  testoBottone: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
