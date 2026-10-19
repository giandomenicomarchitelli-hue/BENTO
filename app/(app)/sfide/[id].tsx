import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { OpzioneSfida, TurnoSfida } from '@/api/sfide';
import { percentualeOpzione } from '@/calcolo/risultatoSfida';
import { BentoButton } from '@/components/BentoButton';
import { BentoScreen } from '@/components/BentoScreen';
import { GlassCard } from '@/components/GlassCard';
import { SectionHeader } from '@/components/SectionHeader';
import { useGruppoAttivo } from '@/hooks/useGruppoAttivo';
import { useSfidaDettaglio } from '@/hooks/useSfidaDettaglio';
import { useSfide } from '@/hooks/useSfide';
import { useGruppoAttivoStore } from '@/store/gruppoAttivoStore';
import { accenti, bento, raggio, semantica, spaziatura } from '@/theme/tokens';

/** Messaggio leggibile da un errore di rete/Supabase, senza assumere una forma precisa. */
function messaggioErrore(errore: unknown): string {
  if (errore instanceof Error && errore.message.trim() !== '') {
    return errore.message;
  }
  return 'Qualcosa è andato storto. Riprova.';
}

function formattaIstante(iso: string): string {
  return format(new Date(iso), "d MMMM yyyy 'alle' HH:mm", { locale: it });
}

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
      <View style={styles.rigaChip}>
        {opzioni.map((opzione) => (
          <Pressable
            key={opzione.id}
            onPress={() => onToggleOpzione(opzione.id)}
            style={[styles.chip, selezionate.includes(opzione.id) && styles.chipAttivo]}
          >
            <Text style={[styles.testoChip, selezionate.includes(opzione.id) && styles.testoChipAttivo]}>
              {opzione.testo_opzione}
            </Text>
          </Pressable>
        ))}
        {mostraProposta && (
          <Pressable onPress={onAlternaProposta} style={[styles.chip, propostaAttiva && styles.chipAttivo]}>
            <Text style={[styles.testoChip, propostaAttiva && styles.testoChipAttivo]}>
              + Proponi un&apos;altra opzione
            </Text>
          </Pressable>
        )}
      </View>
      {propostaAttiva && (
        <TextInput
          style={styles.inputDomanda}
          placeholder="La tua proposta"
          placeholderTextColor={bento.testoMuto}
          value={propostaTesto}
          onChangeText={onCambiaProposta}
        />
      )}
      <Text style={styles.testoContatore}>
        {selezionate.length + (propostaAttiva ? 1 : 0)} di {maxScelte} {maxScelte === 1 ? 'scelta' : 'scelte'}
      </Text>
    </View>
  );
}

export default function DettaglioSfida() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const gruppoAttivoId = useGruppoAttivoStore((stato) => stato.gruppoAttivoId);
  const { membri } = useGruppoAttivo();
  const { dettaglio, isLoading, error, confermaVoti } = useSfidaDettaglio(id ?? null);
  const { ripeti } = useSfide(gruppoAttivoId);
  const queryClient = useQueryClient();

  const [selezionate, setSelezionate] = useState<string[]>([]);
  const [propostaAttiva, setPropostaAttiva] = useState(false);
  const [propostaTesto, setPropostaTesto] = useState('');

  if (isLoading) {
    return (
      <View style={styles.centrato}>
        <ActivityIndicator color={bento.testoPrimario} />
      </View>
    );
  }

  if (error !== null && error !== undefined) {
    return (
      <BentoScreen>
        <Text style={styles.testoStato}>Questa sfida non è disponibile.</Text>
      </BentoScreen>
    );
  }

  if (dettaglio === undefined) {
    return (
      <View style={styles.centrato}>
        <ActivityIndicator color={bento.testoPrimario} />
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
  } = dettaglio;

  const organizzatore = membri.find((m) => m.id === sfida.creata_da)?.nome ?? 'un membro';
  const opzioniPerId = new Map(opzioniVisibili.map((o) => [o.id, o]));
  const turnoCorrente: TurnoSfida | undefined = turni[turni.length - 1];

  function selezionaOpzione(id: string, maxScelte: number) {
    const totale = selezionate.length + (propostaAttiva ? 1 : 0);
    setSelezionate((prec) => {
      if (prec.includes(id)) {
        return prec.filter((x) => x !== id);
      }
      if (totale >= maxScelte) {
        return prec;
      }
      return [...prec, id];
    });
  }

  function alternaProposta(maxScelte: number) {
    if (propostaAttiva) {
      setPropostaAttiva(false);
      setPropostaTesto('');
      return;
    }
    if (selezionate.length >= maxScelte) {
      return;
    }
    setPropostaAttiva(true);
  }

  function invia(turnoId: string) {
    confermaVoti.mutate({
      turnoId,
      opzioniScelte: selezionate,
      propostaPersonalizzata: propostaAttiva ? propostaTesto.trim() : undefined,
    });
  }

  return (
    <BentoScreen>
      <Stack.Screen options={{ title: sfida.titolo }} />
      <ScrollView contentContainerStyle={styles.contenuto}>
        <GlassCard>
          <SectionHeader titolo={sfida.titolo} />
          <Text style={styles.testoMeta}>Creata da {organizzatore}</Text>
          <Text style={styles.testoMeta}>Attività: {formattaIstante(sfida.attivita_inizio)}</Text>
        </GlassCard>

        {sfida.stato === 'annullata' && (
          <GlassCard>
            <Text style={styles.testoStato}>Questa sfida è stata annullata.</Text>
          </GlassCard>
        )}

        {sfida.stato === 'conclusa_vincitore' && (
          <GlassCard>
            <SectionHeader titolo="Abbiamo un vincitore! 🎉" />
            <Text style={styles.nomeVincitore}>
              {opzioniPerId.get(sfida.opzione_vincente_id ?? '')?.testo_opzione ?? 'Opzione'}
            </Text>
            <View style={styles.classifica}>
              {[...risultatiTurnoCorrente]
                .sort((a, b) => b.voti_ricevuti - a.voti_ricevuti)
                .map((risultato) => (
                  <View key={risultato.opzione_id} style={styles.rigaClassifica}>
                    <Text style={styles.testoOpzioneClassifica}>
                      {opzioniPerId.get(risultato.opzione_id)?.testo_opzione ?? 'Opzione'}
                    </Text>
                    <Text style={styles.testoVotiClassifica}>
                      {risultato.voti_ricevuti} voti · {percentualeOpzione(risultato.voti_ricevuti, partecipantiTotali)}%
                    </Text>
                  </View>
                ))}
            </View>
          </GlassCard>
        )}

        {(sfida.stato === 'conclusa_senza_accordo' || sfida.stato === 'conclusa_scaduta') && (
          <GlassCard>
            <SectionHeader
              titolo={sfida.stato === 'conclusa_senza_accordo' ? 'Nessun accordo! 😅' : 'Sfida scaduta'}
            />
            <Text style={styles.testoStato}>
              {sfida.stato === 'conclusa_senza_accordo'
                ? 'Il gruppo non ha trovato una preferenza condivisa.'
                : 'La sfida è scaduta prima che tutti votassero.'}
            </Text>
            {ripeti.isError && <Text style={styles.testoErrore}>{messaggioErrore(ripeti.error)}</Text>}
            <BentoButton
              etichetta="Riprova"
              onPress={() =>
                ripeti.mutate(sfida.id, {
                  // La Realtime di useSfidaDettaglio arriverebbe comunque
                  // (sfide_turni cambia), ma invalidare subito evita di
                  // aspettare quel giro di rete dopo un tap esplicito.
                  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sfide', 'dettaglio', sfida.id] }),
                })
              }
              caricando={ripeti.isPending}
            />
          </GlassCard>
        )}

        {sfida.stato === 'in_corso' && turnoCorrente !== undefined && turnoCorrente.stato === 'in_corso' && (
          <GlassCard>
            <Text style={styles.testoMeta}>Scade {formattaIstante(turnoCorrente.scadenza)}</Text>
            <Text style={styles.testoMeta}>
              {partecipantiCheHannoVotatoNelTurnoCorrente} di {partecipantiTotali} persone hanno votato
            </Text>

            {hoGiaVotatoNelTurnoCorrente ? (
              <Text style={styles.testoStato}>Hai già votato. In attesa degli altri.</Text>
            ) : (
              (() => {
                const opzioniTurno = opzioniVisibili.filter((o) => turnoCorrente.opzioni_in_gara.includes(o.id));
                const spareggio = turnoCorrente.tipo_turno === 'spareggio';
                // Per i turni a 3 scelte il massimo totale (opzioni + eventuale
                // proposta) è sempre 3: con la proposta attiva restano 2 slot
                // per le opzioni della lista, esattamente come in sfide/nuova.tsx.
                const maxTotale = spareggio ? 1 : 3;
                const totaleScelte = selezionate.length + (propostaAttiva ? 1 : 0);
                const formValido = spareggio
                  ? selezionate.length === 1
                  : totaleScelte === 3 && (!propostaAttiva || propostaTesto.trim() !== '');

                return (
                  <>
                    <SelettoreOpzioni
                      opzioni={opzioniTurno}
                      maxScelte={maxTotale}
                      mostraProposta={!spareggio}
                      selezionate={selezionate}
                      onToggleOpzione={(opzioneId) => selezionaOpzione(opzioneId, maxTotale)}
                      propostaAttiva={propostaAttiva}
                      propostaTesto={propostaTesto}
                      onAlternaProposta={() => alternaProposta(maxTotale)}
                      onCambiaProposta={setPropostaTesto}
                    />
                    {confermaVoti.isError && (
                      <Text style={styles.testoErrore}>{messaggioErrore(confermaVoti.error)}</Text>
                    )}
                    <BentoButton
                      etichetta={spareggio ? 'Conferma la mia scelta' : 'Conferma le mie 3 scelte'}
                      onPress={() => invia(turnoCorrente.id)}
                      disabilitato={!formValido}
                      caricando={confermaVoti.isPending}
                    />
                  </>
                );
              })()
            )}
          </GlassCard>
        )}
      </ScrollView>
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
  contenuto: {
    gap: spaziatura.lg,
    paddingBottom: spaziatura.xxl,
  },
  testoMeta: {
    fontSize: 13,
    color: bento.testoSecondario,
    marginTop: 4,
  },
  testoStato: {
    fontSize: 14,
    color: bento.testoSecondario,
    textAlign: 'center',
    marginTop: spaziatura.sm,
  },
  sezioneVoto: {
    marginTop: spaziatura.sm,
    gap: spaziatura.sm,
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
  testoContatore: {
    fontSize: 13,
    color: bento.testoSecondario,
  },
  inputDomanda: {
    backgroundColor: bento.superficieForte,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: bento.bordoForte,
    borderRadius: raggio.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: bento.testoPrimario,
  },
  nomeVincitore: {
    fontSize: 20,
    fontWeight: '700',
    color: bento.testoPrimario,
    marginTop: spaziatura.xs,
    marginBottom: spaziatura.sm,
  },
  classifica: {
    gap: spaziatura.xs,
  },
  rigaClassifica: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spaziatura.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: bento.bordoSoft,
  },
  testoOpzioneClassifica: {
    fontSize: 14,
    color: bento.testoPrimario,
  },
  testoVotiClassifica: {
    fontSize: 13,
    color: bento.testoSecondario,
  },
  testoErrore: {
    fontSize: 13,
    color: semantica.pericolo,
    textAlign: 'center',
    marginTop: spaziatura.xs,
  },
});
