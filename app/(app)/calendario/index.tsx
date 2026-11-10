import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Redirect } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Impegno } from '@/api/impegni';
import { aggiungiMesi, dataLocaleISO } from '@/calcolo/ricorrenzaFaccende';
import { BentoScreen } from '@/components/BentoScreen';
import { BloccoDuro } from '@/components/BloccoDuro';
import { CalendarioGriglia } from '@/components/CalendarioGriglia';
import { ModificaImpegno, type ValoriImpegno } from '@/components/ModificaImpegno';
import { useGruppoAttivo } from '@/hooks/useGruppoAttivo';
import { useImpegni } from '@/hooks/useImpegni';
import { confermaAzione } from '@/lib/conferma';
import { useAuthStore } from '@/store/authStore';
import { useGruppoAttivoStore } from '@/store/gruppoAttivoStore';
import { coloreCiclico, coloriNB as colori, pesiNB as pesi } from '@/theme/neoBrutalista';

/** Messaggio leggibile da un errore di rete/Supabase, senza assumere una forma precisa (stesso helper di faccende/index.tsx). */
function messaggioErrore(errore: unknown): string {
  if (errore instanceof Error && errore.message.trim() !== '') {
    return errore.message;
  }
  return 'Qualcosa è andato storto. Riprova.';
}

export default function Calendario() {
  const gruppoAttivoId = useGruppoAttivoStore((stato) => stato.gruppoAttivoId);

  if (gruppoAttivoId === null) {
    return <Redirect href="/gruppi" />;
  }

  return <CalendarioDelGruppo gruppoAttivoId={gruppoAttivoId} />;
}

function CalendarioDelGruppo({ gruppoAttivoId }: { gruppoAttivoId: string }) {
  const { membri, membriAttivi, isLoading: gruppoInCaricamento } = useGruppoAttivo();
  const utenteId = useAuthStore((stato) => stato.session?.user.id);
  const ilMioMembroId = membriAttivi.find((m) => m.utente_id === utenteId)?.id ?? null;

  const { impegni, occorrenze, fusoOrario, isLoading, error, crea, modifica, cancella } =
    useImpegni(gruppoAttivoId);

  // Lette una sola volta all'avvio: lo stesso pattern di altre schermate
  // (es. faccende/index.tsx calcola oggiISO ad ogni render, ma qui mese e
  // giorno selezionato sono scelte dell'utente che vanno preservate mentre
  // naviga avanti e indietro, quindi vivono in state e non si ricalcolano).
  const [annoMeseISO, setAnnoMeseISO] = useState(() => {
    const oggiISO = dataLocaleISO(new Date(), fusoOrario);
    return `${oggiISO.slice(0, 7)}-01`;
  });
  const [giornoSelezionato, setGiornoSelezionato] = useState(() => dataLocaleISO(new Date(), fusoOrario));
  const [modaleAperto, setModaleAperto] = useState<'crea' | 'modifica' | null>(null);
  const [impegnoInModifica, setImpegnoInModifica] = useState<Impegno | null>(null);

  const impegniPerId = useMemo(() => new Map(impegni.map((i) => [i.id, i])), [impegni]);

  // cancellaImpegno è un soft delete (attiva = false): le occorrenze già
  // generate restano nel DB finché non vengono sostituite, ma il loro
  // impegno non compare più in impegniPerId. Senza questo filtro
  // resterebbero visibili per sempre come occorrenze "fantasma".
  const occorrenzeAttive = useMemo(
    () => occorrenze.filter((o) => impegniPerId.has(o.impegno_id)),
    [occorrenze, impegniPerId]
  );

  // Raggruppamento per data locale nel fuso orario del gruppo, non per
  // fetta UTC ingenua di data_ora: altrimenti un'occorrenza vicina alla
  // mezzanotte finirebbe nel giorno sbagliato della griglia.
  const occorrenzePerGiorno = useMemo(() => {
    const mappa: Record<string, number> = {};
    for (const occorrenza of occorrenzeAttive) {
      const giorno = dataLocaleISO(new Date(occorrenza.data_ora), fusoOrario);
      mappa[giorno] = (mappa[giorno] ?? 0) + 1;
    }
    return mappa;
  }, [occorrenzeAttive, fusoOrario]);

  const occorrenzeDelGiorno = useMemo(
    () => occorrenzeAttive.filter((o) => dataLocaleISO(new Date(o.data_ora), fusoOrario) === giornoSelezionato),
    [occorrenzeAttive, fusoOrario, giornoSelezionato]
  );

  function selezionaGiorno(dataISO: string) {
    setGiornoSelezionato(dataISO);
    // Toccare un giorno di contorno (fuori dal mese visualizzato) scorre
    // la griglia al mese adiacente: CalendarioGriglia permette il tocco
    // ma non decide da sola di cambiare mese, lo fa questa schermata.
    const meseDellaCella = `${dataISO.slice(0, 7)}-01`;
    if (meseDellaCella !== annoMeseISO) {
      setAnnoMeseISO(meseDellaCella);
    }
  }

  function apriCrea() {
    setImpegnoInModifica(null);
    setModaleAperto('crea');
  }

  function apriModifica(impegno: Impegno) {
    setImpegnoInModifica(impegno);
    setModaleAperto('modifica');
  }

  function chiudiModale() {
    setModaleAperto(null);
    setImpegnoInModifica(null);
  }

  function valoriInizialiForm(): ValoriImpegno {
    if (modaleAperto === 'modifica' && impegnoInModifica !== null) {
      return {
        titolo: impegnoInModifica.titolo,
        descrizione: impegnoInModifica.descrizione,
        dataInizio: impegnoInModifica.data_inizio,
        ora: impegnoInModifica.ora,
        frequenza: impegnoInModifica.frequenza,
        intervalloRicorrenza: impegnoInModifica.intervallo_ricorrenza,
        promemoriaMinutiPrima: impegnoInModifica.promemoria_minuti_prima,
        modificabileDaTutti: impegnoInModifica.modificabile_da_tutti,
        assegnatoA: impegnoInModifica.assegnato_a,
      };
    }
    // Modalità creazione: titolo/descrizione vuoti, data precompilata al
    // giorno selezionato nella griglia (vedi nota di review del Task 8 -
    // valoriIniziali è sempre non-null anche qui, così ModificaImpegno
    // parte dalla data giusta invece che da "oggi").
    return {
      titolo: '',
      descrizione: null,
      dataInizio: giornoSelezionato,
      ora: null,
      frequenza: 'una_tantum',
      intervalloRicorrenza: null,
      promemoriaMinutiPrima: null,
      modificabileDaTutti: true,
      assegnatoA: null,
    };
  }

  function onSalvaForm(valori: ValoriImpegno) {
    if (modaleAperto === 'crea') {
      if (ilMioMembroId === null) {
        return;
      }
      crea.mutate({ ...valori, membroId: ilMioMembroId }, { onSuccess: chiudiModale });
    } else if (modaleAperto === 'modifica' && impegnoInModifica !== null) {
      modifica.mutate({ id: impegnoInModifica.id, ...valori }, { onSuccess: chiudiModale });
    }
  }

  async function chiediEliminazione(impegno: Impegno) {
    const conferma = await confermaAzione(
      'Eliminare questo impegno?',
      `"${impegno.titolo}" non genererà più nuove occorrenze. Quelle già create restano visibili.`,
      'Elimina'
    );
    if (conferma) {
      cancella.mutate(impegno.id);
    }
  }

  if (gruppoInCaricamento || isLoading) {
    return (
      <View style={styles.centrato}>
        <ActivityIndicator color={colori.scuro} />
      </View>
    );
  }

  const salvando = crea.isPending || modifica.isPending;
  const erroreForm = crea.isError || modifica.isError ? messaggioErrore(crea.error ?? modifica.error) : null;

  return (
    <BentoScreen>
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
          occorrenzePerGiorno={occorrenzePerGiorno}
          giornoSelezionato={giornoSelezionato}
          onSelezionaGiorno={selezionaGiorno}
        />
      </View>

      {/* B. Occorrenze del giorno selezionato, appiattite come il feed di Home. */}
      <View style={styles.sezioneLista}>
        <Text style={styles.etichettaGiorno}>
          {format(new Date(`${giornoSelezionato}T00:00:00`), 'EEEE d MMMM', { locale: it })}
        </Text>

        <BloccoDuro offset={4} colore={colori.scuro} raggio={16} contenutoStyle={styles.feed}>
          {occorrenzeDelGiorno.length === 0 ? (
            <View style={styles.feedVuoto}>
              <Text style={styles.testoFeedVuoto}>Nessun impegno in questo giorno.</Text>
            </View>
          ) : (
            <View style={styles.righeFeed}>
              {occorrenzeDelGiorno.map((occorrenza) => {
                const impegno = impegniPerId.get(occorrenza.impegno_id);
                const eliminandoQuesta = cancella.isPending && cancella.variables === impegno?.id;
                const erroreEliminazione =
                  cancella.isError && cancella.variables === impegno?.id ? cancella.error : null;
                const nomeAssegnato =
                  impegno?.assegnato_a !== null && impegno?.assegnato_a !== undefined
                    ? membriAttivi.find((m) => m.id === impegno.assegnato_a)?.nome ?? 'Membro non più nel gruppo'
                    : null;

                return (
                  <View key={occorrenza.id} style={styles.rigaFeed}>
                    <View style={[styles.barraFeed, { backgroundColor: coloreCiclico(occorrenza.impegno_id) }]} />
                    <View style={styles.testoFeed}>
                      <View style={styles.cimaFeed}>
                        <Text style={styles.titoloFeed} numberOfLines={1}>
                          {impegno?.titolo ?? 'Impegno'}
                        </Text>
                        <Text style={styles.oraFeed}>{impegno?.ora ?? 'Tutto il giorno'}</Text>
                      </View>
                      {nomeAssegnato !== null && (
                        <Text style={styles.metaFeed}>Assegnato a {nomeAssegnato}</Text>
                      )}
                      {impegno !== undefined && (
                        <View style={styles.azioniFeed}>
                          <Pressable onPress={() => apriModifica(impegno)} hitSlop={8}>
                            <Text style={styles.testoAzioneFeed}>Modifica</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => chiediEliminazione(impegno)}
                            disabled={eliminandoQuesta}
                            hitSlop={8}
                          >
                            <Text style={[styles.testoAzioneFeed, styles.testoEliminaFeed]}>
                              {eliminandoQuesta ? 'Eliminazione…' : 'Elimina'}
                            </Text>
                          </Pressable>
                        </View>
                      )}
                      {erroreEliminazione !== null && (
                        <Text style={styles.testoErroreRiga}>{messaggioErrore(erroreEliminazione)}</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <Pressable
            onPress={() => (modaleAperto !== null ? chiudiModale() : apriCrea())}
            style={styles.ctaFeed}
          >
            <Feather name={modaleAperto !== null ? 'x' : 'plus'} size={13} color={colori.crema} />
            <Text style={styles.testoCtaFeed}>
              {modaleAperto !== null ? 'Chiudi' : 'Nuovo impegno'}
            </Text>
          </Pressable>
        </BloccoDuro>
      </View>

      {/* C. Form di creazione/modifica - chrome a parte in ModificaImpegno.tsx. */}
      {modaleAperto !== null && (
        <View style={styles.sezioneForm}>
          <ModificaImpegno
            // key: ModificaImpegno legge valoriIniziali solo al mount. Senza una key
            // che cambia con il target, passare da "modifica A" a "modifica B" (o da
            // crea a modifica) senza chiudere il form riusa l'istanza e mostra ancora
            // i valori di A mentre si salva su B.
            key={modaleAperto === 'modifica' ? impegnoInModifica?.id ?? 'modifica' : 'crea'}
            valoriIniziali={valoriInizialiForm()}
            membri={membriAttivi}
            membroAssegnatoNonAttivo={
              impegnoInModifica?.assegnato_a !== null && impegnoInModifica?.assegnato_a !== undefined
                ? membri.find((m) => m.id === impegnoInModifica.assegnato_a && m.uscito_il !== null) ?? null
                : null
            }
            salvando={salvando}
            onSalva={onSalvaForm}
            onAnnulla={chiudiModale}
          />
          {erroreForm !== null && <Text style={styles.testoErrore}>{erroreForm}</Text>}
        </View>
      )}
    </BentoScreen>
  );
}

const styles = StyleSheet.create({
  centrato: {
    flex: 1,
    backgroundColor: colori.crema,
    alignItems: 'center',
    justifyContent: 'center',
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
  metaFeed: {
    ...pesi.bold,
    fontSize: 11,
    color: colori.soft,
    marginTop: 2,
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
});
