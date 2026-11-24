import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { PianoTerapeutico } from '@/api/pianoTerapeutico';
import { dataFinePiano, doseRimanenti, giornoDellaCura, scortaInEsaurimento } from '@/calcolo/pianoTerapeutico';
import { dataLocaleISO } from '@/calcolo/ricorrenzaFaccende';
import { BloccoDuro } from '@/components/BloccoDuro';
import { useDosiPiano } from '@/hooks/useDosiPiano';
import { usePianiTerapeutici } from '@/hooks/usePianiTerapeutici';
import { confermaAzione } from '@/lib/conferma';
import { useAuthStore } from '@/store/authStore';
import { coloriNB as colori, pesiNB as pesi } from '@/theme/neoBrutalista';

const NOMI_MESI_BREVI = [
  'gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic',
];

function formattaDataBreve(dataISO: string): string {
  const [, mese, giorno] = dataISO.split('-').map(Number);
  return `${giorno} ${NOMI_MESI_BREVI[mese - 1]}`;
}

export default function PianoTerapeuticoPersonale() {
  const insets = useSafeAreaInsets();
  const utenteId = useAuthStore((stato) => stato.session?.user.id) ?? null;
  const fusoOrario = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const oggiISO = dataLocaleISO(new Date(), fusoOrario);

  const { piani, isLoading, crea, elimina } = usePianiTerapeutici(utenteId);
  const { dosi, spunta } = useDosiPiano(utenteId);

  const [pianoEspanso, setPianoEspanso] = useState<string | null>(null);
  const [formAperto, setFormAperto] = useState(false);
  const [bozzaNome, setBozzaNome] = useState('');
  const [bozzaOrari, setBozzaOrari] = useState<string[]>([]);
  const [bozzaNuovoOrario, setBozzaNuovoOrario] = useState('');
  const [bozzaDataInizio, setBozzaDataInizio] = useState(oggiISO);
  const [bozzaDurata, setBozzaDurata] = useState('');
  const [bozzaConfezione, setBozzaConfezione] = useState('');

  function tornaIndietro() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/personale');
    }
  }

  function apriNuovoPiano() {
    setBozzaNome('');
    setBozzaOrari([]);
    setBozzaNuovoOrario('');
    setBozzaDataInizio(oggiISO);
    setBozzaDurata('');
    setBozzaConfezione('');
    setFormAperto(true);
  }

  function aggiungiOrarioBozza() {
    const corrispondenza = bozzaNuovoOrario.trim().match(/^(\d{1,2}):(\d{1,2})$/);
    if (corrispondenza === null) {
      return;
    }
    const normalizzato = `${corrispondenza[1].padStart(2, '0')}:${corrispondenza[2].padStart(2, '0')}`;
    setBozzaOrari((precedente) =>
      precedente.includes(normalizzato) ? precedente : [...precedente, normalizzato].sort()
    );
    setBozzaNuovoOrario('');
  }

  function rimuoviOrarioBozza(orario: string) {
    setBozzaOrari((precedente) => precedente.filter((o) => o !== orario));
  }

  function salvaPiano() {
    const nome = bozzaNome.trim();
    const durata = parseInt(bozzaDurata, 10);
    const confezione = parseInt(bozzaConfezione, 10);
    if (
      nome === '' ||
      bozzaOrari.length === 0 ||
      !Number.isFinite(durata) ||
      durata <= 0 ||
      !Number.isFinite(confezione) ||
      confezione <= 0
    ) {
      return;
    }
    crea.mutate({
      nome,
      orari: bozzaOrari,
      dataInizio: bozzaDataInizio,
      durataGiorni: durata,
      quantitaConfezione: confezione,
    });
    setFormAperto(false);
  }

  async function confermaEliminaPiano(piano: PianoTerapeutico) {
    const conferma = await confermaAzione(
      `Eliminare "${piano.nome}"?`,
      'Non comparirà più qui. Le dosi già spuntate restano nello storico.',
      'Elimina'
    );
    if (conferma) {
      elimina.mutate(piano.id);
    }
  }

  const formValido =
    bozzaNome.trim() !== '' && bozzaOrari.length > 0 && bozzaDurata.trim() !== '' && bozzaConfezione.trim() !== '';

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
          <Text style={styles.titolo}>Piano terapeutico</Text>
        </View>

        {isLoading ? (
          <ActivityIndicator color={colori.scuro} style={styles.caricamento} />
        ) : piani.length === 0 ? (
          <Text style={styles.vuoto}>Nessun farmaco in corso.</Text>
        ) : (
          <View style={styles.listaPiani}>
            {piani.map((piano) => {
              const dosiPiano = dosi.filter((d) => d.piano_id === piano.id);
              const doseAssunteCount = dosiPiano.filter((d) => d.assunta).length;
              const rimanenti = doseRimanenti(piano.quantita_confezione, doseAssunteCount);
              const inAllerta = scortaInEsaurimento(rimanenti, piano.orari.length);
              const giornoAttuale = giornoDellaCura(piano.data_inizio, oggiISO, piano.durata_giorni);
              const espanso = pianoEspanso === piano.id;
              const dateUniche = [...new Set(dosiPiano.map((d) => d.data))];

              return (
                <View key={piano.id} style={styles.cardPiano}>
                  <Pressable
                    style={styles.cardPianoHeader}
                    onPress={() => setPianoEspanso(espanso ? null : piano.id)}
                  >
                    <View style={styles.cardPianoTesti}>
                      <Text style={styles.cardPianoNome}>{piano.nome}</Text>
                      <Text style={styles.cardPianoMeta} numberOfLines={1}>
                        {piano.orari.join(' · ')} · Giorno {giornoAttuale} di {piano.durata_giorni}
                      </Text>
                    </View>
                    {inAllerta && (
                      <View style={styles.distintivoAllerta}>
                        <Feather name="alert-triangle" size={11} color={colori.scuro} />
                        <Text style={styles.testoDistintivoAllerta}>{rimanenti} rimaste</Text>
                      </View>
                    )}
                    <Pressable onPress={() => confermaEliminaPiano(piano)} hitSlop={8}>
                      <Feather name="trash-2" size={14} color={colori.soft} />
                    </Pressable>
                    <Feather name={espanso ? 'chevron-up' : 'chevron-down'} size={18} color={colori.soft} />
                  </Pressable>

                  {espanso && (
                    <View style={styles.listaDosi}>
                      {dateUniche.map((data) => (
                        <View key={data} style={styles.rigaDataDosi}>
                          <Text style={styles.etichettaDataDosi}>{formattaDataBreve(data)}</Text>
                          <View style={styles.rigaOrariDosi}>
                            {dosiPiano
                              .filter((d) => d.data === data)
                              .map((dose) => (
                                <Pressable
                                  key={dose.id}
                                  onPress={() => spunta.mutate({ doseId: dose.id, assunta: !dose.assunta })}
                                >
                                  <View style={[styles.chipDose, dose.assunta && styles.chipDoseAssunta]}>
                                    {dose.assunta && <Feather name="check" size={11} color={colori.panna} />}
                                    <Text
                                      style={[styles.testoChipDose, dose.assunta && styles.testoChipDoseAssunta]}
                                    >
                                      {dose.orario}
                                    </Text>
                                  </View>
                                </Pressable>
                              ))}
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {formAperto ? (
          <View style={styles.form}>
            <View style={styles.campoForm}>
              <Text style={styles.etichettaCampoForm}>Nome farmaco</Text>
              <TextInput
                style={styles.input}
                placeholder="Es. Antibiotico"
                placeholderTextColor={colori.soft}
                value={bozzaNome}
                onChangeText={setBozzaNome}
              />
            </View>

            <View style={styles.campoForm}>
              <Text style={styles.etichettaCampoForm}>Orari delle dosi</Text>
              <View style={styles.rigaFiltri}>
                {bozzaOrari.map((orario) => (
                  <Pressable key={orario} onPress={() => rimuoviOrarioBozza(orario)}>
                    <View style={styles.chipOrarioBozza}>
                      <Text style={styles.testoChipOrarioBozza}>{orario}</Text>
                      <Feather name="x" size={12} color={colori.scuro} />
                    </View>
                  </Pressable>
                ))}
              </View>
              <View style={styles.rigaAggiungiOrario}>
                <TextInput
                  style={[styles.input, styles.inputOrario]}
                  placeholder="Es. 08:00"
                  placeholderTextColor={colori.soft}
                  keyboardType="numbers-and-punctuation"
                  value={bozzaNuovoOrario}
                  onChangeText={setBozzaNuovoOrario}
                  onSubmitEditing={aggiungiOrarioBozza}
                  returnKeyType="done"
                />
                <Pressable onPress={aggiungiOrarioBozza}>
                  <BloccoDuro offset={2} colore={colori.panna} raggio={9} contenutoStyle={styles.bottoneAggiungiOrario}>
                    <Feather name="plus" size={16} color={colori.scuro} />
                  </BloccoDuro>
                </Pressable>
              </View>
            </View>

            <View style={styles.rigaCampiAffiancati}>
              <View style={[styles.campoForm, styles.campoMeta]}>
                <Text style={styles.etichettaCampoForm}>Durata (giorni)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Es. 10"
                  placeholderTextColor={colori.soft}
                  keyboardType="number-pad"
                  value={bozzaDurata}
                  onChangeText={setBozzaDurata}
                />
              </View>
              <View style={[styles.campoForm, styles.campoMeta]}>
                <Text style={styles.etichettaCampoForm}>Pastiglie in confezione</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Es. 20"
                  placeholderTextColor={colori.soft}
                  keyboardType="number-pad"
                  value={bozzaConfezione}
                  onChangeText={setBozzaConfezione}
                />
              </View>
            </View>

            {bozzaDurata.trim() !== '' && !Number.isNaN(parseInt(bozzaDurata, 10)) && (
              <Text style={styles.anteprimaFine}>
                Fine cura prevista: {formattaDataBreve(dataFinePiano(bozzaDataInizio, parseInt(bozzaDurata, 10)))}
              </Text>
            )}

            <View style={styles.rigaAzioniForm}>
              <Pressable onPress={() => setFormAperto(false)} style={styles.bottoneAnnullaForm}>
                <Text style={styles.testoAnnullaForm}>Annulla</Text>
              </Pressable>
              <Pressable onPress={salvaPiano} style={!formValido && styles.bottoneDisabilitato} disabled={!formValido}>
                <BloccoDuro offset={2.5} colore={colori.corallo} raggio={11} contenutoStyle={styles.bottoneSalvaForm}>
                  <Text style={styles.testoBottoneSalvaForm}>Salva</Text>
                </BloccoDuro>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable onPress={apriNuovoPiano}>
            <BloccoDuro offset={2.5} colore={colori.panna} raggio={12} contenutoStyle={styles.bottoneNuovoPiano}>
              <Feather name="plus" size={15} color={colori.scuro} />
              <Text style={styles.testoNuovoPiano}>Nuovo farmaco</Text>
            </BloccoDuro>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  schermo: {
    flex: 1,
    backgroundColor: colori.crema,
  },
  contenuto: {
    paddingHorizontal: 16,
    gap: 20,
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
  caricamento: {
    marginTop: 12,
  },
  vuoto: {
    ...pesi.bold,
    fontSize: 13,
    color: colori.soft,
    textAlign: 'center',
    paddingVertical: 16,
  },
  listaPiani: {
    gap: 10,
  },
  cardPiano: {
    borderWidth: 2.5,
    borderColor: colori.scuro,
    borderRadius: 14,
    backgroundColor: colori.panna,
    overflow: 'hidden',
  },
  cardPianoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  cardPianoTesti: {
    flex: 1,
    minWidth: 0,
  },
  cardPianoNome: {
    ...pesi.extraBold,
    fontSize: 14.5,
    color: colori.scuro,
  },
  cardPianoMeta: {
    ...pesi.semiBold,
    fontSize: 11,
    color: colori.soft,
    marginTop: 2,
  },
  distintivoAllerta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderColor: colori.scuro,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    backgroundColor: '#F28FB3',
  },
  testoDistintivoAllerta: {
    ...pesi.extraBold,
    fontSize: 9.5,
    color: colori.scuro,
  },
  listaDosi: {
    borderTopWidth: 2,
    borderTopColor: colori.scuro,
    padding: 12,
    gap: 10,
  },
  rigaDataDosi: {
    gap: 6,
  },
  etichettaDataDosi: {
    ...pesi.extraBold,
    fontSize: 9.5,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colori.soft,
  },
  rigaOrariDosi: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chipDose: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1.5,
    borderColor: colori.scuro,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  chipDoseAssunta: {
    backgroundColor: colori.menta,
  },
  testoChipDose: {
    ...pesi.bold,
    fontSize: 11.5,
    color: colori.scuro,
  },
  testoChipDoseAssunta: {
    color: colori.panna,
  },
  form: {
    borderWidth: 2,
    borderColor: colori.scuro,
    borderRadius: 16,
    padding: 16,
    gap: 16,
    backgroundColor: colori.panna,
  },
  campoForm: {
    gap: 8,
  },
  etichettaCampoForm: {
    ...pesi.extraBold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colori.soft,
  },
  input: {
    borderWidth: 2,
    borderColor: colori.scuro,
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: '700',
    color: colori.scuro,
    backgroundColor: '#fff',
  },
  rigaFiltri: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipOrarioBozza: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    borderColor: colori.scuro,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: colori.viola,
  },
  testoChipOrarioBozza: {
    ...pesi.extraBold,
    fontSize: 12,
    color: colori.scuro,
  },
  rigaAggiungiOrario: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputOrario: {
    flex: 1,
  },
  bottoneAggiungiOrario: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rigaCampiAffiancati: {
    flexDirection: 'row',
    gap: 12,
  },
  campoMeta: {
    flex: 1,
  },
  anteprimaFine: {
    ...pesi.semiBold,
    fontSize: 11.5,
    color: colori.soft,
    marginTop: -6,
  },
  rigaAzioniForm: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  bottoneAnnullaForm: {
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  testoAnnullaForm: {
    ...pesi.bold,
    fontSize: 12.5,
    color: colori.soft,
  },
  bottoneSalvaForm: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  testoBottoneSalvaForm: {
    ...pesi.extraBold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#fff',
  },
  bottoneDisabilitato: {
    opacity: 0.5,
  },
  bottoneNuovoPiano: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
  },
  testoNuovoPiano: {
    ...pesi.extraBold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colori.scuro,
  },
});
