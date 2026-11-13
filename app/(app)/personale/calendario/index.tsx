import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { EventoPersonale } from '@/api/eventiPersonali';
import { aggiungiMesi, dataLocaleISO } from '@/calcolo/ricorrenzaFaccende';
import { BloccoDuro } from '@/components/BloccoDuro';
import { CalendarioGriglia } from '@/components/CalendarioGriglia';
import { useEventiPersonali } from '@/hooks/useEventiPersonali';
import { confermaAzione } from '@/lib/conferma';
import { useAuthStore } from '@/store/authStore';
import { coloreCiclico, coloriNB as colori, pesiNB as pesi } from '@/theme/neoBrutalista';

const DATA_VALIDA = /^\d{4}-\d{2}-\d{2}$/;

/** Messaggio leggibile da un errore di rete/Supabase (stesso helper di calendario/index.tsx, nessuna dipendenza di gruppo). */
function messaggioErrore(errore: unknown): string {
  if (errore instanceof Error && errore.message.trim() !== '') {
    return errore.message;
  }
  return 'Qualcosa è andato storto. Riprova.';
}

type ValoriEvento = {
  titolo: string;
  data: string; // YYYY-MM-DD
  ora: string | null; // HH:MM
  descrizione: string | null;
};

/**
 * Calendario personale: eventi su singola data, nessuna ricorrenza e
 * nessuna dipendenza da un gruppo attivo - a differenza di
 * app/(app)/calendario/index.tsx, qui non c'è redirect/guard di gruppo,
 * stesso pattern di personale/note e personale/liste.
 */
export default function CalendarioPersonale() {
  const insets = useSafeAreaInsets();
  const utenteId = useAuthStore((stato) => stato.session?.user.id) ?? null;
  const { eventi, isLoading, error, crea, aggiorna, elimina } = useEventiPersonali(utenteId);

  // Fuso orario del dispositivo: non c'è un fuso orario di gruppo qui, e
  // `data` degli eventi è già una stringa AAAA-MM-GG senza conversione.
  const [annoMeseISO, setAnnoMeseISO] = useState(() => {
    const oggiISO = dataLocaleISO(new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone);
    return `${oggiISO.slice(0, 7)}-01`;
  });
  const [giornoSelezionato, setGiornoSelezionato] = useState(() =>
    dataLocaleISO(new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone)
  );
  const [formAperto, setFormAperto] = useState<'crea' | 'modifica' | null>(null);
  const [eventoInModifica, setEventoInModifica] = useState<EventoPersonale | null>(null);

  // Raggruppamento per `data` diretto: a differenza del calendario di
  // gruppo non c'è un `data_ora` timestamptz da convertire in data locale.
  const eventiPerGiorno = useMemo(() => {
    const mappa: Record<string, number> = {};
    for (const evento of eventi) {
      mappa[evento.data] = (mappa[evento.data] ?? 0) + 1;
    }
    return mappa;
  }, [eventi]);

  const eventiDelGiorno = useMemo(
    () => eventi.filter((e) => e.data === giornoSelezionato),
    [eventi, giornoSelezionato]
  );

  function selezionaGiorno(dataISO: string) {
    setGiornoSelezionato(dataISO);
    // Toccare un giorno di contorno (fuori dal mese visualizzato) scorre
    // la griglia al mese adiacente, stesso comportamento del calendario
    // di gruppo.
    const meseDellaCella = `${dataISO.slice(0, 7)}-01`;
    if (meseDellaCella !== annoMeseISO) {
      setAnnoMeseISO(meseDellaCella);
    }
  }

  function apriCrea() {
    setEventoInModifica(null);
    setFormAperto('crea');
  }

  function apriModifica(evento: EventoPersonale) {
    setEventoInModifica(evento);
    setFormAperto('modifica');
  }

  function chiudiForm() {
    setFormAperto(null);
    setEventoInModifica(null);
  }

  function onSalvaForm(valori: ValoriEvento) {
    if (formAperto === 'crea') {
      crea.mutate(valori, { onSuccess: chiudiForm });
    } else if (formAperto === 'modifica' && eventoInModifica !== null) {
      aggiorna.mutate({ id: eventoInModifica.id, ...valori }, { onSuccess: chiudiForm });
    }
  }

  function tornaIndietro() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/personale');
    }
  }

  async function chiediEliminazione(evento: EventoPersonale) {
    const conferma = await confermaAzione(
      'Eliminare questo evento?',
      `"${evento.titolo}" verrà rimosso definitivamente.`,
      'Elimina'
    );
    if (conferma) {
      elimina.mutate(evento.id);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.centrato}>
        <ActivityIndicator color={colori.scuro} />
      </View>
    );
  }

  const salvando = crea.isPending || aggiorna.isPending;
  const erroreForm = crea.isError || aggiorna.isError ? messaggioErrore(crea.error ?? aggiorna.error) : null;

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
          <Text style={styles.titolo}>Il mio calendario</Text>
        </View>

        {error !== null && error !== undefined && (
          <Text style={styles.testoErrore}>Non riesco a caricare il calendario al momento.</Text>
        )}

      {/* A. Intestazione mese + griglia */}
      <View>
        <View style={styles.rigaMese}>
          <Pressable onPress={() => setAnnoMeseISO(aggiungiMesi(annoMeseISO, -1))} hitSlop={8}>
            <BloccoDuro offset={2} colore={colori.panna} raggio={9} contenutoStyle={styles.bottoneMese}>
              <Feather name="chevron-left" size={15} color={colori.scuro} />
            </BloccoDuro>
          </Pressable>
          <Text style={styles.titoloMese}>
            {format(new Date(`${annoMeseISO}T00:00:00`), 'MMMM yyyy', { locale: it })}
          </Text>
          <Pressable onPress={() => setAnnoMeseISO(aggiungiMesi(annoMeseISO, 1))} hitSlop={8}>
            <BloccoDuro offset={2} colore={colori.panna} raggio={9} contenutoStyle={styles.bottoneMese}>
              <Feather name="chevron-right" size={15} color={colori.scuro} />
            </BloccoDuro>
          </Pressable>
        </View>

        <CalendarioGriglia
          annoMeseISO={annoMeseISO}
          occorrenzePerGiorno={eventiPerGiorno}
          giornoSelezionato={giornoSelezionato}
          onSelezionaGiorno={selezionaGiorno}
        />
      </View>

      {/* B. Eventi del giorno selezionato, appiattiti come il feed di Home. */}
      <View style={styles.sezioneLista}>
        <Text style={styles.etichettaGiorno}>
          {format(new Date(`${giornoSelezionato}T00:00:00`), 'EEEE d MMMM', { locale: it })}
        </Text>

        <BloccoDuro offset={4} colore={colori.scuro} raggio={16} contenutoStyle={styles.feed}>
          {eventiDelGiorno.length === 0 ? (
            <View style={styles.feedVuoto}>
              <Text style={styles.testoFeedVuoto}>Nessun evento in questo giorno.</Text>
            </View>
          ) : (
            <View style={styles.righeFeed}>
              {eventiDelGiorno.map((evento) => {
                const eliminandoQuesto = elimina.isPending && elimina.variables === evento.id;
                const erroreEliminazione =
                  elimina.isError && elimina.variables === evento.id ? elimina.error : null;

                return (
                  <View key={evento.id} style={styles.rigaFeed}>
                    <View style={[styles.barraFeed, { backgroundColor: coloreCiclico(evento.id) }]} />
                    <View style={styles.testoFeed}>
                      <View style={styles.cimaFeed}>
                        <Text style={styles.titoloFeed} numberOfLines={1}>
                          {evento.titolo}
                        </Text>
                        <Text style={styles.oraFeed}>{evento.ora ?? 'Tutto il giorno'}</Text>
                      </View>
                      <View style={styles.azioniFeed}>
                        <Pressable onPress={() => apriModifica(evento)} hitSlop={8}>
                          <Text style={styles.testoAzioneFeed}>Modifica</Text>
                        </Pressable>
                        <Pressable onPress={() => chiediEliminazione(evento)} disabled={eliminandoQuesto} hitSlop={8}>
                          <Text style={[styles.testoAzioneFeed, styles.testoEliminaFeed]}>
                            {eliminandoQuesto ? 'Eliminazione…' : 'Elimina'}
                          </Text>
                        </Pressable>
                      </View>
                      {erroreEliminazione !== null && (
                        <Text style={styles.testoErroreRiga}>{messaggioErrore(erroreEliminazione)}</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <Pressable onPress={() => (formAperto !== null ? chiudiForm() : apriCrea())} style={styles.ctaFeed}>
            <Feather name={formAperto !== null ? 'x' : 'plus'} size={13} color={colori.crema} />
            <Text style={styles.testoCtaFeed}>{formAperto !== null ? 'Chiudi' : 'Nuovo evento'}</Text>
          </Pressable>
        </BloccoDuro>
      </View>

      {/* C. Form, più corto di quello di gruppo: niente ricorrenza/assegnazione qui. */}
      {formAperto !== null && (
        <View style={styles.sezioneForm}>
          <FormEvento
            // key: senza una key che cambia con il target, passare da
            // "modifica A" a "modifica B" (o da crea a modifica) senza
            // chiudere il form riuserebbe lo state e mostrerebbe ancora
            // i valori precedenti mentre si salva sul nuovo target.
            key={formAperto === 'modifica' ? eventoInModifica?.id ?? 'modifica' : 'crea'}
            valoriIniziali={
              formAperto === 'modifica' && eventoInModifica !== null
                ? {
                    titolo: eventoInModifica.titolo,
                    data: eventoInModifica.data,
                    ora: eventoInModifica.ora,
                    descrizione: eventoInModifica.descrizione,
                  }
                : { titolo: '', data: giornoSelezionato, ora: null, descrizione: null }
            }
            modifica={formAperto === 'modifica'}
            salvando={salvando}
            onSalva={onSalvaForm}
            onAnnulla={chiudiForm}
          />
          {erroreForm !== null && <Text style={styles.testoErrore}>{erroreForm}</Text>}
        </View>
      )}
      </ScrollView>
    </View>
  );
}

type PropsFormEvento = {
  valoriIniziali: ValoriEvento;
  modifica: boolean;
  salvando: boolean;
  onSalva: (valori: ValoriEvento) => void;
  onAnnulla: () => void;
};

/**
 * Form di creazione/modifica di un evento: stesso pattern "controllato" di
 * ModificaImpegno.tsx per la validazione della data e per la bozza
 * dell'ora (`bozzaOra` resta in memoria anche quando "Tutto il giorno" è
 * attivo, così riattivando l'ora non si perde l'ultimo valore scritto),
 * ma senza i campi di ricorrenza/assegnazione che qui non esistono.
 */
function FormEvento({ valoriIniziali, modifica, salvando, onSalva, onAnnulla }: PropsFormEvento) {
  const [titolo, setTitolo] = useState(valoriIniziali.titolo);
  const [data, setData] = useState(valoriIniziali.data);
  const [tuttoIlGiorno, setTuttoIlGiorno] = useState(valoriIniziali.ora == null);
  const [bozzaOra, setBozzaOra] = useState(valoriIniziali.ora ?? '09:00');
  const [descrizione, setDescrizione] = useState(valoriIniziali.descrizione ?? '');

  const dataValida = DATA_VALIDA.test(data);
  const titoloVuoto = titolo.trim() === '';

  function salva() {
    if (titoloVuoto || !dataValida || salvando) return;
    onSalva({
      titolo: titolo.trim(),
      data,
      ora: tuttoIlGiorno ? null : bozzaOra,
      descrizione: descrizione.trim() === '' ? null : descrizione.trim(),
    });
  }

  return (
    <BloccoDuro offset={3} colore={colori.panna} raggio={16} contenutoStyle={styles.form}>
      <Text style={styles.titoloForm}>{modifica ? 'Modifica evento' : 'Nuovo evento'}</Text>

      <View style={styles.campo}>
        <Text style={styles.etichetta}>Titolo</Text>
        <TextInput
          style={styles.input}
          value={titolo}
          onChangeText={setTitolo}
          placeholder="Es. Dentista"
          placeholderTextColor={colori.soft}
          autoFocus
          returnKeyType="next"
        />
      </View>

      <View style={styles.campo}>
        <Text style={styles.etichetta}>Data (AAAA-MM-GG)</Text>
        <TextInput
          style={[styles.input, !dataValida && styles.inputConErrore]}
          value={data}
          onChangeText={setData}
          placeholder="2026-10-27"
          placeholderTextColor={colori.soft}
          keyboardType="numbers-and-punctuation"
        />
        {!dataValida && <Text style={styles.testoErroreCampo}>Formato: AAAA-MM-GG</Text>}
      </View>

      <View style={styles.rigaSwitch}>
        <Text style={styles.etichetta}>Tutto il giorno</Text>
        <Switch
          value={tuttoIlGiorno}
          onValueChange={setTuttoIlGiorno}
          trackColor={{ false: colori.panna, true: colori.menta }}
          thumbColor={colori.crema}
        />
      </View>

      {!tuttoIlGiorno && (
        <View style={styles.campo}>
          <Text style={styles.etichetta}>Ora (HH:MM)</Text>
          <TextInput
            style={styles.input}
            value={bozzaOra}
            onChangeText={setBozzaOra}
            placeholder="09:00"
            placeholderTextColor={colori.soft}
            keyboardType="numbers-and-punctuation"
          />
        </View>
      )}

      <View style={styles.campo}>
        <Text style={styles.etichetta}>Descrizione (opzionale)</Text>
        <TextInput
          style={styles.input}
          value={descrizione}
          onChangeText={setDescrizione}
          placeholder="Es. portare i documenti"
          placeholderTextColor={colori.soft}
          returnKeyType="done"
        />
      </View>

      <View style={styles.barraSalva}>
        <Pressable style={[styles.bottone, styles.bottoneAnnulla]} onPress={onAnnulla}>
          <Text style={styles.testoBottoneAnnulla}>Annulla</Text>
        </Pressable>
        <BloccoDuro
          style={[styles.cellaSalva, (titoloVuoto || !dataValida || salvando) && styles.cellaSalvaDisabilitata]}
          offset={2.5}
          colore={colori.corallo}
          raggio={10}
          contenutoStyle={styles.bottoneSalva}
          onPress={titoloVuoto || !dataValida || salvando ? undefined : salva}
        >
          {salvando ? <ActivityIndicator color="#fff" /> : <Text style={styles.testoBottoneSalva}>Salva</Text>}
        </BloccoDuro>
      </View>
    </BloccoDuro>
  );
}

const styles = StyleSheet.create({
  centrato: {
    flex: 1,
    backgroundColor: colori.crema,
    alignItems: 'center',
    justifyContent: 'center',
  },
  schermo: {
    flex: 1,
    backgroundColor: colori.crema,
  },
  contenuto: {
    paddingHorizontal: 16,
    gap: 4,
  },
  rigaTitolo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginBottom: 14,
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
  rigaMese: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  bottoneMese: {
    width: 33,
    height: 33,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titoloMese: {
    ...pesi.extraBold,
    fontSize: 19,
    letterSpacing: -0.3,
    textTransform: 'capitalize',
    color: colori.scuro,
  },
  sezioneLista: {
    gap: 10,
    marginTop: 16,
  },
  etichettaGiorno: {
    ...pesi.extraBold,
    fontSize: 15,
    letterSpacing: -0.2,
    textTransform: 'capitalize',
    color: colori.scuro,
  },
  feed: {
    borderRadius: 16 - 2.5,
    overflow: 'hidden',
    backgroundColor: colori.scuro,
  },
  righeFeed: {
    gap: 2,
    backgroundColor: colori.scuro,
  },
  rigaFeed: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: colori.panna,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  barraFeed: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
    marginTop: 1,
  },
  testoFeed: {
    flex: 1,
    minWidth: 0,
  },
  cimaFeed: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  titoloFeed: {
    ...pesi.extraBold,
    fontSize: 13.5,
    color: colori.scuro,
    flexShrink: 1,
  },
  oraFeed: {
    ...pesi.extraBold,
    fontSize: 11,
    color: colori.soft,
  },
  azioniFeed: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 6,
  },
  testoAzioneFeed: {
    ...pesi.extraBold,
    fontSize: 10.5,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: colori.soft,
  },
  testoEliminaFeed: {
    color: colori.corallo,
  },
  testoErroreRiga: {
    ...pesi.bold,
    fontSize: 11,
    color: colori.corallo,
    marginTop: 4,
  },
  feedVuoto: {
    backgroundColor: colori.panna,
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  testoFeedVuoto: {
    ...pesi.bold,
    fontSize: 12.5,
    color: colori.soft,
    textAlign: 'center',
  },
  ctaFeed: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: colori.scuro,
    paddingVertical: 11,
  },
  testoCtaFeed: {
    ...pesi.extraBold,
    fontSize: 10.5,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colori.crema,
  },
  sezioneForm: {
    marginTop: 16,
  },
  testoErrore: {
    ...pesi.bold,
    fontSize: 12.5,
    color: colori.corallo,
    textAlign: 'center',
    marginTop: 6,
  },
  form: {
    padding: 14,
    gap: 12,
  },
  titoloForm: {
    ...pesi.extraBold,
    fontSize: 15,
    textAlign: 'center',
    color: colori.scuro,
  },
  campo: {
    gap: 5,
  },
  etichetta: {
    ...pesi.extraBold,
    fontSize: 8.8,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: colori.soft,
  },
  input: {
    borderWidth: 2,
    borderColor: colori.scuro,
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 9,
    fontSize: 14.5,
    fontWeight: '600',
    color: colori.scuro,
    backgroundColor: '#fff',
  },
  inputConErrore: {
    borderColor: colori.corallo,
  },
  testoErroreCampo: {
    ...pesi.bold,
    fontSize: 11,
    color: colori.corallo,
  },
  rigaSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
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
    borderColor: colori.scuro,
  },
  testoBottoneAnnulla: {
    ...pesi.extraBold,
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: colori.scuro,
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
    ...pesi.extraBold,
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: '#fff',
  },
});
