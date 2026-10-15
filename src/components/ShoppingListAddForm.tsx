import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { GlassCard } from '@/components/GlassCard';
import { accenti, bento, raggio, spaziatura } from '@/theme/tokens';

type Props = {
  /** Nome (obbligatorio) e nota (opzionale, già pulita: null se vuota). */
  onAggiungi: (nome: string, nota: string | null) => void;
};

/**
 * Form "aggiungi articolo" in stile Hybrid Liquid Glass. Stessa validazione
 * di prima (nome vuoto = niente da aggiungere): qui si limita a disabilitare
 * visivamente il bottone, la guardia vera resta comunque in
 * lista-spesa.tsx/aggiungiArticoloAllaLista. La nota è opzionale e
 * nascosta finché non la si apre esplicitamente, per non occupare spazio
 * quando non serve.
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
    <GlassCard style={styles.card}>
      <View style={styles.rigaInput}>
        <TextInput
          style={styles.input}
          placeholder="Aggiungi un articolo"
          placeholderTextColor={bento.testoMuto}
          value={nome}
          onChangeText={setNome}
          onSubmitEditing={conferma}
          returnKeyType={notaVisibile ? 'next' : 'done'}
        />
        <Pressable
          onPress={conferma}
          disabled={!puoAggiungere}
          style={[styles.bottoneAggiungi, !puoAggiungere && styles.bottoneDisabilitato]}
        >
          <Feather name="plus" size={22} color="#fff" />
        </Pressable>
      </View>

      {notaVisibile ? (
        <TextInput
          style={styles.inputNota}
          placeholder="Nota (es. la marca)"
          placeholderTextColor={bento.testoMuto}
          value={nota}
          onChangeText={setNota}
          onSubmitEditing={conferma}
          returnKeyType="done"
          autoFocus
        />
      ) : (
        <Pressable onPress={() => setNotaVisibile(true)} hitSlop={8} style={styles.linkNota}>
          <Feather name="plus-circle" size={14} color={accenti.viola} />
          <Text style={styles.testoLinkNota}>Aggiungi una nota</Text>
        </Pressable>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
  },
  rigaInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spaziatura.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: bento.testoPrimario,
    paddingVertical: 10,
  },
  inputNota: {
    marginTop: spaziatura.sm,
    fontSize: 14,
    color: bento.testoPrimario,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: bento.sfondoAlt,
    borderRadius: raggio.sm,
  },
  bottoneAggiungi: {
    width: 40,
    height: 40,
    borderRadius: raggio.sm,
    backgroundColor: accenti.ciano,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottoneDisabilitato: {
    opacity: 0.4,
  },
  linkNota: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spaziatura.sm,
    alignSelf: 'flex-start',
  },
  testoLinkNota: {
    fontSize: 13,
    fontWeight: '600',
    color: accenti.viola,
  },
});
