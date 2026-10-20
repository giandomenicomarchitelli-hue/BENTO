import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

type Props = {
  nome: string;
  note: string | null;
  salvando: boolean;
  onSalva: (nome: string, note: string | null) => void;
};

export function ModificaArticoloDaComprare({ nome, note, salvando, onSalva }: Props) {
  const [bozzaNome, setBozzaNome] = useState(nome);
  const [bozzaNote, setBozzaNote] = useState(note ?? '');

  const invariato = bozzaNome.trim() === nome && (bozzaNote.trim() || null) === note;

  return (
    <View style={styles.contenitore}>
      <Text style={styles.titolo}>Modifica articolo</Text>

      <View style={styles.campo}>
        <Text style={styles.etichetta}>Nome</Text>
        <TextInput
          style={styles.input}
          value={bozzaNome}
          onChangeText={setBozzaNome}
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
        style={[styles.bottone, (invariato || bozzaNome.trim() === '') && styles.bottoneDisabilitato]}
        onPress={() => {
          const nomeFinale = bozzaNome.trim();
          if (nomeFinale === '' || salvando) return;
          onSalva(nomeFinale, bozzaNote.trim() === '' ? null : bozzaNote.trim());
        }}
        disabled={invariato || bozzaNome.trim() === '' || salvando}
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
