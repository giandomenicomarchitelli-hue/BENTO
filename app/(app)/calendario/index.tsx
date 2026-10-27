import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Redirect } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Impegno } from '@/api/impegni';
import { aggiungiMesi, dataLocaleISO } from '@/calcolo/ricorrenzaFaccende';
import { BentoScreen } from '@/components/BentoScreen';
import { CalendarioGriglia } from '@/components/CalendarioGriglia';
import { GlassCard } from '@/components/GlassCard';
import { ModificaImpegno, type ValoriImpegno } from '@/components/ModificaImpegno';
import { SectionHeader } from '@/components/SectionHeader';
import { useGruppoAttivo } from '@/hooks/useGruppoAttivo';
import { useImpegni } from '@/hooks/useImpegni';
import { confermaAzione } from '@/lib/conferma';
import { useAuthStore } from '@/store/authStore';
import { useGruppoAttivoStore } from '@/store/gruppoAttivoStore';
import { bento, semantica, spaziatura, tipografia } from '@/theme/tokens';

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
  const { membriAttivi, isLoading: gruppoInCaricamento } = useGruppoAttivo();
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

  // Raggruppamento per data locale nel fuso orario del gruppo, non per
  // fetta UTC ingenua di data_ora: altrimenti un'occorrenza vicina alla
  // mezzanotte finirebbe nel giorno sbagliato della griglia.
  const occorrenzePerGiorno = useMemo(() => {
    const mappa: Record<string, number> = {};
    for (const occorrenza of occorrenze) {
      const giorno = dataLocaleISO(new Date(occorrenza.data_ora), fusoOrario);
      mappa[giorno] = (mappa[giorno] ?? 0) + 1;
    }
    return mappa;
  }, [occorrenze, fusoOrario]);

  const occorrenzeDelGiorno = useMemo(
    () => occorrenze.filter((o) => dataLocaleISO(new Date(o.data_ora), fusoOrario) === giornoSelezionato),
    [occorrenze, fusoOrario, giornoSelezionato]
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
        <ActivityIndicator color={bento.testoPrimario} />
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
          occorrenzePerGiorno={occorrenzePerGiorno}
          giornoSelezionato={giornoSelezionato}
          onSelezionaGiorno={selezionaGiorno}
        />
      </View>

      {/* B. Occorrenze del giorno selezionato */}
      <View style={styles.sezione}>
        <SectionHeader
          titolo={format(new Date(`${giornoSelezionato}T00:00:00`), "d MMMM yyyy", { locale: it })}
        />

        {occorrenzeDelGiorno.length === 0 ? (
          <Text style={styles.testoStatoLista}>Nessun impegno in questo giorno.</Text>
        ) : (
          <View style={styles.elencoOccorrenze}>
            {occorrenzeDelGiorno.map((occorrenza) => {
              const impegno = impegniPerId.get(occorrenza.impegno_id);
              const eliminandoQuesta = cancella.isPending && cancella.variables === impegno?.id;
              const erroreEliminazione =
                cancella.isError && cancella.variables === impegno?.id ? cancella.error : null;

              return (
                <GlassCard key={occorrenza.id} elevazione="bassa">
                  <Text style={styles.titoloOccorrenza}>{impegno?.titolo ?? 'Impegno'}</Text>
                  {impegno?.descrizione !== null && impegno?.descrizione !== undefined && (
                    <Text style={styles.descrizioneOccorrenza}>{impegno.descrizione}</Text>
                  )}
                  <Text style={styles.oraOccorrenza}>{impegno?.ora ?? 'Tutto il giorno'}</Text>

                  {impegno !== undefined && (
                    <View style={styles.rigaAzioni}>
                      <Pressable onPress={() => apriModifica(impegno)} hitSlop={8}>
                        <Text style={styles.testoAzione}>Modifica</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => chiediEliminazione(impegno)}
                        disabled={eliminandoQuesta}
                        hitSlop={8}
                      >
                        <Text style={[styles.testoAzione, styles.testoElimina]}>
                          {eliminandoQuesta ? 'Eliminazione…' : 'Elimina'}
                        </Text>
                      </Pressable>
                    </View>
                  )}
                  {erroreEliminazione !== null && (
                    <Text style={styles.testoErroreRiga}>{messaggioErrore(erroreEliminazione)}</Text>
                  )}
                </GlassCard>
              );
            })}
          </View>
        )}
      </View>

      {/* C. Nuovo impegno / modifica */}
      <View style={styles.sezione}>
        <SectionHeader
          titolo="Impegni"
          azione={{
            etichetta: modaleAperto !== null ? 'Chiudi' : 'Nuovo impegno',
            onPress: () => (modaleAperto !== null ? chiudiModale() : apriCrea()),
          }}
        />

        {modaleAperto !== null && (
          <GlassCard>
            {/* key: ModificaImpegno legge valoriIniziali solo al mount. Senza una key
                che cambia con il target, passare da "modifica A" a "modifica B" (o da
                crea a modifica) senza chiudere il form riusa l'istanza e mostra ancora
                i valori di A mentre si salva su B. */}
            <ModificaImpegno
              key={modaleAperto === 'modifica' ? impegnoInModifica?.id ?? 'modifica' : 'crea'}
              valoriIniziali={valoriInizialiForm()}
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
  elencoOccorrenze: {
    gap: spaziatura.sm,
  },
  titoloOccorrenza: {
    fontSize: 15,
    fontWeight: '600',
    color: bento.testoPrimario,
  },
  descrizioneOccorrenza: {
    fontSize: 13,
    color: bento.testoSecondario,
    marginTop: 2,
  },
  oraOccorrenza: {
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
});
