import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import type { Frequenza } from '@/api/faccende';
import type { MembroRisolvibile } from '@/calcolo/risoluzioneAzioni';
import { bento, raggio, spaziatura, tipografia } from '@/theme/tokens';

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
  salvando: boolean;
  onSalva: (valori: ValoriImpegno) => void;
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
export function ModificaImpegno({ valoriIniziali, membri, salvando, onSalva }: Props) {
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
    <View style={styles.contenitore}>
      <Text style={styles.titolo}>{valoriIniziali === null ? 'Nuovo impegno' : 'Modifica impegno'}</Text>

      <View style={styles.campo}>
        <Text style={styles.etichetta}>Titolo</Text>
        <TextInput
          style={styles.input}
          value={titolo}
          onChangeText={setTitolo}
          placeholder="Es. Dentista"
          placeholderTextColor={bento.testoMuto}
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
          placeholderTextColor={bento.testoMuto}
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
          placeholderTextColor={bento.testoMuto}
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
            placeholderTextColor={bento.testoMuto}
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
              <Text style={[styles.testoChip, frequenza === f.valore && styles.testoChipAttivo]}>
                {f.etichetta}
              </Text>
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
            placeholderTextColor={bento.testoMuto}
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
              <Text style={[styles.testoChip, promemoriaMinutiPrima === p.valore && styles.testoChipAttivo]}>
                {p.etichetta}
              </Text>
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
            <Text style={[styles.testoChip, assegnatoA === null && styles.testoChipAttivo]}>Nessuno</Text>
          </Pressable>
          {membri.map((membro) => (
            <Pressable
              key={membro.id}
              onPress={() => setAssegnatoA(membro.id)}
              style={[styles.chip, assegnatoA === membro.id && styles.chipAttivo]}
            >
              <Text style={[styles.testoChip, assegnatoA === membro.id && styles.testoChipAttivo]}>
                {membro.nome}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.rigaSwitch}>
        <Text style={styles.etichetta}>Modificabile da chiunque nel gruppo</Text>
        <Switch value={modificabileDaTutti} onValueChange={setModificabileDaTutti} />
      </View>

      <Pressable
        style={[styles.bottone, (titoloVuoto || salvando) && styles.bottoneDisabilitato]}
        onPress={salva}
        disabled={titoloVuoto || salvando}
      >
        {salvando ? <ActivityIndicator color="#fff" /> : <Text style={styles.testoBottone}>Salva</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  contenitore: {
    padding: spaziatura.xl,
    gap: spaziatura.lg,
  },
  titolo: {
    ...tipografia.titoloSezione,
    textAlign: 'center',
    color: bento.testoPrimario,
    marginBottom: spaziatura.xs,
  },
  campo: {
    gap: spaziatura.xs,
  },
  etichetta: {
    ...tipografia.etichetta,
    color: bento.testoSecondario,
  },
  input: {
    borderWidth: 1,
    borderColor: bento.bordoForte,
    borderRadius: raggio.sm,
    paddingHorizontal: spaziatura.md,
    paddingVertical: spaziatura.sm + 2,
    fontSize: 16,
    color: bento.testoPrimario,
  },
  inputConErrore: {
    borderColor: '#c0392b',
  },
  testoErrore: {
    fontSize: 12,
    color: '#c0392b',
  },
  rigaSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spaziatura.md,
  },
  rigaChip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spaziatura.sm,
  },
  chip: {
    borderWidth: 1,
    borderColor: bento.bordoForte,
    borderRadius: raggio.pillola,
    paddingHorizontal: spaziatura.md,
    paddingVertical: spaziatura.sm,
  },
  chipAttivo: {
    backgroundColor: '#2d6cdf',
    borderColor: '#2d6cdf',
  },
  testoChip: {
    fontSize: 13,
    fontWeight: '600',
    color: bento.testoSecondario,
  },
  testoChipAttivo: {
    color: '#fff',
  },
  bottone: {
    backgroundColor: '#2d6cdf',
    borderRadius: raggio.sm,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spaziatura.sm,
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
