import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Redirect } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { Frequenza, OrigineDelPunteggio } from '@/api/faccende';
import { calcolaClassifica } from '@/calcolo/classificaFaccende';
import { stimaPunti, suggerisciSforzo, type Sforzo } from '@/calcolo/puntiFaccende';
import { dataLocaleISO, fineSettimanaISO, inizioSettimanaISO } from '@/calcolo/ricorrenzaFaccende';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { BentoButton } from '@/components/BentoButton';
import { BentoScreen } from '@/components/BentoScreen';
import { GlassCard } from '@/components/GlassCard';
import { IconBadge } from '@/components/IconBadge';
import { SectionHeader } from '@/components/SectionHeader';
import { useFaccende } from '@/hooks/useFaccende';
import { useGruppoAttivo } from '@/hooks/useGruppoAttivo';
import { useImpostazioniFaccende } from '@/hooks/useImpostazioniFaccende';
import type { OccorrenzaFaccenda } from '@/api/occorrenzeFaccende';
import { useOccorrenzeFaccende } from '@/hooks/useOccorrenzeFaccende';
import { useStoricoFaccende } from '@/hooks/useStoricoFaccende';
import { confermaAzione } from '@/lib/conferma';
import { useAuthStore } from '@/store/authStore';
import { useGruppoAttivoStore } from '@/store/gruppoAttivoStore';
import { accenti, bento, raggio, semantica, spaziatura, tipografia } from '@/theme/tokens';

const ETICHETTA_FREQUENZA: Record<Frequenza, string> = {
  giornaliera: 'Giornaliera',
  settimanale: 'Settimanale',
  mensile: 'Mensile',
  personalizzata: 'Personalizzata',
  una_tantum: 'Una tantum',
};

const ETICHETTA_STATO: Record<OccorrenzaFaccenda['stato'], string> = {
  da_fare: 'Da fare',
  completata: 'Completata',
  scaduta: 'Scaduta',
};

const TONO_STATO: Record<OccorrenzaFaccenda['stato'], 'blu' | 'verde' | 'rosso'> = {
  da_fare: 'blu',
  completata: 'verde',
  scaduta: 'rosso',
};

const GIORNI_SETTIMANA = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const SFORZI: Sforzo[] = ['basso', 'medio', 'alto'];
const FREQUENZE: Frequenza[] = ['giornaliera', 'settimanale', 'mensile', 'personalizzata', 'una_tantum'];

type Filtro = 'oggi' | 'settimana' | 'mese' | 'da_fare' | 'completate';

/** Messaggio leggibile da un errore di rete/Supabase, senza assumere una forma precisa. */
function messaggioErrore(errore: unknown): string {
  if (errore instanceof Error && errore.message.trim() !== '') {
    return errore.message;
  }
  return 'Qualcosa è andato storto. Riprova.';
}

export default function Faccende() {
  const gruppoAttivoId = useGruppoAttivoStore((stato) => stato.gruppoAttivoId);

  if (gruppoAttivoId === null) {
    return <Redirect href="/gruppi" />;
  }

  return <FaccendeDelGruppo gruppoAttivoId={gruppoAttivoId} />;
}

function FaccendeDelGruppo({ gruppoAttivoId }: { gruppoAttivoId: string }) {
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
      crea.mutate({ ...campi, creatoDaMembroId: ilMioMembroId }, { onSuccess: azzeraForm });
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
        <ActivityIndicator color={bento.testoPrimario} />
      </View>
    );
  }

  if (!moduloAttivo) {
    return (
      <BentoScreen>
        <View style={styles.statoIniziale}>
          <IconBadge icona="check-square" colore={accenti.menta} dimensione={56} />
          <Text style={styles.statoIninizialeTitolo}>Attiva le Faccende di casa</Text>
          <Text style={styles.statoInizialeTesto}>
            Organizza le attività domestiche ricorrenti del gruppo e tieni traccia dei punti guadagnati da ogni
            membro completandole.
          </Text>
          <BentoButton
            etichetta="Attiva per questo gruppo"
            onPress={() => attiva.mutate()}
            caricando={attiva.isPending}
          />
          {attiva.isError && <Text style={styles.testoErrore}>{messaggioErrore(attiva.error)}</Text>}
        </View>
      </BentoScreen>
    );
  }

  return (
    <>
    <BentoScreen>
      {/* A. Riepilogo della sfida */}
      <GlassCard>
        <SectionHeader titolo="Sfida di questa settimana" />
        <Text style={styles.rangeSettimana}>
          {format(new Date(`${inizioSettimanaCorrente}T00:00:00`), 'd MMM', { locale: it })} –{' '}
          {format(new Date(`${fineSettimanaCorrente}T00:00:00`), 'd MMM yyyy', { locale: it })}
        </Text>
        <Text style={styles.progressoSettimana}>
          {completatePrevisteQuestaSettimana} di {occorrenzeDiQuestaSettimana.length} completate
        </Text>

        <View style={styles.classifica}>
          {classifica.map((voce) => {
            const membro = membriAttivi.find((m) => m.id === voce.membroId);
            return (
              <View key={voce.membroId} style={styles.rigaClassifica}>
                <Text style={styles.posizioneClassifica}>{voce.posizione}°</Text>
                <Avatar nome={membro?.nome ?? '?'} dimensione={32} />
                <View style={styles.testiClassifica}>
                  <Text style={styles.nomeClassifica}>{membro?.nome ?? 'Membro'}</Text>
                  <Text style={styles.dettaglioClassifica}>
                    {voce.faccendeCompletate} {voce.faccendeCompletate === 1 ? 'faccenda' : 'faccende'} completate
                  </Text>
                </View>
                <View style={styles.puntiClassifica}>
                  <Text style={styles.valorePuntiClassifica}>{voce.punti} pt</Text>
                  <Text style={styles.percentualeClassifica}>{voce.percentuale}%</Text>
                </View>
              </View>
            );
          })}
        </View>
      </GlassCard>

      {/* B. Elenco faccende */}
      <View style={styles.sezione}>
        <SectionHeader titolo="Attività" />
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
              style={[styles.chipFiltro, filtro === valore && styles.chipFiltroAttivo]}
            >
              <Text style={[styles.testoChipFiltro, filtro === valore && styles.testoChipFiltroAttivo]}>
                {etichetta}
              </Text>
            </Pressable>
          ))}
        </View>

        {occorrenzeInCaricamento ? (
          <ActivityIndicator style={styles.caricamentoLista} color={bento.testoPrimario} />
        ) : erroreOccorrenze !== null && erroreOccorrenze !== undefined ? (
          <Text style={styles.testoStatoLista}>Non riesco a caricare le attività al momento.</Text>
        ) : occorrenzeFiltrate.length === 0 ? (
          <Text style={styles.testoStatoLista}>Nessuna attività in questo filtro.</Text>
        ) : (
          <View style={styles.elencoOccorrenze}>
            {occorrenzeFiltrate.map((occorrenza) => {
              const faccenda = faccendePerId.get(occorrenza.faccenda_id);
              const assegnatario =
                faccenda?.assegnata_a !== null && faccenda?.assegnata_a !== undefined
                  ? membriAttivi.find((m) => m.id === faccenda.assegnata_a)?.nome ?? null
                  : null;
              const completandoQuesta = completa.isPending && completa.variables === occorrenza.id;
              const annullandoQuesta = annullaCompletamento.isPending && annullaCompletamento.variables === occorrenza.id;
              const erroreCompletamento =
                completa.isError && completa.variables === occorrenza.id ? completa.error : null;
              const erroreAnnullamento =
                annullaCompletamento.isError && annullaCompletamento.variables === occorrenza.id
                  ? annullaCompletamento.error
                  : null;

              return (
                <GlassCard key={occorrenza.id} elevazione="bassa">
                  <View style={styles.rigaOccorrenza}>
                    <View style={styles.testiOccorrenza}>
                      <Text style={styles.nomeOccorrenza}>{faccenda?.nome ?? 'Faccenda'}</Text>
                      <View style={styles.metaOccorrenza}>
                        <Text style={styles.testoMeta}>
                          {faccenda !== undefined ? ETICHETTA_FREQUENZA[faccenda.frequenza] : ''} ·{' '}
                          {occorrenza.punti_previsti} pt
                          {assegnatario !== null ? ` · ${assegnatario}` : ''}
                        </Text>
                      </View>
                    </View>
                    <Badge testo={ETICHETTA_STATO[occorrenza.stato]} tono={TONO_STATO[occorrenza.stato]} />
                  </View>

                  {occorrenza.stato === 'da_fare' && (
                    <Pressable
                      onPress={() => completa.mutate(occorrenza.id)}
                      disabled={completandoQuesta}
                      style={[styles.bottoneFatto, completandoQuesta && styles.bottoneDisabilitato]}
                    >
                      {completandoQuesta ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <>
                          <Feather name="check" size={16} color="#fff" />
                          <Text style={styles.testoBottoneFatto}>Fatto</Text>
                        </>
                      )}
                    </Pressable>
                  )}
                  {erroreCompletamento !== null && (
                    <Text style={styles.testoErroreRiga}>{messaggioErrore(erroreCompletamento)}</Text>
                  )}

                  {occorrenza.stato === 'completata' && (
                    <Pressable
                      onPress={() => chiediAnnullamento(occorrenza, faccenda?.nome ?? 'Faccenda')}
                      disabled={annullandoQuesta}
                      style={styles.linkAnnulla}
                    >
                      <Text style={styles.testoLinkAnnulla}>
                        {annullandoQuesta ? 'Annullamento…' : 'Annulla completamento'}
                      </Text>
                    </Pressable>
                  )}
                  {erroreAnnullamento !== null && (
                    <Text style={styles.testoErroreRiga}>{messaggioErrore(erroreAnnullamento)}</Text>
                  )}
                </GlassCard>
              );
            })}
          </View>
        )}
      </View>

      {/* C. Aggiungi/modifica faccenda */}
      <View style={styles.sezione}>
        <SectionHeader
          titolo="Le tue faccende"
          azione={{
            etichetta: formVisibile ? 'Chiudi' : 'Aggiungi',
            onPress: () => (formVisibile ? azzeraForm() : setFormVisibile(true)),
          }}
        />

        {!formVisibile && faccendeAttive.length === 0 && (
          <View>
            <BentoButton
              etichetta="Carica faccende suggerite"
              variante="vetro"
              onPress={() => importaSuggerite.mutate()}
              caricando={importaSuggerite.isPending}
            />
            {importaSuggerite.isError && (
              <Text style={styles.testoErrore}>{messaggioErrore(importaSuggerite.error)}</Text>
            )}
          </View>
        )}

        {formVisibile && (
          <GlassCard style={styles.cardForm}>
            <TextInput
              style={styles.input}
              placeholder="Nome (es. Lavare i piatti)"
              placeholderTextColor={bento.testoMuto}
              value={nome}
              onChangeText={setNome}
            />
            <TextInput
              style={styles.input}
              placeholder="Descrizione (opzionale)"
              placeholderTextColor={bento.testoMuto}
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
                  <Text style={[styles.testoChip, frequenza === f && styles.testoChipAttivo]}>
                    {ETICHETTA_FREQUENZA[f]}
                  </Text>
                </Pressable>
              ))}
            </View>

            {frequenza === 'personalizzata' && (
              <>
                <Text style={styles.etichettaCampo}>Ogni quanti giorni</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Es. 3"
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
                    <Text style={[styles.testoChip, giorniSettimana.length === 0 && styles.testoChipAttivo]}>
                      Qualsiasi
                    </Text>
                  </Pressable>
                  {GIORNI_SETTIMANA.map((g, indice) => {
                    const num = indice + 1;
                    const selezionato = giorniSettimana.includes(num);
                    return (
                      <Pressable
                        key={g}
                        onPress={() =>
                          setGiorniSettimana((prev) =>
                            selezionato
                              ? prev.filter((d) => d !== num)
                              : [...prev, num].sort((a, b) => a - b)
                          )
                        }
                        style={[styles.chip, selezionato && styles.chipAttivo]}
                      >
                        <Text style={[styles.testoChip, selezionato && styles.testoChipAttivo]}>{g}</Text>
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
                  <Text style={[styles.testoChip, sforzo === s && styles.testoChipAttivo]}>
                    {s === 'basso' ? 'Basso' : s === 'medio' ? 'Medio' : 'Alto'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.etichettaCampo}>
              Punteggio suggerito{punteggioManuale ? ' (modificato a mano)' : ' (stima automatica)'}
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
                <Text style={[styles.testoChip, assegnataA === null && styles.testoChipAttivo]}>Chiunque</Text>
              </Pressable>
              {membriAttivi.map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() => setAssegnataA(m.id)}
                  style={[styles.chip, assegnataA === m.id && styles.chipAttivo]}
                >
                  <Text style={[styles.testoChip, assegnataA === m.id && styles.testoChipAttivo]}>{m.nome}</Text>
                </Pressable>
              ))}
            </View>

            {erroreForm !== null && <Text style={styles.testoErrore}>{erroreForm}</Text>}
            {erroreForm === null && (crea.isError || aggiorna.isError) && (
              <Text style={styles.testoErrore}>{messaggioErrore(crea.error ?? aggiorna.error)}</Text>
            )}

            <BentoButton
              etichetta={idInModifica !== null ? 'Salva modifiche' : 'Aggiungi faccenda'}
              onPress={inviaForm}
              caricando={crea.isPending || aggiorna.isPending}
            />
          </GlassCard>
        )}

        {faccendeAttive.length > 0 && (
          <View style={styles.elencoDefinizioni}>
            {faccendeAttive.map((f) => (
              <View key={f.id} style={styles.rigaDefinizione}>
                <View style={styles.contenutoDefinizione}>
                  <Text style={styles.nomeDefinizione}>{f.nome}</Text>
                  <Text style={styles.testoMeta}>
                    {ETICHETTA_FREQUENZA[f.frequenza]} · {f.punti} pt
                  </Text>
                </View>
                <Pressable
                  onPress={() => mostraMenuFaccenda(f.id, f.nome)}
                  hitSlop={8}
                  style={styles.bottoneAltroDefinizione}
                >
                  <Feather name="more-vertical" size={18} color={bento.testoMuto} />
                </Pressable>
              </View>
            ))}
            {(archivia.isError || elimina.isError) && (
              <Text style={styles.testoErrore}>{messaggioErrore(archivia.error ?? elimina.error)}</Text>
            )}
          </View>
        )}
      </View>

      {/* D. Storico */}
      <View style={styles.sezione}>
        <SectionHeader titolo="Storico" />
        {storico.length === 0 ? (
          <Text style={styles.testoStatoLista}>Nessun evento ancora.</Text>
        ) : (
          <View style={styles.elencoStorico}>
            {storico.slice(0, 30).map((evento) => {
              const occorrenza = occorrenze.find((o) => o.id === evento.occorrenza_id);
              const faccenda = occorrenza !== undefined ? faccendePerId.get(occorrenza.faccenda_id) : undefined;
              const membro = membriAttivi.find((m) => m.id === evento.membro_id);
              const positivo = evento.punti >= 0;
              return (
                <View key={evento.id} style={styles.rigaStorico}>
                  <Avatar nome={membro?.nome ?? '?'} dimensione={28} />
                  <View style={styles.testiStorico}>
                    <Text style={styles.testoStorico}>
                      {membro?.nome ?? 'Un membro'} {evento.tipo_evento === 'completata' ? 'ha completato' : 'ha annullato'}{' '}
                      «{faccenda?.nome ?? 'una faccenda'}»
                    </Text>
                    <Text style={styles.dataStorico}>
                      {format(new Date(evento.creato_il), "d MMMM yyyy 'alle' HH:mm", { locale: it })}
                    </Text>
                  </View>
                  <Text style={[styles.puntiStorico, positivo ? styles.puntiPositivi : styles.puntiNegativi]}>
                    {positivo ? '+' : ''}
                    {evento.punti}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </BentoScreen>

    {/* Bottom sheet azione faccenda — cross-platform, niente Alert.alert */}
    <Modal
      transparent
      visible={menuFaccenda !== null}
      animationType="slide"
      onRequestClose={chiudiMenuFaccenda}
    >
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
    </>
  );
}

const styles = StyleSheet.create({
  centrato: {
    flex: 1,
    backgroundColor: bento.sfondo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statoIniziale: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spaziatura.sm,
    paddingHorizontal: spaziatura.xl,
    paddingTop: spaziatura.xxl,
  },
  statoIninizialeTitolo: {
    ...tipografia.titoloSezione,
    color: bento.testoPrimario,
    marginTop: spaziatura.sm,
    textAlign: 'center',
  },
  statoInizialeTesto: {
    fontSize: 14,
    color: bento.testoSecondario,
    textAlign: 'center',
    marginBottom: spaziatura.md,
  },
  sezione: {
    gap: spaziatura.md,
  },
  rangeSettimana: {
    fontSize: 13,
    color: bento.testoSecondario,
    marginTop: 2,
  },
  progressoSettimana: {
    fontSize: 14,
    fontWeight: '700',
    color: bento.testoPrimario,
    marginTop: 4,
  },
  classifica: {
    marginTop: spaziatura.md,
    gap: spaziatura.sm,
  },
  rigaClassifica: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spaziatura.sm,
  },
  posizioneClassifica: {
    width: 24,
    fontSize: 14,
    fontWeight: '700',
    color: bento.testoSecondario,
  },
  testiClassifica: {
    flex: 1,
  },
  nomeClassifica: {
    fontSize: 15,
    fontWeight: '600',
    color: bento.testoPrimario,
  },
  dettaglioClassifica: {
    fontSize: 12,
    color: bento.testoMuto,
    marginTop: 1,
  },
  puntiClassifica: {
    alignItems: 'flex-end',
  },
  valorePuntiClassifica: {
    fontSize: 15,
    fontWeight: '700',
    color: accenti.menta,
  },
  percentualeClassifica: {
    fontSize: 12,
    color: bento.testoMuto,
  },
  rigaFiltri: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spaziatura.xs,
  },
  chipFiltro: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: raggio.pillola,
    backgroundColor: bento.superficieMuta,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: bento.bordoSoft,
  },
  chipFiltroAttivo: {
    backgroundColor: accenti.menta,
    borderColor: accenti.menta,
  },
  testoChipFiltro: {
    fontSize: 13,
    fontWeight: '600',
    color: bento.testoSecondario,
  },
  testoChipFiltroAttivo: {
    color: '#fff',
  },
  caricamentoLista: {
    marginTop: spaziatura.lg,
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
  rigaOccorrenza: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spaziatura.sm,
  },
  testiOccorrenza: {
    flex: 1,
  },
  nomeOccorrenza: {
    fontSize: 15,
    fontWeight: '600',
    color: bento.testoPrimario,
  },
  metaOccorrenza: {
    marginTop: 2,
  },
  testoMeta: {
    fontSize: 12.5,
    color: bento.testoSecondario,
  },
  bottoneFatto: {
    marginTop: spaziatura.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: accenti.menta,
    borderRadius: raggio.sm,
    paddingVertical: 10,
    minHeight: 44,
  },
  bottoneDisabilitato: {
    opacity: 0.6,
  },
  testoBottoneFatto: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  linkAnnulla: {
    marginTop: spaziatura.sm,
    alignSelf: 'flex-start',
  },
  testoLinkAnnulla: {
    fontSize: 13,
    fontWeight: '600',
    color: semantica.pericolo,
  },
  cardForm: {
    gap: spaziatura.sm,
  },
  input: {
    backgroundColor: bento.superficieForte,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: bento.bordoForte,
    borderRadius: raggio.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: bento.testoPrimario,
  },
  etichettaCampo: {
    fontSize: 13,
    fontWeight: '600',
    color: bento.testoSecondario,
    marginTop: spaziatura.xs,
  },
  rigaChip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spaziatura.xs,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: raggio.pillola,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: bento.bordoForte,
  },
  chipAttivo: {
    backgroundColor: accenti.menta,
    borderColor: accenti.menta,
  },
  testoChip: {
    fontSize: 13,
    fontWeight: '600',
    color: bento.testoSecondario,
  },
  testoChipAttivo: {
    color: '#fff',
  },
  rigaPunteggio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spaziatura.sm,
  },
  inputPunteggio: {
    flex: 1,
  },
  linkRicalcola: {
    fontSize: 13,
    fontWeight: '600',
    color: accenti.indaco,
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
  elencoDefinizioni: {
    gap: spaziatura.xs,
    marginTop: spaziatura.sm,
  },
  rigaDefinizione: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spaziatura.sm,
    paddingVertical: spaziatura.sm,
    paddingHorizontal: spaziatura.md,
    backgroundColor: bento.superficieMuta,
    borderRadius: raggio.md,
  },
  contenutoDefinizione: {
    flex: 1,
  },
  nomeDefinizione: {
    fontSize: 14,
    fontWeight: '600',
    color: bento.testoPrimario,
  },
  bottoneAltroDefinizione: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  elencoStorico: {
    gap: spaziatura.sm,
  },
  rigaStorico: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spaziatura.sm,
  },
  testiStorico: {
    flex: 1,
  },
  testoStorico: {
    fontSize: 13.5,
    color: bento.testoPrimario,
  },
  dataStorico: {
    fontSize: 12,
    color: bento.testoMuto,
    marginTop: 1,
  },
  puntiStorico: {
    fontSize: 14,
    fontWeight: '700',
  },
  puntiPositivi: {
    color: semantica.successo,
  },
  puntiNegativi: {
    color: semantica.pericolo,
  },
  sfondoMenu: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
    paddingHorizontal: spaziatura.md,
    paddingBottom: spaziatura.lg,
    gap: spaziatura.xs,
  },
  foglioMenu: {
    backgroundColor: bento.superficieForte,
    borderRadius: raggio.xl,
    overflow: 'hidden',
  },
  foglioAnnulla: {
    marginTop: spaziatura.xs,
  },
  titoloMenu: {
    paddingHorizontal: spaziatura.lg,
    paddingVertical: spaziatura.md,
    fontSize: 13,
    color: bento.testoMuto,
    textAlign: 'center',
  },
  separatoreMenu: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: bento.bordoSoft,
    marginHorizontal: spaziatura.md,
  },
  voceMenu: {
    paddingVertical: 16,
    paddingHorizontal: spaziatura.lg,
    alignItems: 'center',
  },
  testoVoceMenu: {
    fontSize: 17,
    color: accenti.indaco,
  },
  testoEliminazione: {
    color: semantica.pericolo,
  },
  testoAnnulla: {
    fontWeight: '600',
  },
});
