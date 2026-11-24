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

import type { Allenamento } from '@/api/allenamenti';
import { aggiungiGiorni, dataLocaleISO } from '@/calcolo/ricorrenzaFaccende';
import { giorniDellaSettimana, schedeDelGiorno } from '@/calcolo/ricorrenzaAllenamenti';
import { BloccoDuro } from '@/components/BloccoDuro';
import { useAllenamenti } from '@/hooks/useAllenamenti';
import { useOccorrenzeAllenamentoSettimana } from '@/hooks/useOccorrenzeAllenamentoSettimana';
import { confermaAzione } from '@/lib/conferma';
import { useAuthStore } from '@/store/authStore';
import { PALETTE_CASELLE } from '@/theme/caselle';
import { coloriNB as colori, pesiNB as pesi } from '@/theme/neoBrutalista';

const ETICHETTE_GIORNI = ['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM'];
const NOMI_MESI = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
];

function etichettaGiornoEsteso(dataISO: string): string {
  const [anno, mese, giorno] = dataISO.split('-').map(Number);
  return `${giorno} ${NOMI_MESI[mese - 1]} ${anno}`;
}

export default function AllenamentiPersonali() {
  const insets = useSafeAreaInsets();
  const utenteId = useAuthStore((stato) => stato.session?.user.id) ?? null;
  const fusoOrario = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const oggiISO = dataLocaleISO(new Date(), fusoOrario);

  const [giornoSelezionato, setGiornoSelezionato] = useState(oggiISO);
  const giorni = giorniDellaSettimana(giornoSelezionato);

  const { allenamenti, isLoading, crea, aggiorna, elimina } = useAllenamenti(utenteId);
  const { occorrenze } = useOccorrenzeAllenamentoSettimana(utenteId, giorni[0], giorni[6]);

  const [formAperto, setFormAperto] = useState(false);
  const [schedaInModifica, setSchedaInModifica] = useState<Allenamento | null>(null);
  const [bozzaTitolo, setBozzaTitolo] = useState('');
  const [bozzaGiorni, setBozzaGiorni] = useState<number[]>([]);
  const [bozzaColore, setBozzaColore] = useState<string>(PALETTE_CASELLE[0]);

  function tornaIndietro() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/personale');
    }
  }

  function cambiaSettimana(delta: number) {
    setGiornoSelezionato((precedente) => aggiungiGiorni(precedente, delta * 7));
  }

  function apriNuovaScheda() {
    setSchedaInModifica(null);
    setBozzaTitolo('');
    setBozzaGiorni([]);
    setBozzaColore(PALETTE_CASELLE[0]);
    setFormAperto(true);
  }

  function apriModificaScheda(scheda: Allenamento) {
    setSchedaInModifica(scheda);
    setBozzaTitolo(scheda.titolo);
    setBozzaGiorni(scheda.giorni_settimana);
    setBozzaColore(scheda.colore);
    setFormAperto(true);
  }

  function alternaGiornoBozza(giorno: number) {
    setBozzaGiorni((precedente) =>
      precedente.includes(giorno)
        ? precedente.filter((g) => g !== giorno)
        : [...precedente, giorno].sort((a, b) => a - b)
    );
  }

  function salvaScheda() {
    const titolo = bozzaTitolo.trim();
    if (titolo === '' || bozzaGiorni.length === 0) {
      return;
    }
    if (schedaInModifica !== null) {
      aggiorna.mutate({ id: schedaInModifica.id, titolo, giorniSettimana: bozzaGiorni, colore: bozzaColore });
    } else {
      crea.mutate({ titolo, giorniSettimana: bozzaGiorni, colore: bozzaColore });
    }
    setFormAperto(false);
  }

  async function confermaEliminaScheda(scheda: Allenamento) {
    const conferma = await confermaAzione(
      `Eliminare "${scheda.titolo}"?`,
      'Non comparirà più in calendario. Le sessioni già registrate restano nello storico.',
      'Elimina'
    );
    if (conferma) {
      elimina.mutate(scheda.id);
    }
  }

  function apriSessione(scheda: Allenamento) {
    router.push({
      pathname: '/personale/allenamenti/sessione',
      params: { allenamentoId: scheda.id, data: giornoSelezionato, titolo: scheda.titolo },
    });
  }

  const schedeMappate = allenamenti.map((a) => ({ ...a, giorniSettimana: a.giorni_settimana }));
  const schedeDelGiornoSelezionato = schedeDelGiorno(schedeMappate, giornoSelezionato);

  function fattaIl(allenamentoId: string, data: string): boolean {
    return occorrenze.some((o) => o.allenamento_id === allenamentoId && o.data === data);
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
          <Text style={styles.titolo}>Allenamenti</Text>
        </View>

        <View style={styles.rigaSettimana}>
          <Pressable onPress={() => cambiaSettimana(-1)} hitSlop={8}>
            <Feather name="chevron-left" size={22} color={colori.scuro} />
          </Pressable>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.striscia}>
            {giorni.map((dataISO, indice) => {
              const schedeDiQuestoGiorno = schedeDelGiorno(schedeMappate, dataISO);
              const haSchede = schedeDiQuestoGiorno.length > 0;
              // Con più schede nello stesso giorno (raro) si prende il colore
              // della prima: l'elenco sotto la striscia mostra comunque il
              // dettaglio esatto di ciascuna.
              const coloreGiorno = haSchede ? schedeDiQuestoGiorno[0].colore : colori.panna;
              const tutteFatte = haSchede && schedeDiQuestoGiorno.every((s) => fattaIl(s.id, dataISO));
              const selezionato = dataISO === giornoSelezionato;
              const oggi = dataISO === oggiISO;
              return (
                <Pressable key={dataISO} onPress={() => setGiornoSelezionato(dataISO)}>
                  <View style={styles.involucroPillGiorno}>
                    <BloccoDuro
                      offset={selezionato ? 2.5 : 0}
                      colore={coloreGiorno}
                      bordo={oggi || !haSchede}
                      raggio={12}
                      contenutoStyle={styles.pillGiorno}
                    >
                      <Text style={styles.etichettaPillGiorno}>{ETICHETTE_GIORNI[indice]}</Text>
                      <Text style={styles.numeroPillGiorno}>{Number(dataISO.slice(8, 10))}</Text>
                    </BloccoDuro>
                    {tutteFatte && (
                      <View style={styles.distintivoFatto}>
                        <Feather name="check" size={9} color={colori.scuro} />
                      </View>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable onPress={() => cambiaSettimana(1)} hitSlop={8}>
            <Feather name="chevron-right" size={22} color={colori.scuro} />
          </Pressable>
        </View>

        <Text style={styles.etichettaGiorno}>{etichettaGiornoEsteso(giornoSelezionato)}</Text>

        {isLoading ? (
          <ActivityIndicator color={colori.scuro} style={styles.caricamento} />
        ) : schedeDelGiornoSelezionato.length === 0 ? (
          <Text style={styles.vuoto}>Nessun allenamento programmato per questo giorno.</Text>
        ) : (
          <View style={styles.listaSchede}>
            {schedeDelGiornoSelezionato.map((scheda) => {
              const fatta = fattaIl(scheda.id, giornoSelezionato);
              return (
                <View key={scheda.id} style={styles.cardScheda}>
                  <Pressable style={styles.cardSchedaContenuto} onPress={() => apriSessione(scheda)}>
                    <View style={[styles.accentoScheda, { backgroundColor: scheda.colore }]} />
                    <View style={styles.cardSchedaTesti}>
                      <Text style={styles.cardSchedaTitolo}>{scheda.titolo}</Text>
                      <Text style={[styles.cardSchedaStato, fatta && styles.cardSchedaStatoFatta]}>
                        {fatta ? 'Fatto' : 'Da fare'}
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={18} color={colori.soft} />
                  </Pressable>
                  <View style={styles.cardSchedaAzioni}>
                    <Pressable onPress={() => apriModificaScheda(scheda)} hitSlop={8}>
                      <Feather name="edit-2" size={14} color={colori.soft} />
                    </Pressable>
                    <Pressable onPress={() => confermaEliminaScheda(scheda)} hitSlop={8}>
                      <Feather name="trash-2" size={14} color={colori.soft} />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {formAperto ? (
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Es. Palestra - Petto e bicipiti"
              placeholderTextColor={colori.soft}
              value={bozzaTitolo}
              onChangeText={setBozzaTitolo}
            />
            <View style={styles.rigaGiorniForm}>
              {ETICHETTE_GIORNI.map((etichetta, indice) => {
                const giorno = indice + 1;
                const selezionato = bozzaGiorni.includes(giorno);
                return (
                  <Pressable key={giorno} onPress={() => alternaGiornoBozza(giorno)}>
                    <View style={[styles.chipGiornoForm, selezionato && styles.chipGiornoFormSelezionato]}>
                      <Text
                        style={[styles.testoChipGiornoForm, selezionato && styles.testoChipGiornoFormSelezionato]}
                      >
                        {etichetta.charAt(0)}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.rigaColoriForm}>
              {PALETTE_CASELLE.map((coloreOpzione) => (
                <Pressable key={coloreOpzione} onPress={() => setBozzaColore(coloreOpzione)} hitSlop={4}>
                  <View
                    style={[
                      styles.pallinoColoreForm,
                      { backgroundColor: coloreOpzione },
                      bozzaColore === coloreOpzione && styles.pallinoColoreFormSelezionato,
                    ]}
                  >
                    {bozzaColore === coloreOpzione && <Feather name="check" size={14} color={colori.scuro} />}
                  </View>
                </Pressable>
              ))}
            </View>
            <View style={styles.rigaAzioniForm}>
              <Pressable onPress={() => setFormAperto(false)} style={styles.bottoneAnnullaForm}>
                <Text style={styles.testoAnnullaForm}>Annulla</Text>
              </Pressable>
              <Pressable
                onPress={salvaScheda}
                style={(bozzaTitolo.trim() === '' || bozzaGiorni.length === 0) && styles.bottoneDisabilitato}
                disabled={bozzaTitolo.trim() === '' || bozzaGiorni.length === 0}
              >
                <BloccoDuro offset={2.5} colore={colori.corallo} raggio={11} contenutoStyle={styles.bottoneSalvaForm}>
                  <Text style={styles.testoBottoneSalvaForm}>Salva</Text>
                </BloccoDuro>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable onPress={apriNuovaScheda} hitSlop={8}>
            <Text style={styles.linkNuovaScheda}>+ Nuova scheda</Text>
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
  rigaSettimana: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  striscia: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  involucroPillGiorno: {
    position: 'relative',
  },
  pillGiorno: {
    width: 42,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  etichettaPillGiorno: {
    ...pesi.extraBold,
    fontSize: 9,
    color: colori.soft,
  },
  numeroPillGiorno: {
    ...pesi.extraBold,
    fontSize: 15,
    color: colori.scuro,
    marginTop: 2,
  },
  distintivoFatto: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colori.scuro,
    backgroundColor: colori.menta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  etichettaGiorno: {
    ...pesi.extraBold,
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: colori.soft,
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
  listaSchede: {
    gap: 10,
  },
  cardScheda: {
    borderWidth: 2.5,
    borderColor: colori.scuro,
    borderRadius: 14,
    backgroundColor: colori.panna,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 8,
  },
  cardSchedaContenuto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  accentoScheda: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colori.scuro,
  },
  cardSchedaTesti: {
    flex: 1,
  },
  cardSchedaTitolo: {
    ...pesi.extraBold,
    fontSize: 14.5,
    color: colori.scuro,
  },
  cardSchedaStato: {
    ...pesi.bold,
    fontSize: 11,
    color: colori.soft,
    marginTop: 2,
  },
  cardSchedaStatoFatta: {
    color: colori.menta,
  },
  cardSchedaAzioni: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'flex-end',
  },
  form: {
    borderWidth: 2,
    borderColor: colori.scuro,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    backgroundColor: colori.panna,
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
  rigaGiorniForm: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'space-between',
  },
  chipGiornoForm: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colori.scuro,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  chipGiornoFormSelezionato: {
    backgroundColor: colori.viola,
  },
  testoChipGiornoForm: {
    ...pesi.extraBold,
    fontSize: 12,
    color: colori.scuro,
  },
  testoChipGiornoFormSelezionato: {
    color: colori.scuro,
  },
  rigaColoriForm: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  pallinoColoreForm: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colori.scuro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pallinoColoreFormSelezionato: {
    borderWidth: 3,
  },
  rigaAzioniForm: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  linkNuovaScheda: {
    ...pesi.extraBold,
    fontSize: 13,
    color: colori.corallo,
    textAlign: 'center',
  },
});
