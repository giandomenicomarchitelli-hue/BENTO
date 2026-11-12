import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { BloccoDuro } from '@/components/BloccoDuro';
import { confermaAzione } from '@/lib/conferma';
import { euroInCentesimi, formattaEuro } from '@/lib/formato';
import { coloriNB as colori, pesiNB as pesi } from '@/theme/neoBrutalista';

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
            placeholderTextColor={colori.soft}
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
            placeholderTextColor={colori.soft}
            value={bozzaNote}
            onChangeText={setBozzaNote}
          />
        ) : (
          <Text style={styles.valore}>{note !== null && note !== '' ? note : 'Nessuna nota'}</Text>
        )}
      </View>

      {modificando ? (
        <>
          <BloccoDuro
            style={salvando && styles.bottoneDisabilitato}
            offset={2.5}
            colore={colori.menta}
            raggio={12}
            contenutoStyle={styles.bottonePieno}
            onPress={salvando ? undefined : salvaModifiche}
          >
            {salvando ? (
              <ActivityIndicator color={colori.scuro} />
            ) : (
              <Text style={styles.testoBottonePieno}>Salva modifiche</Text>
            )}
          </BloccoDuro>
          <Pressable
            style={styles.bottoneAnnullaAcquisto}
            onPress={annullaAcquisto}
            disabled={annullando}
          >
            {annullando ? (
              <ActivityIndicator color={colori.corallo} />
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
  valore: {
    ...pesi.bold,
    fontSize: 16,
    color: colori.scuro,
  },
  notaPrezzo: {
    ...pesi.semiBold,
    fontSize: 12,
    color: colori.soft,
    marginTop: 2,
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
  bottoneAnnullaAcquisto: {
    borderWidth: 2,
    borderColor: colori.corallo,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  testoAnnullaAcquisto: {
    ...pesi.extraBold,
    fontSize: 13,
    color: colori.corallo,
  },
  linkModifica: {
    textAlign: 'center',
    ...pesi.extraBold,
    fontSize: 12.5,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: colori.soft,
    marginTop: 8,
  },
});
