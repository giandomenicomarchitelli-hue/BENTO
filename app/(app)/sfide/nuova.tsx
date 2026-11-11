import { Feather } from '@expo/vector-icons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { campoNumericoSicuro as due, dataSicura } from '@/calcolo/campiData';
import { deduciCategoria, generaDomanda } from '@/calcolo/domandaSfida';
import { formattaConGiorno, risolviQuando, type EsitoDatazione, type SceltaQuando } from '@/calcolo/datazioneSfida';
import { generaIdRichiesta } from '@/calcolo/identificativi';
import { dataLocaleISO } from '@/calcolo/ricorrenzaFaccende';
import { BloccoDuro } from '@/components/BloccoDuro';
import { useListe } from '@/hooks/useListe';
import { useSfide } from '@/hooks/useSfide';
import { useVociLista } from '@/hooks/useVociLista';
import { useGruppoAttivoStore } from '@/store/gruppoAttivoStore';
import { coloriNB as colori, pesiNB as pesi } from '@/theme/neoBrutalista';

const FUSO_ORARIO = 'Europe/Rome';

type ValoreRapido =
  | 'oggi'
  | 'stasera'
  | 'domani'
  | 'domani_sera'
  | 'venerdi'
  | 'sabato'
  | 'domenica'
  | 'questo_weekend'
  | 'prossimo_weekend';

const SCELTE_RAPIDE: { etichetta: string; valore: ValoreRapido }[] = [
  { etichetta: 'Oggi', valore: 'oggi' },
  { etichetta: 'Stasera', valore: 'stasera' },
  { etichetta: 'Domani', valore: 'domani' },
  { etichetta: 'Domani sera', valore: 'domani_sera' },
  { etichetta: 'Venerdì', valore: 'venerdi' },
  { etichetta: 'Sabato', valore: 'sabato' },
  { etichetta: 'Domenica', valore: 'domenica' },
  { etichetta: 'Questo weekend', valore: 'questo_weekend' },
  { etichetta: 'Prossimo weekend', valore: 'prossimo_weekend' },
];

const SCADENZE_RAPIDE: { etichetta: string; minuti: 30 | 60 | 120 | 1440 }[] = [
  { etichetta: '30 min', minuti: 30 },
  { etichetta: '1 ora', minuti: 60 },
  { etichetta: '2 ore', minuti: 120 },
  { etichetta: '24 ore', minuti: 1440 },
];

/** Campo manuale gg/mm/aaaa(/hh/min), senza alcuna libreria di calendario: nessuna nuova dipendenza UI. */
function CampoDataOra({
  conOrario,
  gg,
  mm,
  aaaa,
  hh,
  min,
  onCambiaGg,
  onCambiaMm,
  onCambiaAaaa,
  onCambiaHh,
  onCambiaMin,
}: {
  conOrario: boolean;
  gg: string;
  mm: string;
  aaaa: string;
  hh: string;
  min: string;
  onCambiaGg: (v: string) => void;
  onCambiaMm: (v: string) => void;
  onCambiaAaaa: (v: string) => void;
  onCambiaHh: (v: string) => void;
  onCambiaMin: (v: string) => void;
}) {
  return (
    <View style={styles.rigaDataOra}>
      <TextInput
        style={[styles.inputData, styles.inputGiorno]}
        placeholder="GG"
        placeholderTextColor={colori.soft}
        keyboardType="number-pad"
        value={gg}
        onChangeText={onCambiaGg}
        maxLength={2}
      />
      <Text style={styles.separatoreData}>/</Text>
      <TextInput
        style={[styles.inputData, styles.inputGiorno]}
        placeholder="MM"
        placeholderTextColor={colori.soft}
        keyboardType="number-pad"
        value={mm}
        onChangeText={onCambiaMm}
        maxLength={2}
      />
      <Text style={styles.separatoreData}>/</Text>
      <TextInput
        style={[styles.inputData, styles.inputAnno]}
        placeholder="AAAA"
        placeholderTextColor={colori.soft}
        keyboardType="number-pad"
        value={aaaa}
        onChangeText={onCambiaAaaa}
        maxLength={4}
      />
      {conOrario && (
        <>
          <TextInput
            style={[styles.inputData, styles.inputGiorno, styles.inputOra]}
            placeholder="HH"
            placeholderTextColor={colori.soft}
            keyboardType="number-pad"
            value={hh}
            onChangeText={onCambiaHh}
            maxLength={2}
          />
          <Text style={styles.separatoreData}>:</Text>
          <TextInput
            style={[styles.inputData, styles.inputGiorno]}
            placeholder="MM"
            placeholderTextColor={colori.soft}
            keyboardType="number-pad"
            value={min}
            onChangeText={onCambiaMin}
            maxLength={2}
          />
        </>
      )}
    </View>
  );
}

/** Ora/minuti correnti nel fuso fisso Europe/Rome, non in quello del dispositivo. */
function oraLocale(data: Date, fusoOrario: string): { ore: string; minuti: string } {
  const parti = new Intl.DateTimeFormat('it-IT', {
    timeZone: fusoOrario,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(data);
  return {
    ore: parti.find((p) => p.type === 'hour')?.value ?? '12',
    minuti: parti.find((p) => p.type === 'minute')?.value ?? '00',
  };
}

/** Messaggio leggibile da un errore di rete/Supabase, senza assumere una forma precisa. */
function messaggioErrore(errore: unknown): string {
  if (errore instanceof Error && errore.message.trim() !== '') {
    return errore.message;
  }
  return 'Qualcosa è andato storto. Riprova.';
}

export default function NuovaSfida() {
  const gruppoAttivoId = useGruppoAttivoStore((stato) => stato.gruppoAttivoId);

  if (gruppoAttivoId === null) {
    return <Redirect href="/gruppi" />;
  }

  return <NuovaSfidaDelGruppo gruppoAttivoId={gruppoAttivoId} />;
}

function NuovaSfidaDelGruppo({ gruppoAttivoId }: { gruppoAttivoId: string }) {
  const insets = useSafeAreaInsets();
  const { listaId } = useLocalSearchParams<{ listaId: string }>();
  const { liste } = useListe(gruppoAttivoId);
  const { voci, isLoading: vociInCaricamento } = useVociLista(listaId ?? null);
  const { crea } = useSfide(gruppoAttivoId);

  const lista = liste.find((l) => l.id === listaId);

  // Stabili per tutta la sessione del form (mai ricalcolati ad ogni render):
  // "adesso" fissa il riferimento temporale per generare la domanda, e
  // richiestaId permette a crea_sfida di restare idempotente su un retry.
  const [adesso] = useState(() => new Date());
  const [richiestaId] = useState(() => generaIdRichiesta());

  // --- 1. Quando ---
  // "Oggi"/l'ora corrente nel fuso fisso Europe/Rome, non in quello del
  // dispositivo (stesso principio delle scelte rapide): evita un giorno/ora
  // di pre-compilazione sbagliato per chi apre l'app da un altro fuso.
  const oggiISO = dataLocaleISO(adesso, FUSO_ORARIO);
  const [annoOggi, meseOggi, giornoOggi] = oggiISO.split('-');
  const oraAttuale = oraLocale(adesso, FUSO_ORARIO);

  const [modoQuando, setModoQuando] = useState<'rapida' | 'data' | 'data_ora'>('rapida');
  const [valoreRapido, setValoreRapido] = useState<ValoreRapido>('oggi');
  const [ggQuando, setGgQuando] = useState(giornoOggi);
  const [mmQuando, setMmQuando] = useState(meseOggi);
  const [aaaaQuando, setAaaaQuando] = useState(annoOggi);
  const [hhQuando, setHhQuando] = useState(oraAttuale.ore);
  const [minQuando, setMinQuando] = useState(oraAttuale.minuti);

  const quando: SceltaQuando = useMemo(() => {
    if (modoQuando === 'rapida') {
      return { tipo: 'rapida', valore: valoreRapido };
    }
    const dataISO = `${due(aaaaQuando, Number(annoOggi), 1970, 9999).padStart(4, '0').slice(-4)}-${due(mmQuando, Number(meseOggi), 1, 12)}-${due(ggQuando, Number(giornoOggi), 1, 31)}`;
    if (modoQuando === 'data') {
      return { tipo: 'data', dataISO };
    }
    return {
      tipo: 'data_ora',
      dataOraISO: `${dataISO}T${due(hhQuando, 12, 0, 23)}:${due(minQuando, 0, 0, 59)}`,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modoQuando, valoreRapido, ggQuando, mmQuando, aaaaQuando, hhQuando, minQuando]);

  const esitoQuando: EsitoDatazione = risolviQuando(quando, adesso, FUSO_ORARIO);

  // --- 2. Domanda proposta, derivata finché non viene toccata a mano ---
  const categoria = deduciCategoria(lista?.nome ?? '');
  const domandaGenerata = generaDomanda(categoria, esitoQuando, adesso, FUSO_ORARIO);
  const [domandaToccata, setDomandaToccata] = useState(false);
  const [domandaManuale, setDomandaManuale] = useState('');
  const domanda = domandaToccata ? domandaManuale : domandaGenerata;

  // --- 3. Opzioni (voci della lista + eventuale proposta personalizzata) ---
  const [opzioniSelezionate, setOpzioniSelezionate] = useState<string[]>([]);
  const [propostaAttiva, setPropostaAttiva] = useState(false);
  const [propostaTesto, setPropostaTesto] = useState('');

  const totaleScelte = opzioniSelezionate.length + (propostaAttiva ? 1 : 0);

  function selezionaVoce(voceId: string) {
    if (opzioniSelezionate.includes(voceId)) {
      setOpzioniSelezionate((prec) => prec.filter((id) => id !== voceId));
      return;
    }
    if (totaleScelte >= 3) {
      return;
    }
    setOpzioniSelezionate((prec) => [...prec, voceId]);
  }

  function alternaProposta() {
    if (propostaAttiva) {
      setPropostaAttiva(false);
      setPropostaTesto('');
      return;
    }
    if (totaleScelte >= 3) {
      return;
    }
    setPropostaAttiva(true);
  }

  // --- 4. Scadenza voto, derivata finché non viene toccata a mano ---
  const [scadenzaToccata, setScadenzaToccata] = useState(false);
  const [minutiScadenza, setMinutiScadenza] = useState<30 | 60 | 120 | 1440>(1440);
  const [modoScadenza, setModoScadenza] = useState<'relativa' | 'data_ora'>('relativa');
  const [ggScadenza, setGgScadenza] = useState(giornoOggi);
  const [mmScadenza, setMmScadenza] = useState(meseOggi);
  const [aaaaScadenza, setAaaaScadenza] = useState(annoOggi);
  const [hhScadenza, setHhScadenza] = useState(oraAttuale.ore);
  const [minScadenza, setMinScadenza] = useState(oraAttuale.minuti);

  const scadenzaManualeISO = useMemo(() => {
    if (modoScadenza === 'relativa') {
      return new Date(adesso.getTime() + minutiScadenza * 60000).toISOString();
    }
    const dataISO = `${due(aaaaScadenza, Number(annoOggi), 1970, 9999).padStart(4, '0').slice(-4)}-${due(mmScadenza, Number(meseOggi), 1, 12)}-${due(ggScadenza, Number(giornoOggi), 1, 31)}`;
    const data = dataSicura(`${dataISO}T${due(hhScadenza, 12, 0, 23)}:${due(minScadenza, 0, 0, 59)}`);
    // Un valore sempre dentro i range individuali dei singoli campi
    // (gestiti da due()) non basta a garantire un calendario valido
    // (es. 30 febbraio): se il parsing comunque fallisce, ricade su
    // adesso + 24 ore invece di propagare un Invalid Date.
    return (data ?? new Date(adesso.getTime() + 24 * 3600 * 1000)).toISOString();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modoScadenza, minutiScadenza, ggScadenza, mmScadenza, aaaaScadenza, hhScadenza, minScadenza]);

  // Finché l'utente non tocca la scadenza: 24 ore, oppure - se l'attività è
  // precisa su un orario - 2 ore prima di quell'orario (mai prima di 30
  // minuti da ora, per non proporre una scadenza già nel passato).
  const votazioneScadeIl = scadenzaToccata
    ? new Date(scadenzaManualeISO)
    : esitoQuando.precisione !== 'orario'
      ? new Date(adesso.getTime() + 24 * 3600 * 1000)
      : (() => {
          const dueOrePrima = new Date(new Date(esitoQuando.inizioISO).getTime() - 2 * 3600 * 1000);
          const minimo = new Date(adesso.getTime() + 30 * 60 * 1000);
          return dueOrePrima.getTime() > minimo.getTime() ? dueOrePrima : minimo;
        })();

  function toccaScadenzaRelativa(minuti: 30 | 60 | 120 | 1440) {
    setModoScadenza('relativa');
    setMinutiScadenza(minuti);
    setScadenzaToccata(true);
  }

  function toccaScadenzaManuale(campo: 'gg' | 'mm' | 'aaaa' | 'hh' | 'min', valore: string) {
    setModoScadenza('data_ora');
    setScadenzaToccata(true);
    if (campo === 'gg') setGgScadenza(valore);
    if (campo === 'mm') setMmScadenza(valore);
    if (campo === 'aaaa') setAaaaScadenza(valore);
    if (campo === 'hh') setHhScadenza(valore);
    if (campo === 'min') setMinScadenza(valore);
  }

  // --- 5. Invio ---
  const propostaValida = !propostaAttiva || propostaTesto.trim() !== '';
  const scadenzaValida =
    votazioneScadeIl.getTime() > adesso.getTime() &&
    (esitoQuando.precisione !== 'orario' || votazioneScadeIl.getTime() <= new Date(esitoQuando.inizioISO).getTime());
  const formValido = totaleScelte === 3 && propostaValida && scadenzaValida && domanda.trim() !== '';

  function tornaIndietro() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/sfide');
    }
  }

  function inviaSfida() {
    if (!formValido || listaId === undefined) {
      return;
    }
    crea.mutate(
      {
        listaId,
        richiestaId,
        titolo: domanda.trim(),
        categoria,
        attivitaPrecisione: esitoQuando.precisione,
        attivitaInizio: esitoQuando.inizioISO,
        attivitaFine: esitoQuando.fineISO,
        votazioneScadeIl: votazioneScadeIl.toISOString(),
        opzioniScelte: opzioniSelezionate,
        propostaPersonalizzata: propostaAttiva ? propostaTesto.trim() : null,
      },
      {
        onSuccess: (sfidaId) => {
          router.replace({ pathname: '/sfide/[id]', params: { id: sfidaId } });
        },
      }
    );
  }

  return (
    <View style={styles.schermo}>
      <ScrollView
        contentContainerStyle={[
          styles.contenuto,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
        ]}
      >
        <View style={styles.rigaTitolo}>
          <Pressable onPress={tornaIndietro} hitSlop={8}>
            <BloccoDuro offset={2} colore={colori.panna} raggio={10} contenutoStyle={styles.quadrato}>
              <Feather name="arrow-left" size={17} color={colori.scuro} />
            </BloccoDuro>
          </Pressable>
          <Text style={styles.titolo}>Nuova sfida</Text>
        </View>

        <View style={styles.sezione}>
          <Text style={styles.etichettaSezione}>Quando?</Text>
          <View style={styles.rigaChip}>
            {SCELTE_RAPIDE.map((scelta) => (
              <Pressable
                key={scelta.valore}
                onPress={() => {
                  setModoQuando('rapida');
                  setValoreRapido(scelta.valore);
                }}
                style={[styles.chip, modoQuando === 'rapida' && valoreRapido === scelta.valore && styles.chipAttivo]}
              >
                <Text style={styles.testoChip}>{scelta.etichetta}</Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => setModoQuando('data')}
              style={[styles.chip, modoQuando === 'data' && styles.chipAttivo]}
            >
              <Text style={styles.testoChip}>Scegli data</Text>
            </Pressable>
            <Pressable
              onPress={() => setModoQuando('data_ora')}
              style={[styles.chip, modoQuando === 'data_ora' && styles.chipAttivo]}
            >
              <Text style={styles.testoChip}>Scegli data e ora</Text>
            </Pressable>
          </View>

          {(modoQuando === 'data' || modoQuando === 'data_ora') && (
            <CampoDataOra
              conOrario={modoQuando === 'data_ora'}
              gg={ggQuando}
              mm={mmQuando}
              aaaa={aaaaQuando}
              hh={hhQuando}
              min={minQuando}
              onCambiaGg={setGgQuando}
              onCambiaMm={setMmQuando}
              onCambiaAaaa={setAaaaQuando}
              onCambiaHh={setHhQuando}
              onCambiaMin={setMinQuando}
            />
          )}

          <Text style={styles.testoData}>{formattaConGiorno(esitoQuando, FUSO_ORARIO)}</Text>
        </View>

        <View style={styles.sezione}>
          <Text style={styles.etichettaSezione}>
            Domanda {domandaToccata ? '(modificata a mano)' : '(stima automatica)'}
          </Text>
          <TextInput
            style={styles.inputDomanda}
            value={domanda}
            onChangeText={(testo) => {
              setDomandaManuale(testo);
              setDomandaToccata(true);
            }}
            multiline
          />
        </View>

        <View style={styles.sezione}>
          <Text style={styles.etichettaSezione}>Opzioni</Text>
          <Text style={styles.contatore}>{totaleScelte} di 3 scelte</Text>
          {vociInCaricamento ? (
            <ActivityIndicator color={colori.scuro} />
          ) : (
            <>
              {voci.map((voce) => (
                <Pressable
                  key={voce.id}
                  onPress={() => selezionaVoce(voce.id)}
                  style={[styles.opzioneChip, opzioniSelezionate.includes(voce.id) && styles.opzioneChipAttiva]}
                >
                  <Text style={styles.testoOpzioneChip}>{voce.testo}</Text>
                </Pressable>
              ))}
              <Pressable
                onPress={alternaProposta}
                style={[styles.opzioneChip, propostaAttiva && styles.opzioneChipAttiva]}
              >
                <Text style={styles.testoOpzioneChip}>+ Proponi un&apos;altra opzione</Text>
              </Pressable>
            </>
          )}
          {propostaAttiva && (
            <TextInput
              style={styles.inputDomanda}
              placeholder="La tua proposta"
              placeholderTextColor={colori.soft}
              value={propostaTesto}
              onChangeText={setPropostaTesto}
            />
          )}
        </View>

        <View style={styles.sezione}>
          <Text style={styles.etichettaSezione}>Scadenza voto</Text>
          <View style={styles.rigaChip}>
            {SCADENZE_RAPIDE.map((scelta) => (
              <Pressable
                key={scelta.minuti}
                onPress={() => toccaScadenzaRelativa(scelta.minuti)}
                style={[
                  styles.chip,
                  modoScadenza === 'relativa' && scadenzaToccata && minutiScadenza === scelta.minuti && styles.chipAttivo,
                ]}
              >
                <Text style={styles.testoChip}>{scelta.etichetta}</Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => toccaScadenzaManuale('gg', ggScadenza)}
              style={[styles.chip, modoScadenza === 'data_ora' && scadenzaToccata && styles.chipAttivo]}
            >
              <Text style={styles.testoChip}>Scegli data e ora</Text>
            </Pressable>
          </View>

          {modoScadenza === 'data_ora' && scadenzaToccata && (
            <CampoDataOra
              conOrario
              gg={ggScadenza}
              mm={mmScadenza}
              aaaa={aaaaScadenza}
              hh={hhScadenza}
              min={minScadenza}
              onCambiaGg={(v) => toccaScadenzaManuale('gg', v)}
              onCambiaMm={(v) => toccaScadenzaManuale('mm', v)}
              onCambiaAaaa={(v) => toccaScadenzaManuale('aaaa', v)}
              onCambiaHh={(v) => toccaScadenzaManuale('hh', v)}
              onCambiaMin={(v) => toccaScadenzaManuale('min', v)}
            />
          )}

          <Text style={styles.testoData}>
            Si chiude {format2(votazioneScadeIl)}
            {!scadenzaValida && esitoQuando.precisione === 'orario'
              ? " - deve essere prima dell'orario scelto per l'attività"
              : ''}
          </Text>
        </View>

        {crea.isError && <Text style={styles.testoErrore}>{messaggioErrore(crea.error)}</Text>}

        <BloccoDuro
          style={(!formValido || crea.isPending) && styles.bottoneDisabilitato}
          offset={2.5}
          colore={colori.corallo}
          raggio={12}
          contenutoStyle={styles.bottonePieno}
          onPress={formValido && !crea.isPending ? inviaSfida : undefined}
        >
          {crea.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.testoBottonePieno}>Invia sfida</Text>}
        </BloccoDuro>
      </ScrollView>
    </View>
  );
}

/** Formattazione breve e leggibile di un istante, senza dipendere dal fuso del dispositivo in modo visibile. */
function format2(data: Date): string {
  return data.toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  schermo: {
    flex: 1,
    backgroundColor: colori.crema,
  },
  contenuto: {
    paddingHorizontal: 16,
    gap: 16,
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
  titolo: {
    ...pesi.extraBold,
    fontSize: 18,
    letterSpacing: -0.3,
    color: colori.scuro,
  },
  sezione: {
    gap: 8,
  },
  etichettaSezione: {
    ...pesi.extraBold,
    fontSize: 10,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: colori.soft,
  },
  rigaChip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    borderWidth: 2,
    borderColor: colori.scuro,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: '#fff',
  },
  chipAttivo: {
    backgroundColor: colori.viola,
  },
  testoChip: {
    ...pesi.extraBold,
    fontSize: 10.5,
    color: colori.scuro,
  },
  opzioneChip: {
    borderWidth: 2,
    borderColor: colori.scuro,
    borderRadius: 11,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  opzioneChipAttiva: {
    backgroundColor: colori.viola,
  },
  testoOpzioneChip: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colori.scuro,
  },
  contatore: {
    ...pesi.extraBold,
    fontSize: 10.5,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: colori.scuro,
  },
  testoData: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colori.soft,
  },
  inputDomanda: {
    borderWidth: 2,
    borderColor: colori.scuro,
    borderRadius: 11,
    backgroundColor: colori.panna,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colori.scuro,
  },
  rigaDataOra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inputData: {
    borderWidth: 2,
    borderColor: colori.scuro,
    borderRadius: 9,
    backgroundColor: colori.panna,
    paddingHorizontal: 7,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: '700',
    color: colori.scuro,
    textAlign: 'center',
  },
  inputGiorno: {
    width: 44,
  },
  inputAnno: {
    width: 62,
  },
  inputOra: {
    marginLeft: 8,
  },
  separatoreData: {
    ...pesi.extraBold,
    fontSize: 13,
    color: colori.soft,
  },
  testoErrore: {
    ...pesi.bold,
    fontSize: 12.5,
    color: colori.corallo,
    textAlign: 'center',
  },
  bottoneDisabilitato: {
    opacity: 0.5,
  },
  bottonePieno: {
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testoBottonePieno: {
    ...pesi.extraBold,
    fontSize: 12,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: '#fff',
  },
});
