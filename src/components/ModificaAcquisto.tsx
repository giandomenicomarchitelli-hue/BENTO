import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { confermaAzione } from '@/lib/conferma';
import { euroInCentesimi, formattaEuro } from '@/lib/formato';

type Props = {
  nome: string;
  prezzoCentesimi: number | null;
  note: string | null;
  salvando: boolean;
  annullando: boolean;
  onSalva: (prezzoCentesimi: number | null, note: string | null) => void;
  onAnnullaAcquisto: () => void;
};

/**
 * Dettaglio di un acquisto già fatto (articolo della lista della spesa, o
 * voce di una lista "con prezzi"): prezzo e note sono bloccati finché non
 * si tocca "Modifica", per evitare modifiche per sbaglio durante la
 * normale consultazione.
 */
export function ModificaAcquisto({
  nome,
  prezzoCentesimi,
  note,
  salvando,
  annullando,
  onSalva,
  onAnnullaAcquisto,
}: Props) {
  const [modificando, setModificando] = useState(false);
  const [bozzaPrezzo, setBozzaPrezzo] = useState(
    prezzoCentesimi !== null ? String(prezzoCentesimi / 100).replace('.', ',') : ''
  );
  const [bozzaNote, setBozzaNote] = useState(note ?? '');

  function apriModifica() {
    setBozzaPrezzo(prezzoCentesimi !== null ? String(prezzoCentesimi / 100).replace('.', ',') : '');
    setBozzaNote(note ?? '');
    setModificando(true);
  }

  function salvaModifiche() {
    const nuovoPrezzo = euroInCentesimi(bozzaPrezzo);
    onSalva(nuovoPrezzo, bozzaNote.trim() === '' ? null : bozzaNote.trim());
    setModificando(false);
  }

  async function annullaAcquisto() {
    const conferma = await confermaAzione(
      'Annullare l’acquisto?',
      `"${nome}" tornerà tra gli articoli da comprare. Prezzo e note andranno persi. Se hai registrato una spesa per questo acquisto, annullarlo qui non la annulla: resterà comunque nei saldi del gruppo.`,
      'Annulla acquisto'
    );
    if (conferma) {
      onAnnullaAcquisto();
    }
  }

  return (
    <View style={styles.contenitore}>
      <Text style={styles.nome}>{nome}</Text>

      <View style={styles.campo}>
        <Text style={styles.etichetta}>Prezzo</Text>
        {modificando ? (
          <TextInput
            style={styles.input}
            placeholder="Es. 12,50"
            keyboardType="decimal-pad"
            value={bozzaPrezzo}
            onChangeText={setBozzaPrezzo}
          />
        ) : (
          <Text style={styles.valore}>
            {prezzoCentesimi !== null ? formattaEuro(prezzoCentesimi) : 'Non segnato'}
          </Text>
        )}
        <Text style={styles.notaPrezzo}>
          Modificare questo importo non modifica le spese già registrate.
        </Text>
      </View>

      <View style={styles.campo}>
        <Text style={styles.etichetta}>Note</Text>
        {modificando ? (
          <TextInput
            style={styles.input}
            placeholder="Es. la marca"
            value={bozzaNote}
            onChangeText={setBozzaNote}
          />
        ) : (
          <Text style={styles.valore}>{note !== null && note !== '' ? note : 'Nessuna nota'}</Text>
        )}
      </View>

      {modificando ? (
        <>
          <Pressable style={styles.bottone} onPress={salvaModifiche} disabled={salvando}>
            {salvando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.testoBottone}>Salva modifiche</Text>
            )}
          </Pressable>
          <Pressable
            style={styles.bottoneAnnullaAcquisto}
            onPress={annullaAcquisto}
            disabled={annullando}
          >
            {annullando ? (
              <ActivityIndicator color="#c0392b" />
            ) : (
              <Text style={styles.testoAnnullaAcquisto}>Annulla acquisto</Text>
            )}
          </Pressable>
        </>
      ) : (
        <Pressable onPress={apriModifica} hitSlop={8}>
          <Text style={styles.linkModifica}>Modifica</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenitore: {
    padding: 24,
    gap: 16,
  },
  nome: {
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
  valore: {
    fontSize: 17,
  },
  notaPrezzo: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
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
  testoBottone: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottoneAnnullaAcquisto: {
    borderWidth: 1,
    borderColor: '#c0392b',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  testoAnnullaAcquisto: {
    color: '#c0392b',
    fontSize: 15,
    fontWeight: '600',
  },
  linkModifica: {
    textAlign: 'center',
    color: '#2d6cdf',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 8,
  },
});
