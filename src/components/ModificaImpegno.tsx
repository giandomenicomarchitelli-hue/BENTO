import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import type { Frequenza } from '@/api/faccende';
import type { MembroRisolvibile } from '@/calcolo/risoluzioneAzioni';
import { BloccoDuro } from '@/components/BloccoDuro';
import { coloriNB, pesiNB } from '@/theme/neoBrutalista';

export type ValoriImpegno = {
  titolo: string;
  descrizione: string | null;
  dataInizio: string; // YYYY-MM-DD
  ora: string | null; // HH:MM
  frequenza: Frequenza;
  intervalloRicorrenza: number | null;
  promemoriaMinutiPrima: number | null;
  modificabileDaTutti: boolean;
  assegnatoA: string | null;
};

type Props = {
  valoriIniziali: ValoriImpegno | null;
  membri: MembroRisolvibile[];
  // L'assegnatario attuale, solo se non è (più) tra i membri attivi del
  // gruppo: senza questo, l'assegnazione a chi è uscito resta invisibile
  // nel form - né confermabile né cancellabile consapevolmente, solo
  // sovrascrivibile "alla cieca" scegliendo "Nessuno" o un altro membro.
  membroAssegnatoNonAttivo?: MembroRisolvibile | null;
  salvando: boolean;
  onSalva: (valori: ValoriImpegno) => void;
  onAnnulla: () => void;
};

const FREQUENZE: { valore: Frequenza; etichetta: string }[] = [
  { valore: 'una_tantum', etichetta: 'Nessuna' },
  { valore: 'giornaliera', etichetta: 'Giornaliera' },
  { valore: 'settimanale', etichetta: 'Settimanale' },
  { valore: 'mensile', etichetta: 'Mensile' },
  { valore: 'personalizzata', etichetta: 'Personalizzata' },
];

const PRESET_PROMEMORIA: { valore: number | null; etichetta: string }[] = [
  { valore: null, etichetta: 'Nessuno' },
  { valore: 0, etichetta: "All'ora dell'impegno" },
  { valore: 60, etichetta: '1 ora prima' },
  { valore: 1440, etichetta: '1 giorno prima' },
  { valore: 10080, etichetta: '1 settimana prima' },
];

const DATA_INIZIO_VALIDA = /^\d{4}-\d{2}-\d{2}$/;

function dataOggiISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Form di creazione/modifica di un impegno di calendario: stesso pattern "controllato" di ModificaVoceDaFare. */
export function ModificaImpegno({
  valoriIniziali,
  membri,
  membroAssegnatoNonAttivo = null,
  salvando,
  onSalva,
  onAnnulla,
}: Props) {
  const [titolo, setTitolo] = useState(valoriIniziali?.titolo ?? '');
  const [descrizione, setDescrizione] = useState(valoriIniziali?.descrizione ?? '');
  const [dataInizio, setDataInizio] = useState(valoriIniziali?.dataInizio ?? dataOggiISO());
  const [tuttoIlGiorno, setTuttoIlGiorno] = useState(valoriIniziali?.ora == null);
  // Resta in memoria anche quando "tutto il giorno" è attivo, così
  // riattivando l'ora non si perde l'ultimo valore inserito.
  const [bozzaOra, setBozzaOra] = useState(valoriIniziali?.ora ?? '09:00');
  const [frequenza, setFrequenza] = useState<Frequenza>(valoriIniziali?.frequenza ?? 'una_tantum');
  const [intervalloRicorrenza, setIntervalloRicorrenza] = useState(
    String(valoriIniziali?.intervalloRicorrenza ?? 1)
  );
  const [promemoriaMinutiPrima, setPromemoriaMinutiPrima] = useState<number | null>(
    valoriIniziali?.promemoriaMinutiPrima ?? null
  );
  const [modificabileDaTutti, setModificabileDaTutti] = useState(valoriIniziali?.modificabileDaTutti ?? true);
  const [assegnatoA, setAssegnatoA] = useState<string | null>(valoriIniziali?.assegnatoA ?? null);

  const dataInizioValida = DATA_INIZIO_VALIDA.test(dataInizio);
  const titoloVuoto = titolo.trim() === '';

  function salva() {
    if (titoloVuoto || salvando) return;

    const intervalloNum = Number(intervalloRicorrenza);
    onSalva({
      titolo: titolo.trim(),
      descrizione: descrizione.trim() === '' ? null : descrizione.trim(),
      dataInizio,
      ora: tuttoIlGiorno ? null : bozzaOra,
      frequenza,
      intervalloRicorrenza:
        frequenza === 'personalizzata' ? (Number.isInteger(intervalloNum) && intervalloNum > 0 ? intervalloNum : 1) : null,
      promemoriaMinutiPrima,
      modificabileDaTutti,
      assegnatoA,
    });
  }

  return (
    <BloccoDuro offset={3} colore={coloriNB.panna} raggio={16} contenutoStyle={styles.contenitore}>
      <Text style={styles.titolo}>{valoriIniziali === null ? 'Nuovo impegno' : 'Modifica impegno'}</Text>

      <View style={styles.campo}>
        <Text style={styles.etichetta}>Titolo</Text>
        <TextInput
          style={styles.input}
          value={titolo}
          onChangeText={setTitolo}
          placeholder="Es. Dentista"
          placeholderTextColor={coloriNB.soft}
          autoFocus
          returnKeyType="next"
        />
      </View>

      <View style={styles.campo}>
        <Text style={styles.etichetta}>Descrizione (opzionale)</Text>
        <TextInput
          style={styles.input}
          value={descrizione}
          onChangeText={setDescrizione}
          placeholder="Es. portare i documenti"
          placeholderTextColor={coloriNB.soft}
          returnKeyType="next"
        />
      </View>

      <View style={styles.campo}>
        <Text style={styles.etichetta}>Data inizio (AAAA-MM-GG)</Text>
        <TextInput
          style={[styles.input, !dataInizioValida && styles.inputConErrore]}
          value={dataInizio}
          onChangeText={setDataInizio}
          placeholder="2026-10-27"
          placeholderTextColor={coloriNB.soft}
          keyboardType="numbers-and-punctuation"
        />
        {!dataInizioValida && <Text style={styles.testoErrore}>Formato: AAAA-MM-GG</Text>}
      </View>

      <View style={styles.rigaSwitch}>
        <Text style={styles.etichetta}>Tutto il giorno</Text>
        <Switch value={tuttoIlGiorno} onValueChange={setTuttoIlGiorno} />
      </View>

      {!tuttoIlGiorno && (
        <View style={styles.campo}>
          <Text style={styles.etichetta}>Ora (HH:MM)</Text>
          <TextInput
            style={styles.input}
            value={bozzaOra}
            onChangeText={setBozzaOra}
            placeholder="09:00"
            placeholderTextColor={coloriNB.soft}
            keyboardType="numbers-and-punctuation"
          />
        </View>
      )}

      <View style={styles.campo}>
        <Text style={styles.etichetta}>Ricorrenza</Text>
        <View style={styles.rigaChip}>
          {FREQUENZE.map((f) => (
            <Pressable
              key={f.valore}
              onPress={() => setFrequenza(f.valore)}
              style={[styles.chip, frequenza === f.valore && styles.chipAttivo]}
            >
              <Text style={styles.testoChip}>{f.etichetta}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {frequenza === 'personalizzata' && (
        <View style={styles.campo}>
          <Text style={styles.etichetta}>Ogni quanti giorni</Text>
          <TextInput
            style={styles.input}
            value={intervalloRicorrenza}
            onChangeText={setIntervalloRicorrenza}
            placeholder="Es. 3"
            placeholderTextColor={coloriNB.soft}
            keyboardType="number-pad"
          />
        </View>
      )}

      <View style={styles.campo}>
        <Text style={styles.etichetta}>Promemoria</Text>
        <View style={styles.rigaChip}>
          {PRESET_PROMEMORIA.map((p) => (
            <Pressable
              key={p.etichetta}
              onPress={() => setPromemoriaMinutiPrima(p.valore)}
              style={[styles.chip, promemoriaMinutiPrima === p.valore && styles.chipAttivo]}
            >
              <Text style={styles.testoChip}>{p.etichetta}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.campo}>
        <Text style={styles.etichetta}>Assegnato a</Text>
        <View style={styles.rigaChip}>
          <Pressable
            onPress={() => setAssegnatoA(null)}
            style={[styles.chip, assegnatoA === null && styles.chipAttivo]}
          >
            <Text style={styles.testoChip}>Nessuno</Text>
          </Pressable>
          {membri.map((membro) => (
            <Pressable
              key={membro.id}
              onPress={() => setAssegnatoA(membro.id)}
              style={[styles.chip, assegnatoA === membro.id && styles.chipAttivo]}
            >
              <Text style={styles.testoChip}>{membro.nome}</Text>
            </Pressable>
          ))}
          {membroAssegnatoNonAttivo !== null && assegnatoA === membroAssegnatoNonAttivo.id && (
            <Pressable
              onPress={() => setAssegnatoA(membroAssegnatoNonAttivo.id)}
              style={[styles.chip, styles.chipAttivo]}
            >
              <Text style={styles.testoChip}>{membroAssegnatoNonAttivo.nome} (non più nel gruppo)</Text>
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.rigaSwitch}>
        <Text style={styles.etichetta}>Modificabile da chiunque nel gruppo</Text>
        <Switch value={modificabileDaTutti} onValueChange={setModificabileDaTutti} />
      </View>

      <View style={styles.barraSalva}>
        <Pressable style={[styles.bottone, styles.bottoneAnnulla]} onPress={onAnnulla}>
          <Text style={styles.testoBottoneAnnulla}>Annulla</Text>
        </Pressable>
        <BloccoDuro
          style={[styles.cellaSalva, (titoloVuoto || salvando) && styles.cellaSalvaDisabilitata]}
          offset={2.5}
          colore={coloriNB.corallo}
          raggio={10}
          contenutoStyle={styles.bottoneSalva}
          onPress={titoloVuoto || salvando ? undefined : salva}
        >
          {salvando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.testoBottoneSalva}>Salva</Text>
          )}
        </BloccoDuro>
      </View>
    </BloccoDuro>
  );
}

const styles = StyleSheet.create({
  contenitore: {
    padding: 14,
    gap: 12,
  },
  titolo: {
    ...pesiNB.extraBold,
    fontSize: 15,
    textAlign: 'center',
    color: coloriNB.scuro,
  },
  campo: {
    gap: 5,
  },
  etichetta: {
    ...pesiNB.extraBold,
    fontSize: 8.8,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: coloriNB.soft,
  },
  input: {
    borderWidth: 2,
    borderColor: coloriNB.scuro,
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 9,
    fontSize: 14.5,
    fontWeight: '600',
    color: coloriNB.scuro,
    backgroundColor: '#fff',
  },
  inputConErrore: {
    borderColor: coloriNB.corallo,
  },
  testoErrore: {
    ...pesiNB.bold,
    fontSize: 11,
    color: coloriNB.corallo,
  },
  rigaSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  rigaChip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  chip: {
    borderWidth: 2,
    borderColor: coloriNB.scuro,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  chipAttivo: {
    backgroundColor: coloriNB.viola,
  },
  testoChip: {
    ...pesiNB.extraBold,
    fontSize: 10.5,
    color: coloriNB.scuro,
  },
  barraSalva: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 2,
  },
  bottone: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottoneAnnulla: {
    backgroundColor: '#fff',
    borderWidth: 2.5,
    borderColor: coloriNB.scuro,
  },
  testoBottoneAnnulla: {
    ...pesiNB.extraBold,
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: coloriNB.scuro,
  },
  cellaSalva: {
    flex: 1,
  },
  cellaSalvaDisabilitata: {
    opacity: 0.4,
  },
  bottoneSalva: {
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testoBottoneSalva: {
    ...pesiNB.extraBold,
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: '#fff',
  },
});
