import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Redirect, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Frequenza, OrigineDelPunteggio } from '@/api/faccende';
import type { OccorrenzaFaccenda } from '@/api/occorrenzeFaccende';
import { calcolaClassifica } from '@/calcolo/classificaFaccende';
import { stimaPunti, suggerisciSforzo, type Sforzo } from '@/calcolo/puntiFaccende';
import { dataLocaleISO, fineSettimanaISO, inizioSettimanaISO } from '@/calcolo/ricorrenzaFaccende';
import { BloccoDuro } from '@/components/BloccoDuro';
import { PARETE } from '@/components/Vassoio';
import { useFaccende } from '@/hooks/useFaccende';
import { useGruppoAttivo } from '@/hooks/useGruppoAttivo';
import { useImpostazioniFaccende } from '@/hooks/useImpostazioniFaccende';
import { useOccorrenzeFaccende } from '@/hooks/useOccorrenzeFaccende';
import { useStoricoFaccende } from '@/hooks/useStoricoFaccende';
import { confermaAzione } from '@/lib/conferma';
import { messaggioErrore } from '@/lib/messaggioErrore';
import { useAuthStore } from '@/store/authStore';
import { useGruppoAttivoStore } from '@/store/gruppoAttivoStore';
import { coloreCiclico, coloriNB as colori, pesiNB as pesi } from '@/theme/neoBrutalista';

const ETICHETTA_FREQUENZA: Record<Frequenza, string> = {
  giornaliera: 'Giornaliera',
  settimanale: 'Settimanale',
  mensile: 'Mensile',
  personalizzata: 'Personalizzata',
  una_tantum: 'Una tantum',
};

const GIORNI_SETTIMANA = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const SFORZI: Sforzo[] = ['basso', 'medio', 'alto'];
const FREQUENZE: Frequenza[] = ['giornaliera', 'settimanale', 'mensile', 'personalizzata', 'una_tantum'];

type Filtro = 'oggi' | 'settimana' | 'mese' | 'da_fare' | 'completate';

function Cerchietto({ nome, dimensione = 24 }: { nome: string; dimensione?: number }) {
  return (
    <View
      style={[
        styles.cerchietto,
        { width: dimensione, height: dimensione, borderRadius: dimensione / 2, backgroundColor: coloreCiclico(nome) },
      ]}
    >
      <Text style={[styles.inizialeCerchietto, { fontSize: dimensione * 0.4 }]}>
        {(nome.trim().charAt(0) || '?').toUpperCase()}
      </Text>
    </View>
  );
}

export default function Faccende() {
  const gruppoAttivoId = useGruppoAttivoStore((stato) => stato.gruppoAttivoId);

  if (gruppoAttivoId === null) {
    return <Redirect href="/gruppi" />;
  }

  return <FaccendeDelGruppo gruppoAttivoId={gruppoAttivoId} />;
}

function FaccendeDelGruppo({ gruppoAttivoId }: { gruppoAttivoId: string }) {
  const insets = useSafeAreaInsets();
  const { membriAttivi, isLoading: gruppoInCaricamento } = useGruppoAttivo();
  const utenteId = useAuthStore((stato) => stato.session?.user.id);
  const ilMioMembroId = membriAttivi.find((m) => m.utente_id === utenteId)?.id ?? null;

  const {
    impostazioni,
    moduloAttivo,
    isLoading: impostazioniInCaricamento,
    attiva,
  } = useImpostazioniFaccende(gruppoAttivoId);
  const fusoOrario = impostazioni?.fuso_orario ?? 'Europe/Rome';

  const { faccende, crea, aggiorna, archivia, elimina, importaSuggerite } = useFaccende(gruppoAttivoId);
  const {
    occorrenze,
    isLoading: occorrenzeInCaricamento,
    error: erroreOccorrenze,
    sincronizza,
    completa,
    annullaCompletamento,
  } = useOccorrenzeFaccende(gruppoAttivoId, fusoOrario);
  const { storico } = useStoricoFaccende(gruppoAttivoId);

  // Nessun timer: una sola sincronizzazione quando la pagina si apre con il
  // modulo già attivo. La correttezza non dipende da QUANDO questo gira
  // (vedi sincronizzaOccorrenze), solo dal fatto che giri prima o poi.
  useEffect(() => {
    if (moduloAttivo) {
      sincronizza.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduloAttivo, gruppoAttivoId]);

  const [filtro, setFiltro] = useState<Filtro>('oggi');
  const [formVisibile, setFormVisibile] = useState(false);
  const [idInModifica, setIdInModifica] = useState<string | null>(null);
  const [menuFaccenda, setMenuFaccenda] = useState<{ id: string; nome: string } | null>(null);

  const [nome, setNome] = useState('');
  const [descrizione, setDescrizione] = useState('');
  const [frequenza, setFrequenza] = useState<Frequenza>('giornaliera');
  const [intervalloGiorni, setIntervalloGiorni] = useState('3');
  const [giorniSettimana, setGiorniSettimana] = useState<number[]>([]);
  const [giornoMese, setGiornoMese] = useState('1');
  const [durata, setDurata] = useState('15');
  // null = non ancora toccato a mano: segue il suggerimento calcolato dalla
  // durata. Derivare durante il render (invece di un useEffect + setState)
  // evita render a cascata non necessari.
  const [sforzoManualeValore, setSforzoManualeValore] = useState<Sforzo | null>(null);
  const [punteggioManualeValore, setPunteggioManualeValore] = useState<string | null>(null);
  const [origineSelezionata, setOrigineSelezionata] = useState<OrigineDelPunteggio>('stima_automatica');
  const [assegnataA, setAssegnataA] = useState<string | null>(null);
  const [erroreForm, setErroreForm] = useState<string | null>(null);

  const durataNumForm = Number(durata);
  const durataValida = Number.isFinite(durataNumForm) && durataNumForm > 0;
  const sforzoSuggerito = durataValida ? suggerisciSforzo(durataNumForm) : 'medio';
  const sforzo = sforzoManualeValore ?? sforzoSuggerito;
  const puntiSuggeriti = durataValida ? stimaPunti(durataNumForm, sforzo) : 1;
  const punti = punteggioManualeValore ?? String(puntiSuggeriti);
  const punteggioManuale = origineSelezionata === 'manuale';

  function sceglieSforzo(nuovoSforzo: Sforzo) {
    setSforzoManualeValore(nuovoSforzo);
    setOrigineSelezionata('manuale');
  }

  function modificaPuntiManualmente(testo: string) {
    setPunteggioManualeValore(testo);
    setOrigineSelezionata('manuale');
  }

  function ricalcolaStima() {
    setSforzoManualeValore(null);
    setPunteggioManualeValore(null);
    setOrigineSelezionata('stima_automatica');
  }

  function azzeraForm() {
    setNome('');
    setDescrizione('');
    setFrequenza('giornaliera');
    setIntervalloGiorni('3');
    setGiorniSettimana([]);
    setGiornoMese('1');
    setDurata('15');
    setSforzoManualeValore(null);
    setPunteggioManualeValore(null);
    setOrigineSelezionata('stima_automatica');
    setAssegnataA(null);
    setErroreForm(null);
    setIdInModifica(null);
    setFormVisibile(false);
  }

  function apriModifica(faccendaId: string) {
    const f = faccende.find((x) => x.id === faccendaId);
    if (f === undefined) {
      return;
    }
    setIdInModifica(f.id);
    setNome(f.nome);
    setDescrizione(f.descrizione ?? '');
    setFrequenza(f.frequenza);
    setIntervalloGiorni(String(f.intervallo_ricorrenza ?? 3));
    const parametri = (f.parametri_ricorrenza ?? {}) as Record<string, unknown>;
    let giorniLetti: number[] = [];
    if (Array.isArray(parametri.giorni_settimana)) {
      giorniLetti = (parametri.giorni_settimana as unknown[]).filter((v): v is number => typeof v === 'number');
    } else if (typeof parametri.giorno_settimana === 'number') {
      giorniLetti = [parametri.giorno_settimana];
    }
    setGiorniSettimana(giorniLetti);
    setGiornoMese(String(typeof parametri.giorno_mese === 'number' ? parametri.giorno_mese : 1));
    setDurata(String(f.durata_stimata_minuti ?? 15));
    // Mostra i valori già salvati (non li marca "modificati a mano" da sé:
    // l'origine resta quella con cui la faccenda era stata salvata finché
    // non si tocca di nuovo sforzo o punteggio in questa sessione).
    setSforzoManualeValore(f.sforzo);
    setPunteggioManualeValore(String(f.punti));
    setOrigineSelezionata(f.origine_punteggio);
    setAssegnataA(f.assegnata_a);
    setErroreForm(null);
    setFormVisibile(true);
  }

  function inviaForm() {
    const nomePulito = nome.trim();
    if (nomePulito === '') {
      setErroreForm('Inserisci un nome per la faccenda.');
      return;
    }
    const puntiNum = Number(punti);
    if (!Number.isInteger(puntiNum) || puntiNum <= 0) {
      setErroreForm('Il punteggio deve essere un numero intero positivo.');
      return;
    }
    const intervalloNum = Number(intervalloGiorni);
    if (frequenza === 'personalizzata' && (!Number.isInteger(intervalloNum) || intervalloNum <= 0)) {
      setErroreForm('Indica ogni quanti giorni ripetere questa faccenda.');
      return;
    }
    const durataNum = Number(durata);
    const origine: OrigineDelPunteggio = origineSelezionata;

    const campi = {
      nome: nomePulito,
      descrizione: descrizione.trim() === '' ? null : descrizione.trim(),
      frequenza,
      intervalloRicorrenza: frequenza === 'personalizzata' ? intervalloNum : null,
      giorniSettimana: frequenza === 'settimanale' ? (giorniSettimana.length > 0 ? giorniSettimana : null) : null,
      giornoMese: frequenza === 'mensile' ? Number(giornoMese) : null,
      durataStimataMinuti: Number.isFinite(durataNum) && durataNum > 0 ? durataNum : null,
      sforzo,
      punti: puntiNum,
      origine,
      assegnataA,
    };

    setErroreForm(null);

    if (idInModifica !== null) {
      aggiorna.mutate({ id: idInModifica, ...campi }, { onSuccess: azzeraForm });
    } else {
      crea.mutate(
        { ...campi, creatoDaMembroId: ilMioMembroId },
        {
          onSuccess: () => {
            azzeraForm();
            // Senza questo, una faccenda appena creata non ha ancora
            // nessuna occorrenza: sincronizza.mutate() gira solo una
            // volta all'apertura della pagina (vedi l'useEffect sopra),
            // quindi senza rilanciarlo qui "Oggi" resta vuoto - nessuna
            // riga, quindi nessun pulsante "Fatto" - finché non si
            // ricarica la pagina.
            sincronizza.mutate();
          },
        }
      );
    }
  }

  async function chiediArchiviazione(faccendaId: string, nomeFaccenda: string) {
    const conferma = await confermaAzione(
      'Archiviare questa faccenda?',
      `"${nomeFaccenda}" non genererà più nuove attività. Le occorrenze e i punti già registrati restano consultabili nello storico.`,
      'Archivia'
    );
    if (conferma) {
      archivia.mutate(faccendaId);
    }
  }

  async function chiediEliminazione(faccendaId: string, nomeFaccenda: string) {
    const conferma = await confermaAzione(
      'Eliminare questa faccenda?',
      `"${nomeFaccenda}" e tutte le sue occorrenze verranno eliminate definitivamente. Lo storico dei punti già guadagnati sarà rimosso.`,
      'Elimina'
    );
    if (conferma) {
      elimina.mutate(faccendaId);
    }
  }

  function mostraMenuFaccenda(faccendaId: string, nomeFaccenda: string) {
    archivia.reset();
    elimina.reset();
    setMenuFaccenda({ id: faccendaId, nome: nomeFaccenda });
  }

  function chiudiMenuFaccenda() {
    setMenuFaccenda(null);
  }

  async function chiediAnnullamento(occorrenza: OccorrenzaFaccenda, nomeFaccenda: string) {
    const conferma = await confermaAzione(
      'Annullare questo completamento?',
      `"${nomeFaccenda}" tornerà tra le attività da fare e i punti guadagnati verranno rimossi dalla classifica.`,
      'Annulla completamento'
    );
    if (conferma) {
      annullaCompletamento.mutate(occorrenza.id);
    }
  }

  function tornaIndietro() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/gruppi');
    }
  }

  const oggiISO = dataLocaleISO(new Date(), fusoOrario);
  const inizioSettimanaCorrente = inizioSettimanaISO(oggiISO);
  const fineSettimanaCorrente = fineSettimanaISO(oggiISO);
  const inizioMeseCorrente = `${oggiISO.slice(0, 7)}-01`;

  const faccendePerId = useMemo(() => new Map(faccende.map((f) => [f.id, f])), [faccende]);
  const faccendeAttive = useMemo(() => faccende.filter((f) => f.attiva), [faccende]);

  const occorrenzeDiQuestaSettimana = useMemo(
    () =>
      occorrenze.filter((o) => o.periodo_inizio <= fineSettimanaCorrente && o.periodo_fine >= inizioSettimanaCorrente),
    [occorrenze, fineSettimanaCorrente, inizioSettimanaCorrente]
  );

  const classifica = useMemo(() => {
    const completateQuestaSettimana = occorrenze.filter(
      (o) =>
        o.stato === 'completata' &&
        o.completata_il !== null &&
        o.completata_da !== null &&
        dataLocaleISO(new Date(o.completata_il), fusoOrario) >= inizioSettimanaCorrente &&
        dataLocaleISO(new Date(o.completata_il), fusoOrario) <= fineSettimanaCorrente
    );
    return calcolaClassifica(
      completateQuestaSettimana.map((o) => ({ membroId: o.completata_da as string, punti: o.punti_previsti })),
      membriAttivi.map((m) => m.id)
    );
  }, [occorrenze, fusoOrario, inizioSettimanaCorrente, fineSettimanaCorrente, membriAttivi]);

  const completatePrevisteQuestaSettimana = occorrenzeDiQuestaSettimana.filter((o) => o.stato === 'completata').length;

  const occorrenzeFiltrate = useMemo(() => {
    switch (filtro) {
      case 'oggi':
        return occorrenze.filter((o) => o.periodo_inizio <= oggiISO && o.periodo_fine >= oggiISO);
      case 'settimana':
        return occorrenzeDiQuestaSettimana;
      case 'mese':
        return occorrenze.filter((o) => o.periodo_fine >= inizioMeseCorrente);
      case 'da_fare':
        return occorrenze.filter((o) => o.stato === 'da_fare');
      case 'completate':
        return occorrenze.filter((o) => o.stato === 'completata');
      default:
        return occorrenze;
    }
  }, [occorrenze, filtro, oggiISO, occorrenzeDiQuestaSettimana, inizioMeseCorrente]);

  if (impostazioniInCaricamento || gruppoInCaricamento) {
    return (
      <View style={styles.centrato}>
        <ActivityIndicator color={colori.scuro} />
      </View>
    );
  }

  if (!moduloAttivo) {
    return (
      <View style={styles.schermo}>
        <View style={[styles.contenuto, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.rigaTitolo}>
            <Pressable onPress={tornaIndietro} hitSlop={8}>
              <BloccoDuro offset={2} colore={colori.panna} raggio={10} contenutoStyle={styles.quadrato}>
                <Feather name="arrow-left" size={17} color={colori.scuro} />
              </BloccoDuro>
            </Pressable>
            <Text style={styles.titolo}>Faccende</Text>
          </View>
          <View style={styles.statoIniziale}>
            <Feather name="check-square" size={48} color={colori.scuro} />
            <Text style={styles.statoIninizialeTitolo}>Attiva le Faccende di casa</Text>
            <Text style={styles.statoInizialeTesto}>
              Organizza le attività domestiche ricorrenti del gruppo e tieni traccia dei punti guadagnati da ogni
              membro completandole.
            </Text>
            <BloccoDuro
              style={attiva.isPending && styles.bottoneDisabilitato}
              offset={2.5}
              colore={colori.corallo}
              raggio={12}
              contenutoStyle={styles.bottonePieno}
              onPress={attiva.isPending ? undefined : () => attiva.mutate()}
            >
              {attiva.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.testoBottonePieno}>Attiva per questo gruppo</Text>
              )}
            </BloccoDuro>
            {attiva.isError && <Text style={styles.testoErrore}>{messaggioErrore(attiva.error)}</Text>}
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.schermo} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
          <Text style={styles.titolo}>Faccende</Text>
        </View>

        {/* A. Sfida di questa settimana: una fascia sola, non un vassoio a
            scomparti - è lettura di una graduatoria, non navigazione. */}
        <BloccoDuro offset={3.5} colore={colori.panna} raggio={17} contenutoStyle={styles.heroClassifica}>
          <Text style={styles.eyebrow}>Sfida di questa settimana</Text>
          <Text style={styles.progressoSettimana}>
            {completatePrevisteQuestaSettimana} di {occorrenzeDiQuestaSettimana.length} completate
          </Text>
          <View style={styles.binarioProgresso}>
            <View
              style={[
                styles.riempimentoProgresso,
                {
                  width: `${
                    occorrenzeDiQuestaSettimana.length > 0
                      ? Math.round((completatePrevisteQuestaSettimana / occorrenzeDiQuestaSettimana.length) * 100)
                      : 0
                  }%`,
                },
              ]}
            />
          </View>

          <View style={styles.classifica}>
            {classifica.map((voce) => {
              const membro = membriAttivi.find((m) => m.id === voce.membroId);
              const nomeMembro = membro?.nome ?? 'Membro';
              return (
                <View key={voce.membroId} style={styles.rigaClassifica}>
                  <Text style={styles.posizioneClassifica}>{voce.posizione}°</Text>
                  <Cerchietto nome={nomeMembro} />
                  <View style={styles.testiClassifica}>
                    <Text style={styles.nomeClassifica} numberOfLines={1}>{nomeMembro}</Text>
                    <Text style={styles.dettaglioClassifica} numberOfLines={1}>
                      {voce.faccendeCompletate} {voce.faccendeCompletate === 1 ? 'faccenda' : 'faccende'} completate
                    </Text>
                    <View style={styles.barraClassifica}>
                      <View style={[styles.riempimentoBarraClassifica, { width: `${voce.percentuale}%` }]} />
                    </View>
                  </View>
                  <Text style={styles.puntiClassifica}>{voce.punti} pt</Text>
                </View>
              );
            })}
          </View>
        </BloccoDuro>

        {/* B. Elenco attività */}
        <View style={styles.sezione}>
          <View style={styles.rigaFiltri}>
            {(
              [
                ['oggi', 'Oggi'],
                ['settimana', 'Settimana'],
                ['mese', 'Mese'],
                ['da_fare', 'Da fare'],
                ['completate', 'Completate'],
              ] as [Filtro, string][]
            ).map(([valore, etichetta]) => (
              <Pressable
                key={valore}
                onPress={() => setFiltro(valore)}
                style={[styles.chip, filtro === valore && styles.chipAttivo]}
              >
                <Text style={styles.testoChip}>{etichetta}</Text>
              </Pressable>
            ))}
          </View>

          {occorrenzeInCaricamento ? (
            <ActivityIndicator style={styles.caricamentoLista} color={colori.scuro} />
          ) : erroreOccorrenze !== null && erroreOccorrenze !== undefined ? (
            <Text style={styles.testoStatoLista}>Non riesco a caricare le attività al momento.</Text>
          ) : occorrenzeFiltrate.length === 0 ? (
            <Text style={styles.testoStatoLista}>Nessuna attività in questo filtro.</Text>
          ) : (
            <BloccoDuro offset={4} colore={colori.scuro} raggio={17} contenutoStyle={styles.elenco}>
              <View style={styles.righe}>
                {occorrenzeFiltrate.map((occorrenza) => {
                  const faccenda = faccendePerId.get(occorrenza.faccenda_id);
                  const assegnatario =
                    faccenda?.assegnata_a !== null && faccenda?.assegnata_a !== undefined
                      ? membriAttivi.find((m) => m.id === faccenda.assegnata_a)?.nome ?? null
                      : null;
                  const completandoQuesta = completa.isPending && completa.variables === occorrenza.id;
                  const annullandoQuesta =
                    annullaCompletamento.isPending && annullaCompletamento.variables === occorrenza.id;
                  const erroreCompletamento =
                    completa.isError && completa.variables === occorrenza.id ? completa.error : null;
                  const erroreAnnullamento =
                    annullaCompletamento.isError && annullaCompletamento.variables === occorrenza.id
                      ? annullaCompletamento.error
                      : null;

                  return (
                    <View key={occorrenza.id} style={styles.riga}>
                      {occorrenza.stato === 'completata' && (
                        <View style={styles.badgeCompletata}>
                          <Feather name="check" size={12} color={colori.scuro} />
                        </View>
                      )}
                      <View style={styles.testiRiga}>
                        <Text
                          style={[styles.nomeRiga, occorrenza.stato === 'completata' && styles.nomeRigaCompletata]}
                          numberOfLines={1}
                        >
                          {faccenda?.nome ?? 'Faccenda'}
                        </Text>
                        <View style={styles.metaRiga}>
                          <Text style={styles.testoMeta}>
                            {faccenda !== undefined ? ETICHETTA_FREQUENZA[faccenda.frequenza] : ''} ·{' '}
                            {occorrenza.punti_previsti} pt
                            {assegnatario !== null ? ` · ${assegnatario}` : ''}
                          </Text>
                          <Text
                            style={[
                              styles.tagStato,
                              occorrenza.stato === 'completata' && styles.tagCompletata,
                              occorrenza.stato === 'scaduta' && styles.tagScaduta,
                            ]}
                          >
                            {occorrenza.stato === 'da_fare'
                              ? 'Da fare'
                              : occorrenza.stato === 'completata'
                                ? 'Completata'
                                : 'Scaduta'}
                          </Text>
                        </View>
                        {erroreCompletamento !== null && (
                          <Text style={styles.testoErroreRiga}>{messaggioErrore(erroreCompletamento)}</Text>
                        )}
                        {erroreAnnullamento !== null && (
                          <Text style={styles.testoErroreRiga}>{messaggioErrore(erroreAnnullamento)}</Text>
                        )}
                      </View>

                      {occorrenza.stato === 'da_fare' && (
                        <Pressable
                          onPress={() => completa.mutate(occorrenza.id)}
                          disabled={completandoQuesta}
                          style={[styles.bottoneFatto, completandoQuesta && styles.bottoneDisabilitato]}
                        >
                          {completandoQuesta ? (
                            <ActivityIndicator color={colori.scuro} size="small" />
                          ) : (
                            <Feather name="check" size={14} color={colori.scuro} />
                          )}
                        </Pressable>
                      )}
                      {occorrenza.stato === 'completata' && (
                        <Pressable
                          onPress={() => chiediAnnullamento(occorrenza, faccenda?.nome ?? 'Faccenda')}
                          disabled={annullandoQuesta}
                          hitSlop={8}
                        >
                          <Text style={styles.linkAnnulla}>{annullandoQuesta ? 'Annullamento…' : 'Annulla'}</Text>
                        </Pressable>
                      )}
                    </View>
                  );
                })}
              </View>
            </BloccoDuro>
          )}
        </View>

        {/* C. Le tue faccende: form + elenco definizioni */}
        <View style={styles.sezione}>
          <View style={styles.rigaSezioneAzione}>
            <Text style={styles.titoloSezione}>Le tue faccende</Text>
            <Pressable onPress={() => (formVisibile ? azzeraForm() : setFormVisibile(true))} hitSlop={8}>
              <Text style={styles.linkAzioneSezione}>{formVisibile ? 'Chiudi' : 'Aggiungi'}</Text>
            </Pressable>
          </View>

          {!formVisibile && faccendeAttive.length === 0 && (
            <View>
              <Pressable
                style={styles.bottoneSecondario}
                onPress={() => importaSuggerite.mutate()}
                disabled={importaSuggerite.isPending}
              >
                {importaSuggerite.isPending ? (
                  <ActivityIndicator color={colori.scuro} />
                ) : (
                  <Text style={styles.testoBottoneSecondario}>Carica faccende suggerite</Text>
                )}
              </Pressable>
              {importaSuggerite.isError && (
                <Text style={styles.testoErrore}>{messaggioErrore(importaSuggerite.error)}</Text>
              )}
            </View>
          )}

          {formVisibile && (
            <BloccoDuro offset={3} colore={colori.panna} raggio={16} contenutoStyle={styles.cardForm}>
              <TextInput
                style={styles.input}
                placeholder="Nome (es. Lavare i piatti)"
                placeholderTextColor={colori.soft}
                value={nome}
                onChangeText={setNome}
              />
              <TextInput
                style={styles.input}
                placeholder="Descrizione (opzionale)"
                placeholderTextColor={colori.soft}
                value={descrizione}
                onChangeText={setDescrizione}
              />

              <Text style={styles.etichettaCampo}>Frequenza</Text>
              <View style={styles.rigaChip}>
                {FREQUENZE.map((f) => (
                  <Pressable
                    key={f}
                    onPress={() => setFrequenza(f)}
                    style={[styles.chip, frequenza === f && styles.chipAttivo]}
                  >
                    <Text style={styles.testoChip}>{ETICHETTA_FREQUENZA[f]}</Text>
                  </Pressable>
                ))}
              </View>

              {frequenza === 'personalizzata' && (
                <>
                  <Text style={styles.etichettaCampo}>Ogni quanti giorni</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Es. 3"
                    placeholderTextColor={colori.soft}
                    keyboardType="number-pad"
                    value={intervalloGiorni}
                    onChangeText={setIntervalloGiorni}
                  />
                </>
              )}

              {frequenza === 'settimanale' && (
                <>
                  <Text style={styles.etichettaCampo}>Giorni previsti</Text>
                  <View style={styles.rigaChip}>
                    <Pressable
                      onPress={() => setGiorniSettimana([])}
                      style={[styles.chip, giorniSettimana.length === 0 && styles.chipAttivo]}
                    >
                      <Text style={styles.testoChip}>Qualsiasi</Text>
                    </Pressable>
                    {GIORNI_SETTIMANA.map((g, indice) => {
                      const num = indice + 1;
                      const selezionato = giorniSettimana.includes(num);
                      return (
                        <Pressable
                          key={g}
                          onPress={() =>
                            setGiorniSettimana((prev) =>
                              selezionato ? prev.filter((d) => d !== num) : [...prev, num].sort((a, b) => a - b)
                            )
                          }
                          style={[styles.chip, selezionato && styles.chipAttivo]}
                        >
                          <Text style={styles.testoChip}>{g}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              )}

              {frequenza === 'mensile' && (
                <>
                  <Text style={styles.etichettaCampo}>Giorno del mese (1-31)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Es. 15"
                    placeholderTextColor={colori.soft}
                    keyboardType="number-pad"
                    value={giornoMese}
                    onChangeText={setGiornoMese}
                  />
                </>
              )}

              <Text style={styles.etichettaCampo}>Durata stimata (minuti)</Text>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={durata}
                onChangeText={setDurata}
              />

              <Text style={styles.etichettaCampo}>Sforzo</Text>
              <View style={styles.rigaChip}>
                {SFORZI.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => sceglieSforzo(s)}
                    style={[styles.chip, sforzo === s && styles.chipAttivo]}
                  >
                    <Text style={styles.testoChip}>{s === 'basso' ? 'Basso' : s === 'medio' ? 'Medio' : 'Alto'}</Text>
                  </Pressable>
                ))}
              </View>

              {/* "Deriva finché non tocchi" (11.5): stima finché l'origine è
                  automatica, poi la scelta esplicita dell'utente - lo stato
                  resta sempre leggibile nell'etichetta sopra il campo. */}
              <Text style={styles.etichettaCampo}>
                Punteggio {punteggioManuale ? '(modificato a mano)' : '(stima automatica)'}
              </Text>
              <View style={styles.rigaPunteggio}>
                <TextInput
                  style={[styles.input, styles.inputPunteggio]}
                  keyboardType="number-pad"
                  value={punti}
                  onChangeText={modificaPuntiManualmente}
                />
                {punteggioManuale && (
                  <Pressable onPress={ricalcolaStima} hitSlop={8}>
                    <Text style={styles.linkRicalcola}>Ricalcola</Text>
                  </Pressable>
                )}
              </View>

              <Text style={styles.etichettaCampo}>Assegnata a</Text>
              <View style={styles.rigaChip}>
                <Pressable
                  onPress={() => setAssegnataA(null)}
                  style={[styles.chip, assegnataA === null && styles.chipAttivo]}
                >
                  <Text style={styles.testoChip}>Chiunque</Text>
                </Pressable>
                {membriAttivi.map((m) => (
                  <Pressable
                    key={m.id}
                    onPress={() => setAssegnataA(m.id)}
                    style={[styles.chip, assegnataA === m.id && styles.chipAttivo]}
                  >
                    <Text style={styles.testoChip}>{m.nome}</Text>
                  </Pressable>
                ))}
              </View>

              {erroreForm !== null && <Text style={styles.testoErrore}>{erroreForm}</Text>}
              {erroreForm === null && (crea.isError || aggiorna.isError) && (
                <Text style={styles.testoErrore}>{messaggioErrore(crea.error ?? aggiorna.error)}</Text>
              )}

              <BloccoDuro
                style={(crea.isPending || aggiorna.isPending) && styles.bottoneDisabilitato}
                offset={2.5}
                colore={colori.corallo}
                raggio={12}
                contenutoStyle={styles.bottonePieno}
                onPress={crea.isPending || aggiorna.isPending ? undefined : inviaForm}
              >
                {crea.isPending || aggiorna.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.testoBottonePieno}>
                    {idInModifica !== null ? 'Salva modifiche' : 'Aggiungi faccenda'}
                  </Text>
                )}
              </BloccoDuro>
            </BloccoDuro>
          )}

          {faccendeAttive.length > 0 && (
            <BloccoDuro offset={4} colore={colori.scuro} raggio={16} contenutoStyle={styles.elenco}>
              <View style={styles.righe}>
                {faccendeAttive.map((f) => (
                  <View key={f.id} style={styles.rigaDefinizione}>
                    <View style={styles.testiRiga}>
                      <Text style={styles.nomeRiga} numberOfLines={1}>{f.nome}</Text>
                      <Text style={styles.testoMeta}>
                        {ETICHETTA_FREQUENZA[f.frequenza]} · {f.punti} pt
                      </Text>
                    </View>
                    <Pressable onPress={() => mostraMenuFaccenda(f.id, f.nome)} hitSlop={10} style={styles.bottoneMenu}>
                      <Feather name="more-vertical" size={15} color={colori.soft} />
                    </Pressable>
                  </View>
                ))}
              </View>
            </BloccoDuro>
          )}
          {(archivia.isError || elimina.isError) && (
            <Text style={styles.testoErrore}>{messaggioErrore(archivia.error ?? elimina.error)}</Text>
          )}
        </View>

        {/* D. Storico */}
        <View style={styles.sezione}>
          <Text style={styles.titoloSezione}>Storico</Text>
          {storico.length === 0 ? (
            <Text style={styles.testoStatoLista}>Nessun evento ancora.</Text>
          ) : (
            <BloccoDuro offset={4} colore={colori.scuro} raggio={16} contenutoStyle={styles.elenco}>
              <View style={styles.righe}>
                {storico.slice(0, 30).map((evento) => {
                  const occorrenza = occorrenze.find((o) => o.id === evento.occorrenza_id);
                  const faccenda = occorrenza !== undefined ? faccendePerId.get(occorrenza.faccenda_id) : undefined;
                  const membro = membriAttivi.find((m) => m.id === evento.membro_id);
                  const nomeMembro = membro?.nome ?? 'Un membro';
                  const positivo = evento.punti >= 0;
                  return (
                    <View key={evento.id} style={styles.rigaStorico}>
                      <Cerchietto nome={nomeMembro} />
                      <View style={styles.testiRiga}>
                        <Text style={styles.nomeRiga} numberOfLines={2}>
                          {nomeMembro} {evento.tipo_evento === 'completata' ? 'ha completato' : 'ha annullato'} «
                          {faccenda?.nome ?? 'una faccenda'}»
                        </Text>
                        <Text style={styles.testoMeta}>
                          {format(new Date(evento.creato_il), "d MMM yyyy, HH:mm", { locale: it })}
                        </Text>
                      </View>
                      <Text style={[styles.puntiStorico, positivo ? styles.puntiPositivi : styles.puntiNegativi]}>
                        {positivo ? '+' : ''}
                        {evento.punti} pt
                      </Text>
                    </View>
                  );
                })}
              </View>
            </BloccoDuro>
          )}
        </View>
      </ScrollView>

      {/* Bottom sheet azione faccenda — cross-platform, niente Alert.alert */}
      <Modal transparent visible={menuFaccenda !== null} animationType="slide" onRequestClose={chiudiMenuFaccenda}>
        <Pressable style={styles.sfondoMenu} onPress={chiudiMenuFaccenda}>
          <Pressable style={styles.foglioMenu} onPress={() => { /* blocca propagazione */ }}>
            <Text style={styles.titoloMenu} numberOfLines={1}>{menuFaccenda?.nome}</Text>
            <View style={styles.separatoreMenu} />
            <Pressable
              style={styles.voceMenu}
              onPress={() => {
                chiudiMenuFaccenda();
                apriModifica(menuFaccenda!.id);
              }}
            >
              <Text style={styles.testoVoceMenu}>Modifica</Text>
            </Pressable>
            <View style={styles.separatoreMenu} />
            <Pressable
              style={styles.voceMenu}
              onPress={() => {
                chiudiMenuFaccenda();
                void chiediArchiviazione(menuFaccenda!.id, menuFaccenda!.nome);
              }}
            >
              <Text style={styles.testoVoceMenu}>Archivia</Text>
            </Pressable>
            <View style={styles.separatoreMenu} />
            <Pressable
              style={styles.voceMenu}
              onPress={() => {
                chiudiMenuFaccenda();
                void chiediEliminazione(menuFaccenda!.id, menuFaccenda!.nome);
              }}
            >
              <Text style={[styles.testoVoceMenu, styles.testoEliminazione]}>Elimina</Text>
            </Pressable>
          </Pressable>

          <Pressable style={[styles.foglioMenu, styles.foglioAnnulla]} onPress={() => { /* blocca propagazione */ }}>
            <Pressable style={styles.voceMenu} onPress={chiudiMenuFaccenda}>
              <Text style={[styles.testoVoceMenu, styles.testoAnnulla]}>Annulla</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
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
  statoIniziale: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 60,
  },
  statoIninizialeTitolo: {
    ...pesi.extraBold,
    fontSize: 18,
    color: colori.scuro,
    marginTop: 8,
    textAlign: 'center',
  },
  statoInizialeTesto: {
    fontSize: 13,
    color: colori.soft,
    textAlign: 'center',
    marginBottom: 8,
  },
  heroClassifica: {
    padding: 13,
    gap: 9,
  },
  eyebrow: {
    ...pesi.extraBold,
    fontSize: 9.5,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colori.soft,
  },
  progressoSettimana: {
    ...pesi.extraBold,
    fontSize: 12,
    color: colori.scuro,
    marginTop: -4,
  },
  binarioProgresso: {
    height: 7,
    borderWidth: 1.5,
    borderColor: colori.scuro,
    borderRadius: 999,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  riempimentoProgresso: {
    height: '100%',
    backgroundColor: colori.menta,
  },
  classifica: {
    gap: 2,
  },
  rigaClassifica: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 7,
  },
  posizioneClassifica: {
    ...pesi.extraBold,
    width: 18,
    fontSize: 15,
    color: colori.scuro,
  },
  cerchietto: {
    borderWidth: 2,
    borderColor: colori.scuro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inizialeCerchietto: {
    ...pesi.extraBold,
    color: colori.scuro,
  },
  testiClassifica: {
    flex: 1,
    minWidth: 0,
  },
  nomeClassifica: {
    ...pesi.extraBold,
    fontSize: 12,
    color: colori.scuro,
  },
  dettaglioClassifica: {
    fontSize: 9.5,
    fontWeight: '600',
    color: colori.soft,
    marginTop: 1,
  },
  barraClassifica: {
    height: 5,
    borderWidth: 1.3,
    borderColor: colori.scuro,
    borderRadius: 999,
    backgroundColor: '#fff',
    overflow: 'hidden',
    marginTop: 4,
  },
  riempimentoBarraClassifica: {
    height: '100%',
    backgroundColor: colori.menta,
  },
  puntiClassifica: {
    ...pesi.extraBold,
    fontSize: 13.5,
    color: colori.scuro,
  },
  sezione: {
    gap: 10,
  },
  rigaSezioneAzione: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titoloSezione: {
    ...pesi.extraBold,
    fontSize: 13,
    color: colori.scuro,
  },
  linkAzioneSezione: {
    ...pesi.extraBold,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colori.viola,
  },
  rigaFiltri: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    borderWidth: 2,
    borderColor: colori.scuro,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
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
  caricamentoLista: {
    marginVertical: 12,
  },
  testoStatoLista: {
    ...pesi.bold,
    fontSize: 13,
    color: colori.soft,
    textAlign: 'center',
    paddingVertical: 12,
  },
  elenco: {
    borderRadius: 17 - 2.5,
    overflow: 'hidden',
    backgroundColor: colori.scuro,
  },
  righe: {
    gap: PARETE,
    backgroundColor: colori.scuro,
  },
  riga: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colori.panna,
    paddingVertical: 10,
    paddingHorizontal: 11,
    gap: 9,
  },
  badgeCompletata: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: colori.scuro,
    borderRadius: 6,
    backgroundColor: colori.menta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testiRiga: {
    flex: 1,
    minWidth: 0,
  },
  nomeRiga: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colori.scuro,
  },
  nomeRigaCompletata: {
    opacity: 0.8,
  },
  metaRiga: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
    marginTop: 2,
  },
  testoMeta: {
    fontSize: 9.5,
    fontWeight: '700',
    color: colori.soft,
  },
  tagStato: {
    ...pesi.extraBold,
    fontSize: 7.8,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colori.soft,
  },
  tagCompletata: {
    color: colori.menta,
  },
  tagScaduta: {
    color: colori.corallo,
  },
  bottoneFatto: {
    width: 30,
    height: 30,
    borderWidth: 2,
    borderColor: colori.scuro,
    borderRadius: 8,
    backgroundColor: colori.menta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottoneDisabilitato: {
    opacity: 0.5,
  },
  linkAnnulla: {
    ...pesi.extraBold,
    fontSize: 9.5,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: colori.corallo,
  },
  bottoneSecondario: {
    borderWidth: 2,
    borderColor: colori.scuro,
    borderRadius: 11,
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  testoBottoneSecondario: {
    ...pesi.extraBold,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colori.scuro,
  },
  cardForm: {
    padding: 13,
    gap: 9,
  },
  input: {
    borderWidth: 2,
    borderColor: colori.scuro,
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    fontWeight: '700',
    color: colori.scuro,
  },
  etichettaCampo: {
    ...pesi.extraBold,
    fontSize: 9,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colori.soft,
    marginTop: 2,
  },
  rigaChip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  rigaPunteggio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inputPunteggio: {
    flex: 1,
  },
  linkRicalcola: {
    ...pesi.extraBold,
    fontSize: 11,
    color: colori.viola,
  },
  testoErrore: {
    ...pesi.bold,
    fontSize: 12.5,
    color: colori.corallo,
    textAlign: 'center',
    marginTop: 4,
  },
  testoErroreRiga: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colori.corallo,
    marginTop: 3,
  },
  bottonePieno: {
    paddingVertical: 12,
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
  rigaDefinizione: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colori.panna,
    paddingVertical: 10,
    paddingHorizontal: 11,
    gap: 9,
  },
  bottoneMenu: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rigaStorico: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colori.panna,
    paddingVertical: 10,
    paddingHorizontal: 11,
    gap: 9,
  },
  puntiStorico: {
    ...pesi.extraBold,
    fontSize: 12.5,
  },
  puntiPositivi: {
    color: colori.menta,
  },
  puntiNegativi: {
    color: colori.corallo,
  },
  sfondoMenu: {
    flex: 1,
    backgroundColor: 'rgba(22,20,18,0.45)',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingBottom: 16,
    gap: 8,
  },
  foglioMenu: {
    backgroundColor: colori.panna,
    borderWidth: 2.5,
    borderColor: colori.scuro,
    borderRadius: 16,
    overflow: 'hidden',
  },
  foglioAnnulla: {
    marginTop: 2,
  },
  titoloMenu: {
    ...pesi.extraBold,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 12,
    color: colori.soft,
    textAlign: 'center',
  },
  separatoreMenu: {
    height: 2,
    backgroundColor: colori.scuro,
  },
  voceMenu: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  testoVoceMenu: {
    ...pesi.bold,
    fontSize: 16,
    color: colori.viola,
  },
  testoEliminazione: {
    color: colori.corallo,
  },
  testoAnnulla: {
    ...pesi.extraBold,
  },
});
