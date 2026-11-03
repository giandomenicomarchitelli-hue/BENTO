import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import type { EventoPersonale } from '@/api/eventiPersonali';
import { aggiungiMesi, dataLocaleISO } from '@/calcolo/ricorrenzaFaccende';
import { BentoButton } from '@/components/BentoButton';
import { BentoScreen } from '@/components/BentoScreen';
import { CalendarioGriglia } from '@/components/CalendarioGriglia';
import { GlassCard } from '@/components/GlassCard';
import { SectionHeader } from '@/components/SectionHeader';
import { useEventiPersonali } from '@/hooks/useEventiPersonali';
import { confermaAzione } from '@/lib/conferma';
import { useAuthStore } from '@/store/authStore';
import { bento, raggio, semantica, spaziatura, tipografia } from '@/theme/tokens';

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
        <ActivityIndicator color={bento.testoPrimario} />
      </View>
    );
  }

  const salvando = crea.isPending || aggiorna.isPending;
  const erroreForm = crea.isError || aggiorna.isError ? messaggioErrore(crea.error ?? aggiorna.error) : null;

  return (
    <BentoScreen>
      {error !== null && error !== undefined && (
        <Text style={styles.testoErrore}>Non riesco a caricare il calendario al momento.</Text>
      )}

      {/* A. Intestazione mese + griglia */}
      <View>
        <View style={styles.rigaMese}>
          <Pressable onPress={() => setAnnoMeseISO(aggiungiMesi(annoMeseISO, -1))} hitSlop={8} style={styles.bottoneMese}>
            <Feather name="chevron-left" size={22} color={bento.testoPrimario} />
          </Pressable>
          <Text style={styles.titoloMese}>
            {format(new Date(`${annoMeseISO}T00:00:00`), 'MMMM yyyy', { locale: it })}
          </Text>
          <Pressable onPress={() => setAnnoMeseISO(aggiungiMesi(annoMeseISO, 1))} hitSlop={8} style={styles.bottoneMese}>
            <Feather name="chevron-right" size={22} color={bento.testoPrimario} />
          </Pressable>
        </View>

        <CalendarioGriglia
          annoMeseISO={annoMeseISO}
          occorrenzePerGiorno={eventiPerGiorno}
          giornoSelezionato={giornoSelezionato}
          onSelezionaGiorno={selezionaGiorno}
        />
      </View>

      {/* B. Eventi del giorno selezionato */}
      <View style={styles.sezione}>
        <SectionHeader
          titolo={format(new Date(`${giornoSelezionato}T00:00:00`), "d MMMM yyyy", { locale: it })}
        />

        {eventiDelGiorno.length === 0 ? (
          <Text style={styles.testoStatoLista}>Nessun evento in questo giorno.</Text>
        ) : (
          <View style={styles.elencoEventi}>
            {eventiDelGiorno.map((evento) => {
              const eliminandoQuesto = elimina.isPending && elimina.variables === evento.id;
              const erroreEliminazione = elimina.isError && elimina.variables === evento.id ? elimina.error : null;

              return (
                <GlassCard key={evento.id} elevazione="bassa">
                  <Text style={styles.titoloEvento}>{evento.titolo}</Text>
                  {evento.descrizione !== null && (
                    <Text style={styles.descrizioneEvento}>{evento.descrizione}</Text>
                  )}
                  <Text style={styles.oraEvento}>{evento.ora ?? 'Tutto il giorno'}</Text>

                  <View style={styles.rigaAzioni}>
                    <Pressable onPress={() => apriModifica(evento)} hitSlop={8}>
                      <Text style={styles.testoAzione}>Modifica</Text>
                    </Pressable>
                    <Pressable onPress={() => chiediEliminazione(evento)} disabled={eliminandoQuesto} hitSlop={8}>
                      <Text style={[styles.testoAzione, styles.testoElimina]}>
                        {eliminandoQuesto ? 'Eliminazione…' : 'Elimina'}
                      </Text>
                    </Pressable>
                  </View>
                  {erroreEliminazione !== null && (
                    <Text style={styles.testoErroreRiga}>{messaggioErrore(erroreEliminazione)}</Text>
                  )}
                </GlassCard>
              );
            })}
          </View>
        )}
      </View>

      {/* C. Nuovo evento / modifica */}
      <View style={styles.sezione}>
        <SectionHeader
          titolo="Eventi"
          azione={{
            etichetta: formAperto !== null ? 'Chiudi' : 'Nuovo evento',
            onPress: () => (formAperto !== null ? chiudiForm() : apriCrea()),
          }}
        />

        {formAperto !== null && (
          <GlassCard>
            {/* key: senza una key che cambia con il target, passare da
                "modifica A" a "modifica B" (o da crea a modifica) senza
                chiudere il form riuserebbe lo state e mostrerebbe ancora
                i valori precedenti mentre si salva sul nuovo target. */}
            <FormEvento
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
              salvando={salvando}
              onSalva={onSalvaForm}
            />
            {erroreForm !== null && <Text style={styles.testoErrore}>{erroreForm}</Text>}
          </GlassCard>
        )}
      </View>
    </BentoScreen>
  );
}

type PropsFormEvento = {
  valoriIniziali: ValoriEvento;
  salvando: boolean;
  onSalva: (valori: ValoriEvento) => void;
};

/**
 * Form di creazione/modifica di un evento: stesso pattern "controllato" di
 * ModificaImpegno.tsx per la validazione della data e per la bozza
 * dell'ora (`bozzaOra` resta in memoria anche quando "Tutto il giorno" è
 * attivo, così riattivando l'ora non si perde l'ultimo valore scritto),
 * ma senza i campi di ricorrenza/assegnazione che qui non esistono.
 */
function FormEvento({ valoriIniziali, salvando, onSalva }: PropsFormEvento) {
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
    <View style={styles.form}>
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
        <Text style={styles.etichetta}>Data (AAAA-MM-GG)</Text>
        <TextInput
          style={[styles.input, !dataValida && styles.inputConErrore]}
          value={data}
          onChangeText={setData}
          placeholder="2026-10-27"
          placeholderTextColor={bento.testoMuto}
          keyboardType="numbers-and-punctuation"
        />
        {!dataValida && <Text style={styles.testoErroreCampo}>Formato: AAAA-MM-GG</Text>}
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
        <Text style={styles.etichetta}>Descrizione (opzionale)</Text>
        <TextInput
          style={styles.input}
          value={descrizione}
          onChangeText={setDescrizione}
          placeholder="Es. portare i documenti"
          placeholderTextColor={bento.testoMuto}
          returnKeyType="done"
        />
      </View>

      <BentoButton etichetta="Salva" onPress={salva} caricando={salvando} disabilitato={titoloVuoto || !dataValida} />
    </View>
  );
}

const styles = StyleSheet.create({
  centrato: {
    flex: 1,
    backgroundColor: bento.sfondo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rigaMese: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spaziatura.sm,
  },
  bottoneMese: {
    padding: spaziatura.xs,
  },
  titoloMese: {
    ...tipografia.titoloSezione,
    color: bento.testoPrimario,
    textTransform: 'capitalize',
  },
  sezione: {
    gap: spaziatura.md,
  },
  testoStatoLista: {
    fontSize: 14,
    color: bento.testoSecondario,
    textAlign: 'center',
    marginTop: spaziatura.md,
  },
  elencoEventi: {
    gap: spaziatura.sm,
  },
  titoloEvento: {
    fontSize: 15,
    fontWeight: '600',
    color: bento.testoPrimario,
  },
  descrizioneEvento: {
    fontSize: 13,
    color: bento.testoSecondario,
    marginTop: 2,
  },
  oraEvento: {
    fontSize: 12.5,
    color: bento.testoMuto,
    marginTop: 4,
  },
  rigaAzioni: {
    flexDirection: 'row',
    gap: spaziatura.lg,
    marginTop: spaziatura.sm,
  },
  testoAzione: {
    fontSize: 13,
    fontWeight: '600',
    color: bento.testoSecondario,
  },
  testoElimina: {
    color: semantica.pericolo,
  },
  testoErrore: {
    fontSize: 13,
    color: semantica.pericolo,
    textAlign: 'center',
    marginTop: spaziatura.xs,
  },
  testoErroreRiga: {
    fontSize: 12.5,
    color: semantica.pericolo,
    marginTop: spaziatura.xs,
  },
  form: {
    gap: spaziatura.lg,
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
    borderColor: semantica.pericolo,
  },
  testoErroreCampo: {
    fontSize: 12,
    color: semantica.pericolo,
  },
  rigaSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spaziatura.md,
  },
});
