import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { OpzioneSfida, TurnoSfida } from '@/api/sfide';
import { percentualeOpzione } from '@/calcolo/risultatoSfida';
import { BloccoDuro } from '@/components/BloccoDuro';
import { useGruppoAttivo } from '@/hooks/useGruppoAttivo';
import { useSfidaDettaglio } from '@/hooks/useSfidaDettaglio';
import { useSfide } from '@/hooks/useSfide';
import { messaggioErrore } from '@/lib/messaggioErrore';
import { useGruppoAttivoStore } from '@/store/gruppoAttivoStore';
import { coloriNB as colori, pesiNB as pesi } from '@/theme/neoBrutalista';

/**
 * Sempre nel fuso fisso Europe/Rome, non in quello del dispositivo
 * (stesso principio di sfide/nuova.tsx): senza questo, un gruppo in
 * viaggio con il telefono su un altro fuso vedrebbe un orario diverso da
 * quello che l'organizzatore ha effettivamente scelto.
 */
function formattaIstante(iso: string): string {
  const d = new Date(iso);
  const data = new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
  const ora = new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
  return `${data} alle ${ora}`;
}

/**
 * Ogni opzione è una chip larga quanto la riga (qui il testo può essere
 * lungo), non una pillola inline - stessa interfaccia per voto normale e
 * spareggio: cambia solo quante se ne possono selezionare (maxScelte),
 * mai due componenti diversi.
 */
function SelettoreOpzioni({
  opzioni,
  maxScelte,
  mostraProposta,
  selezionate,
  onToggleOpzione,
  propostaAttiva,
  propostaTesto,
  onAlternaProposta,
  onCambiaProposta,
}: {
  opzioni: OpzioneSfida[];
  maxScelte: number;
  mostraProposta: boolean;
  selezionate: string[];
  onToggleOpzione: (id: string) => void;
  propostaAttiva: boolean;
  propostaTesto: string;
  onAlternaProposta: () => void;
  onCambiaProposta: (testo: string) => void;
}) {
  return (
    <View style={styles.sezioneVoto}>
      <Text style={styles.contatore}>
        {selezionate.length + (propostaAttiva ? 1 : 0)} di {maxScelte} {maxScelte === 1 ? 'scelta' : 'scelte'}
      </Text>
      {opzioni.map((opzione) => (
        <Pressable
          key={opzione.id}
          onPress={() => onToggleOpzione(opzione.id)}
          style={[styles.opzioneChip, selezionate.includes(opzione.id) && styles.opzioneChipAttiva]}
        >
          <Text style={styles.testoOpzioneChip}>{opzione.testo_opzione}</Text>
        </Pressable>
      ))}
      {mostraProposta && (
        <Pressable onPress={onAlternaProposta} style={[styles.opzioneChip, propostaAttiva && styles.opzioneChipAttiva]}>
          <Text style={styles.testoOpzioneChip}>+ Proponi un&apos;altra opzione</Text>
        </Pressable>
      )}
      {propostaAttiva && (
        <TextInput
          style={styles.inputDomanda}
          placeholder="La tua proposta"
          placeholderTextColor={colori.soft}
          value={propostaTesto}
          onChangeText={onCambiaProposta}
        />
      )}
    </View>
  );
}

/**
 * Isola lo stato di selezione del voto (3 scelte/1 scelta + proposta) in
 * un componente a parte, montato con `key={turno.id}` dal chiamante:
 * quando lo spareggio automatico apre un nuovo turno nella stessa
 * transazione del voto che lo decide, la chiave diversa forza un
 * remount con stato fresco. Senza questo, chi vota per ultimo si
 * ritrova lo spareggio con le selezioni del turno precedente ancora
 * caricate (fino a 3 invece di 1, o una proposta ancora attiva che lo
 * spareggio non ammette) - scoperto in revisione finale.
 */
function FormVoto({
  turno,
  opzioniVisibili,
  confermaVoti,
}: {
  turno: TurnoSfida;
  opzioniVisibili: OpzioneSfida[];
  confermaVoti: ReturnType<typeof useSfidaDettaglio>['confermaVoti'];
}) {
  const [selezionate, setSelezionate] = useState<string[]>([]);
  const [propostaAttiva, setPropostaAttiva] = useState(false);
  const [propostaTesto, setPropostaTesto] = useState('');

  const opzioniTurno = opzioniVisibili.filter((o) => turno.opzioni_in_gara.includes(o.id));
  const spareggio = turno.tipo_turno === 'spareggio';
  // Per i turni a 3 scelte il massimo totale (opzioni + eventuale
  // proposta) è sempre 3: con la proposta attiva restano 2 slot per le
  // opzioni della lista, esattamente come in sfide/nuova.tsx. Uno
  // spareggio non ammette mai una proposta personalizzata (coerente con
  // 00000000000017: la RPC la rifiuterebbe comunque).
  const maxTotale = spareggio ? 1 : 3;
  const totaleScelte = selezionate.length + (!spareggio && propostaAttiva ? 1 : 0);
  const formValido = spareggio
    ? selezionate.length === 1
    : totaleScelte === 3 && (!propostaAttiva || propostaTesto.trim() !== '');

  function selezionaOpzione(id: string) {
    const totale = selezionate.length + (!spareggio && propostaAttiva ? 1 : 0);
    setSelezionate((prec) => {
      if (prec.includes(id)) {
        return prec.filter((x) => x !== id);
      }
      if (totale >= maxTotale) {
        return prec;
      }
      return [...prec, id];
    });
  }

  function alternaProposta() {
    if (propostaAttiva) {
      setPropostaAttiva(false);
      setPropostaTesto('');
      return;
    }
    if (selezionate.length >= maxTotale) {
      return;
    }
    setPropostaAttiva(true);
  }

  function invia() {
    confermaVoti.mutate({
      turnoId: turno.id,
      opzioniScelte: selezionate,
      propostaPersonalizzata: !spareggio && propostaAttiva ? propostaTesto.trim() : undefined,
    });
  }

  return (
    <>
      <SelettoreOpzioni
        opzioni={opzioniTurno}
        maxScelte={maxTotale}
        mostraProposta={!spareggio}
        selezionate={selezionate}
        onToggleOpzione={selezionaOpzione}
        propostaAttiva={!spareggio && propostaAttiva}
        propostaTesto={propostaTesto}
        onAlternaProposta={alternaProposta}
        onCambiaProposta={setPropostaTesto}
      />
      {confermaVoti.isError && <Text style={styles.testoErrore}>{messaggioErrore(confermaVoti.error)}</Text>}
      <BloccoDuro
        style={!formValido && styles.bottoneDisabilitato}
        offset={2.5}
        colore={colori.corallo}
        raggio={12}
        contenutoStyle={styles.bottonePieno}
        onPress={formValido && !confermaVoti.isPending ? invia : undefined}
      >
        {confermaVoti.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.testoBottonePieno}>
            {spareggio ? 'Conferma la mia scelta' : 'Conferma le mie 3 scelte'}
          </Text>
        )}
      </BloccoDuro>
    </>
  );
}

function Testata({ titolo, onTornaIndietro }: { titolo: string; onTornaIndietro: () => void }) {
  return (
    <View style={styles.rigaTitolo}>
      <Pressable onPress={onTornaIndietro} hitSlop={8}>
        <BloccoDuro offset={2} colore={colori.panna} raggio={10} contenutoStyle={styles.quadrato}>
          <Feather name="arrow-left" size={17} color={colori.scuro} />
        </BloccoDuro>
      </Pressable>
      <Text style={styles.titolo} numberOfLines={1}>{titolo}</Text>
    </View>
  );
}

export default function DettaglioSfida() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const gruppoAttivoId = useGruppoAttivoStore((stato) => stato.gruppoAttivoId);
  const { membri } = useGruppoAttivo();
  const { dettaglio, isLoading, error, confermaVoti, rispondiInvito } = useSfidaDettaglio(id ?? null);
  const { ripeti, sincronizzaScadenze } = useSfide(gruppoAttivoId);
  const queryClient = useQueryClient();

  // Stesso principio di sfide/index.tsx: una notifica porta dritto qui,
  // quindi anche questa pagina deve sincronizzare le scadenze alla sua
  // apertura, non solo l'elenco.
  useEffect(() => {
    if (gruppoAttivoId !== null) {
      sincronizzaScadenze.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gruppoAttivoId]);

  function tornaIndietro() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/sfide');
    }
  }

  if (isLoading || dettaglio === undefined) {
    return (
      <View style={styles.centrato}>
        <ActivityIndicator color={colori.scuro} />
      </View>
    );
  }

  if (error !== null && error !== undefined) {
    return (
      <View style={styles.schermo}>
        <View style={[styles.contenuto, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
          <Testata titolo="Sfida" onTornaIndietro={tornaIndietro} />
          <Text style={styles.testoStato}>Questa sfida non è disponibile.</Text>
        </View>
      </View>
    );
  }

  const {
    sfida,
    turni,
    opzioniVisibili,
    risultatiTurnoCorrente,
    partecipantiTotali,
    partecipantiCheHannoVotatoNelTurnoCorrente,
    hoGiaVotatoNelTurnoCorrente,
    mioStatoPartecipazione,
  } = dettaglio;

  const organizzatore = membri.find((m) => m.id === sfida.creata_da)?.nome ?? 'un membro';
  const opzioniPerId = new Map(opzioniVisibili.map((o) => [o.id, o]));
  const turnoCorrente: TurnoSfida | undefined = turni[turni.length - 1];

  return (
    <KeyboardAvoidingView style={styles.schermo} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.contenuto,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
        ]}
      >
        <Testata titolo={sfida.titolo} onTornaIndietro={tornaIndietro} />

        <View style={styles.dcard}>
          <Text style={styles.testoMeta}>Creata da {organizzatore}</Text>
          <Text style={styles.testoMeta}>Attività: {formattaIstante(sfida.attivita_inizio)}</Text>
        </View>

        {sfida.stato === 'annullata' && (
          <View style={styles.dcard}>
            <Text style={styles.testoStato}>Questa sfida è stata annullata.</Text>
          </View>
        )}

        {sfida.stato === 'conclusa_vincitore' && (
          <View style={styles.dcard}>
            <Text style={styles.titoloRisultato}>Abbiamo un vincitore! 🎉</Text>
            {(() => {
              const risultatiOrdinati = [...risultatiTurnoCorrente].sort((a, b) => b.voti_ricevuti - a.voti_ricevuti);
              return risultatiOrdinati.map((risultato, indice) => {
                const vincente = indice === 0;
                const percentuale = percentualeOpzione(risultato.voti_ricevuti, partecipantiTotali);
                return (
                  <View key={risultato.opzione_id} style={styles.rigaRisultato}>
                    <Text
                      style={[styles.testoOpzioneRisultato, vincente && pesi.extraBold]}
                      numberOfLines={1}
                    >
                      {opzioniPerId.get(risultato.opzione_id)?.testo_opzione ?? 'Opzione'}
                    </Text>
                    <View style={styles.barraRisultato}>
                      <View
                        style={[
                          styles.riempimentoBarraRisultato,
                          { width: `${percentuale}%`, backgroundColor: vincente ? colori.oro : colori.viola },
                        ]}
                      />
                    </View>
                    <Text style={styles.testoVotiRisultato}>
                      {risultato.voti_ricevuti} voti · {percentuale}%
                    </Text>
                  </View>
                );
              });
            })()}
          </View>
        )}

        {(sfida.stato === 'conclusa_senza_accordo' || sfida.stato === 'conclusa_scaduta') && (
          <View style={styles.dcard}>
            <Text style={styles.titoloRisultato}>
              {sfida.stato === 'conclusa_senza_accordo' ? 'Nessun accordo! 😅' : 'Sfida scaduta'}
            </Text>
            <Text style={styles.testoStato}>
              {sfida.stato === 'conclusa_senza_accordo'
                ? 'Il gruppo non ha trovato una preferenza condivisa.'
                : 'La sfida è scaduta prima che tutti votassero.'}
            </Text>
            {ripeti.isError && <Text style={styles.testoErrore}>{messaggioErrore(ripeti.error)}</Text>}
            <BloccoDuro
              style={ripeti.isPending && styles.bottoneDisabilitato}
              offset={2.5}
              colore={colori.corallo}
              raggio={12}
              contenutoStyle={styles.bottonePieno}
              onPress={
                ripeti.isPending
                  ? undefined
                  : () =>
                      ripeti.mutate(sfida.id, {
                        // La Realtime di useSfidaDettaglio arriverebbe comunque
                        // (sfide_turni cambia), ma invalidare subito evita di
                        // aspettare quel giro di rete dopo un tap esplicito.
                        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sfide', 'dettaglio', sfida.id] }),
                      })
              }
            >
              {ripeti.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.testoBottonePieno}>Riprova</Text>}
            </BloccoDuro>
          </View>
        )}

        {sfida.stato === 'in_corso' &&
          turnoCorrente !== undefined &&
          turnoCorrente.stato === 'in_corso' &&
          (mioStatoPartecipazione === 'in_attesa' ? (
            <View style={styles.dcard}>
              <Text style={styles.titoloRisultato}>Ti hanno invitato a questa sfida</Text>
              <Text style={styles.testoMeta}>
                Accetta per votare le tue preferite, oppure rifiuta se non vuoi partecipare.
              </Text>
              {rispondiInvito.isError && <Text style={styles.testoErrore}>{messaggioErrore(rispondiInvito.error)}</Text>}
              <View style={styles.rigaBottoniInvito}>
                <BloccoDuro
                  style={[styles.bottoneInvito, rispondiInvito.isPending && styles.bottoneDisabilitato]}
                  offset={2.5}
                  colore={colori.menta}
                  raggio={11}
                  contenutoStyle={styles.bottonePieno}
                  onPress={rispondiInvito.isPending ? undefined : () => rispondiInvito.mutate(true)}
                >
                  <Text style={styles.testoBottonePieno}>Accetta</Text>
                </BloccoDuro>
                <BloccoDuro
                  style={[styles.bottoneInvito, rispondiInvito.isPending && styles.bottoneDisabilitato]}
                  offset={2.5}
                  colore={colori.corallo}
                  raggio={11}
                  contenutoStyle={styles.bottonePieno}
                  onPress={rispondiInvito.isPending ? undefined : () => rispondiInvito.mutate(false)}
                >
                  <Text style={styles.testoBottonePieno}>Rifiuta</Text>
                </BloccoDuro>
              </View>
            </View>
          ) : mioStatoPartecipazione === 'rifiutata' ? (
            <View style={styles.dcard}>
              <Text style={styles.testoStato}>Hai rifiutato questa sfida.</Text>
            </View>
          ) : (
            <>
              <View style={styles.dcard}>
                <Text style={styles.testoMeta}>Scade {formattaIstante(turnoCorrente.scadenza)}</Text>
                <Text style={styles.contatore}>
                  {partecipantiCheHannoVotatoNelTurnoCorrente} di {partecipantiTotali} hanno votato
                </Text>
                <View style={styles.binarioProgresso}>
                  <View
                    style={[
                      styles.riempimentoProgresso,
                      {
                        width: `${
                          partecipantiTotali > 0
                            ? Math.round((partecipantiCheHannoVotatoNelTurnoCorrente / partecipantiTotali) * 100)
                            : 0
                        }%`,
                      },
                    ]}
                  />
                </View>
              </View>

              {hoGiaVotatoNelTurnoCorrente ? (
                <View style={styles.dcard}>
                  <Text style={styles.testoStato}>Hai già votato. In attesa degli altri.</Text>
                </View>
              ) : (
                <View style={styles.dcard}>
                  <FormVoto key={turnoCorrente.id} turno={turnoCorrente} opzioniVisibili={opzioniVisibili} confermaVoti={confermaVoti} />
                </View>
              )}
            </>
          ))}
      </ScrollView>
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
    gap: 12,
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
    flexShrink: 1,
    fontSize: 16,
    letterSpacing: -0.2,
    color: colori.scuro,
  },
  dcard: {
    borderWidth: 2.5,
    borderColor: colori.scuro,
    borderRadius: 15,
    backgroundColor: colori.panna,
    padding: 12,
    gap: 6,
  },
  testoMeta: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colori.soft,
  },
  testoStato: {
    fontSize: 13,
    fontWeight: '600',
    color: colori.soft,
    textAlign: 'center',
  },
  titoloRisultato: {
    ...pesi.extraBold,
    fontSize: 13,
    color: colori.scuro,
  },
  contatore: {
    ...pesi.extraBold,
    fontSize: 11,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: colori.scuro,
  },
  binarioProgresso: {
    height: 7,
    borderWidth: 1.5,
    borderColor: colori.scuro,
    borderRadius: 999,
    backgroundColor: '#fff',
    overflow: 'hidden',
    marginTop: 2,
  },
  riempimentoProgresso: {
    height: '100%',
    backgroundColor: colori.oro,
  },
  rigaRisultato: {
    gap: 4,
  },
  testoOpzioneRisultato: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colori.scuro,
  },
  barraRisultato: {
    height: 6,
    borderWidth: 1.3,
    borderColor: colori.scuro,
    borderRadius: 999,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  riempimentoBarraRisultato: {
    height: '100%',
  },
  testoVotiRisultato: {
    fontSize: 10,
    fontWeight: '700',
    color: colori.soft,
  },
  rigaBottoniInvito: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  bottoneInvito: {
    flex: 1,
  },
  sezioneVoto: {
    gap: 6,
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
  inputDomanda: {
    borderWidth: 2,
    borderColor: colori.scuro,
    borderRadius: 11,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colori.scuro,
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
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testoBottonePieno: {
    ...pesi.extraBold,
    fontSize: 11.5,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#fff',
  },
});
