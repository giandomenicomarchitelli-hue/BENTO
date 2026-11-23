import { Feather } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { SpesaConQuote } from '@/api/spese';
import { BloccoDuro } from '@/components/BloccoDuro';
import { PARETE } from '@/components/Vassoio';
import { useGruppoAttivo } from '@/hooks/useGruppoAttivo';
import { useSaldi } from '@/hooks/useSaldi';
import { useSpese } from '@/hooks/useSpese';
import { confermaAzione } from '@/lib/conferma';
import { euroInCentesimi, formattaEuro } from '@/lib/formato';
import { useGruppoAttivoStore } from '@/store/gruppoAttivoStore';
import { coloreCiclico, coloriNB as colori, pesiNB as pesi, soldiNB } from '@/theme/neoBrutalista';

export default function Saldi() {
  const gruppoAttivoId = useGruppoAttivoStore((stato) => stato.gruppoAttivoId);

  if (gruppoAttivoId === null) {
    return <Redirect href="/gruppi" />;
  }

  return <SaldiDelGruppo gruppoAttivoId={gruppoAttivoId} />;
}

function Cerchietto({ nome }: { nome: string }) {
  return (
    <View style={[styles.cerchietto, { backgroundColor: coloreCiclico(nome) }]}>
      <Text style={styles.inizialeCerchietto}>{nome.charAt(0).toUpperCase()}</Text>
    </View>
  );
}

/**
 * Componente a livello di modulo (non annidato in SaldiDelGruppo) perché ha
 * un proprio stato locale (bozza dell'importo in modifica): annidato
 * verrebbe ricreato - e il suo stato perso - ad ogni render del genitore.
 */
function RigaSpesa({
  spesa,
  nome,
  annullaInCorso,
  modificaInCorso,
  onAnnulla,
  onModifica,
}: {
  spesa: SpesaConQuote;
  nome: string;
  annullaInCorso: boolean;
  modificaInCorso: boolean;
  onAnnulla: () => void;
  onModifica: (nuovoImportoCentesimi: number) => void;
}) {
  const [modificando, setModificando] = useState(false);
  const [bozzaImporto, setBozzaImporto] = useState(formattaImportoPerInput(spesa.importo_centesimi));

  function apriModifica() {
    setBozzaImporto(formattaImportoPerInput(spesa.importo_centesimi));
    setModificando(true);
  }

  async function confermaSalvaModifica() {
    const nuovoImporto = euroInCentesimi(bozzaImporto);
    if (nuovoImporto === null || nuovoImporto <= 0) {
      return;
    }
    if (nuovoImporto === spesa.importo_centesimi) {
      setModificando(false);
      return;
    }
    const conferma = await confermaAzione(
      'Correggere l’importo?',
      `"${spesa.descrizione !== '' ? spesa.descrizione : 'Spesa'}" passerà da ${formattaEuro(spesa.importo_centesimi)} a ${formattaEuro(nuovoImporto)}. Il saldo si aggiorna di conseguenza.`,
      'Salva'
    );
    if (conferma) {
      onModifica(nuovoImporto);
      setModificando(false);
    }
  }

  return (
    <View style={styles.riga}>
      <Cerchietto nome={nome} />
      <View style={styles.testi}>
        <Text style={styles.descrizione} numberOfLines={1}>
          {spesa.descrizione !== '' ? spesa.descrizione : 'Spesa'}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {nome} · {spesa.data}
        </Text>
      </View>
      {modificando ? (
        <TextInput
          style={styles.inputImporto}
          keyboardType="decimal-pad"
          value={bozzaImporto}
          onChangeText={setBozzaImporto}
          autoFocus
        />
      ) : (
        <Text style={styles.importoSpesa}>{formattaEuro(spesa.importo_centesimi)}</Text>
      )}
      <View style={styles.azioniSpesa}>
        {modificando ? (
          <Pressable onPress={confermaSalvaModifica} hitSlop={8} disabled={modificaInCorso}>
            <Text style={styles.linkModificaSpesa}>Salva</Text>
          </Pressable>
        ) : (
          <>
            <Pressable onPress={apriModifica} hitSlop={8}>
              <Text style={styles.linkModificaSpesa}>Modifica</Text>
            </Pressable>
            <Pressable onPress={onAnnulla} hitSlop={8} disabled={annullaInCorso}>
              <Text style={styles.linkAnnullaSpesa}>Annulla</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

function formattaImportoPerInput(centesimi: number): string {
  return String(centesimi / 100).replace('.', ',');
}

function SaldiDelGruppo({ gruppoAttivoId }: { gruppoAttivoId: string }) {
  const insets = useSafeAreaInsets();
  const { gruppo, membri } = useGruppoAttivo();
  const { transazioni, isLoading: saldiInCaricamento } = useSaldi(gruppoAttivoId);
  const { spese, isLoading: speseInCaricamento, annulla, modifica } = useSpese(gruppoAttivoId);

  // Il saldo ha bisogno di TUTTA la cronologia per tornare esatto (vedi
  // useSaldi/calcolaSaldi), ma mostrarla tutta qui no: `spese` cresce senza
  // fine per un gruppo vissuto a lungo. Qui si taglia solo cosa si disegna
  // (le 30 più recenti, in ordine decrescente), non cosa si scarica.
  const speseRecenti = useMemo(() => spese.slice(-30).reverse(), [spese]);

  const nomeMembro = (membroId: string) =>
    membri.find((m) => m.id === membroId)?.nome ?? 'Qualcuno';

  function tornaIndietro() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/gruppi');
    }
  }

  async function confermaAnnullaSpesa(spesa: SpesaConQuote) {
    const conferma = await confermaAzione(
      'Annullare questa spesa?',
      `"${spesa.descrizione !== '' ? spesa.descrizione : 'Spesa'}" (${formattaEuro(spesa.importo_centesimi)}) non conterà più nei saldi. Resterà comunque nello storico come annullata.`,
      'Annulla spesa'
    );
    if (conferma) {
      annulla.mutate(spesa.id);
    }
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
          <View style={styles.testiTitolo}>
            <Text style={styles.titolo}>Saldi</Text>
            {gruppo !== null && (
              <Text style={styles.sottotitolo} numberOfLines={1}>
                {gruppo.nome}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.rigaAzioni}>
          <BloccoDuro
            offset={2.5}
            colore={colori.corallo}
            raggio={11}
            contenutoStyle={styles.bottoneAzione}
            onPress={() => router.push('/spese/nuova')}
          >
            <Feather name="plus" size={13} color="#fff" />
            <Text style={styles.testoBottoneAzioneChiaro}>Nuova spesa</Text>
          </BloccoDuro>
          <BloccoDuro
            offset={2.5}
            colore={colori.oro}
            raggio={11}
            contenutoStyle={styles.bottoneAzione}
            onPress={() => router.push('/saldi/salda')}
          >
            <Feather name="repeat" size={13} color={colori.scuro} />
            <Text style={styles.testoBottoneAzioneScuro}>Salda debito</Text>
          </BloccoDuro>
        </View>

        <View>
          <Text style={styles.etichettaFeed}>Saldi aperti</Text>
          {saldiInCaricamento ? (
            <ActivityIndicator color={colori.scuro} style={styles.caricamento} />
          ) : transazioni.length === 0 ? (
            <Text style={styles.vuoto}>Siete in pari! 🎉</Text>
          ) : (
            <BloccoDuro offset={3.5} colore={colori.scuro} raggio={17} contenutoStyle={styles.elenco}>
              <View style={styles.righe}>
                {transazioni.map((t, indice) => {
                  const nomeDa = nomeMembro(t.da);
                  const nomeA = nomeMembro(t.a);
                  return (
                    <View key={`${t.da}-${t.a}-${indice}`} style={styles.riga}>
                      <Cerchietto nome={nomeDa} />
                      <Text style={styles.testoDebito} numberOfLines={1}>
                        {nomeDa} deve a <Text style={pesi.extraBold}>{nomeA}</Text>
                      </Text>
                      <Text style={styles.importoDebito}>{formattaEuro(t.importoCentesimi)}</Text>
                      <Pressable
                        onPress={() =>
                          router.push({
                            pathname: '/saldi/salda',
                            params: { da: t.da, a: t.a, importoCentesimi: String(t.importoCentesimi) },
                          })
                        }
                        hitSlop={8}
                      >
                        <Text style={styles.linkSalda}>Salda →</Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </BloccoDuro>
          )}
        </View>

        <View>
          <Text style={styles.etichettaFeed}>Spese recenti</Text>
          {speseInCaricamento ? (
            <ActivityIndicator color={colori.scuro} style={styles.caricamento} />
          ) : spese.length === 0 ? (
            <Text style={styles.vuoto}>Nessuna spesa registrata.</Text>
          ) : (
            <BloccoDuro offset={3.5} colore={colori.scuro} raggio={17} contenutoStyle={styles.elenco}>
              <View style={styles.righe}>
                {speseRecenti.map((spesa) => (
                  <RigaSpesa
                    key={spesa.id}
                    spesa={spesa}
                    nome={nomeMembro(spesa.pagato_da)}
                    annullaInCorso={annulla.isPending}
                    modificaInCorso={modifica.isPending}
                    onAnnulla={() => confermaAnnullaSpesa(spesa)}
                    onModifica={(nuovoImportoCentesimi) => modifica.mutate({ spesa, nuovoImportoCentesimi })}
                  />
                ))}
              </View>
            </BloccoDuro>
          )}
        </View>
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
    gap: 14,
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
  testiTitolo: {
    flex: 1,
    minWidth: 0,
  },
  titolo: {
    ...pesi.extraBold,
    fontSize: 18,
    letterSpacing: -0.3,
    color: colori.scuro,
  },
  sottotitolo: {
    ...pesi.bold,
    fontSize: 10.5,
    color: colori.soft,
    marginTop: 1,
  },
  rigaAzioni: {
    flexDirection: 'row',
    gap: 8,
  },
  bottoneAzione: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  testoBottoneAzioneChiaro: {
    ...pesi.extraBold,
    fontSize: 10.5,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#fff',
  },
  testoBottoneAzioneScuro: {
    ...pesi.extraBold,
    fontSize: 10.5,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colori.scuro,
  },
  etichettaFeed: {
    ...pesi.extraBold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colori.soft,
    marginBottom: 7,
  },
  caricamento: {
    marginVertical: 12,
  },
  vuoto: {
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
    gap: 10,
  },
  cerchietto: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colori.scuro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inizialeCerchietto: {
    ...pesi.extraBold,
    fontSize: 10,
    color: colori.scuro,
  },
  testoDebito: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colori.scuro,
  },
  importoDebito: {
    ...pesi.extraBold,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    color: soldiNB.debito,
  },
  linkSalda: {
    ...pesi.extraBold,
    fontSize: 9,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colori.scuro,
    marginLeft: 4,
  },
  testi: {
    flex: 1,
    minWidth: 0,
  },
  descrizione: {
    fontSize: 13,
    fontWeight: '700',
    color: colori.scuro,
  },
  meta: {
    fontSize: 10.5,
    color: colori.soft,
    marginTop: 2,
  },
  importoSpesa: {
    ...pesi.extraBold,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    color: colori.scuro,
  },
  inputImporto: {
    ...pesi.extraBold,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    color: colori.scuro,
    borderWidth: 1.5,
    borderColor: colori.scuro,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 56,
    textAlign: 'right',
  },
  azioniSpesa: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkModificaSpesa: {
    ...pesi.extraBold,
    fontSize: 9,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colori.scuro,
    marginLeft: 8,
  },
  linkAnnullaSpesa: {
    ...pesi.extraBold,
    fontSize: 9,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colori.corallo,
    marginLeft: 8,
  },
});
