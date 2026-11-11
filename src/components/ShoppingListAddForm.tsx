import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { BloccoDuro } from '@/components/BloccoDuro';
import { coloriNB as colori, pesiNB as pesi } from '@/theme/neoBrutalista';

type Props = {
  /** Nome (obbligatorio) e nota (opzionale, già pulita: null se vuota). */
  onAggiungi: (nome: string, nota: string | null) => void;
};

/**
 * Form "aggiungi articolo": stessa validazione di prima (nome vuoto =
 * niente da aggiungere), la nota è opzionale e nascosta finché non la si
 * apre esplicitamente.
 */
export function ShoppingListAddForm({ onAggiungi }: Props) {
  const [nome, setNome] = useState('');
  const [nota, setNota] = useState('');
  const [notaVisibile, setNotaVisibile] = useState(false);

  const nomePulito = nome.trim();
  const puoAggiungere = nomePulito !== '';

  function conferma() {
    if (!puoAggiungere) {
      return;
    }
    onAggiungi(nomePulito, nota.trim() === '' ? null : nota.trim());
    setNome('');
    setNota('');
    setNotaVisibile(false);
  }

  return (
    <View style={styles.contenitore}>
      <View style={styles.rigaInput}>
        <TextInput
          style={styles.input}
          placeholder="Aggiungi un articolo"
          placeholderTextColor={colori.soft}
          value={nome}
          onChangeText={setNome}
          onSubmitEditing={conferma}
          returnKeyType={notaVisibile ? 'next' : 'done'}
        />
        <BloccoDuro
          style={[styles.cellaAggiungi, !puoAggiungere && styles.cellaAggiungiDisabilitata]}
          offset={2.5}
          colore={colori.corallo}
          raggio={11}
          contenutoStyle={styles.bottoneAggiungi}
          onPress={puoAggiungere ? conferma : undefined}
        >
          <Feather name="plus" size={20} color="#fff" />
        </BloccoDuro>
      </View>

      {notaVisibile ? (
        <TextInput
          style={styles.inputNota}
          placeholder="Nota (es. la marca)"
          placeholderTextColor={colori.soft}
          value={nota}
          onChangeText={setNota}
          onSubmitEditing={conferma}
          returnKeyType="done"
          autoFocus
        />
      ) : (
        <Pressable onPress={() => setNotaVisibile(true)} hitSlop={8} style={styles.linkNota}>
          <Feather name="plus-circle" size={13} color={colori.viola} />
          <Text style={styles.testoLinkNota}>Aggiungi una nota</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenitore: {
    gap: 8,
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
  cellaAggiungi: {
    width: 42,
    height: 42,
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
  inputNota: {
    borderWidth: 2,
    borderColor: colori.scuro,
    borderRadius: 11,
    backgroundColor: colori.panna,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: colori.scuro,
  },
  linkNota: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
  },
  testoLinkNota: {
    ...pesi.bold,
    fontSize: 12,
    color: colori.viola,
  },
});
