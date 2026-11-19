import { Feather } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { altezzaBarraConSafeArea, BarraInferiore } from '@/components/BarraInferiore';
import { BloccoDuro } from '@/components/BloccoDuro';
import { calcolaPosizionePersonale } from '@/components/GroupBalanceCard';
import { CifraScomparto, Scomparto, stileValoreScomparto } from '@/components/Scomparto';
import { SelettoreColoreCasella } from '@/components/SelettoreColoreCasella';
import { PARETE, Vassoio } from '@/components/Vassoio';
import { useArticoliSpesa } from '@/hooks/useArticoliSpesa';
import { useFontBento } from '@/hooks/useFontBento';
import { useGruppoAttivo } from '@/hooks/useGruppoAttivo';
import { useImpegni } from '@/hooks/useImpegni';
import { useListe } from '@/hooks/useListe';
import { useNoteGruppo } from '@/hooks/useNoteGruppo';
import { useSaldi } from '@/hooks/useSaldi';
import { useSfide } from '@/hooks/useSfide';
import { formattaEuro } from '@/lib/formato';
import { useAuthStore } from '@/store/authStore';
import { useColoreCasella } from '@/store/coloriCaselleStore';
import { useGruppoAttivoStore } from '@/store/gruppoAttivoStore';
import { apriSelettore, type AperturaSelettoreColore } from '@/theme/caselle';
import { coloriNB as colori, pesiNB as pesi, soldiNB } from '@/theme/neoBrutalista';

export default function Dashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [fontPronti] = useFontBento();
  const utenteId = useAuthStore((stato) => stato.session?.user.id);
  const gruppoAttivoId = useGruppoAttivoStore((stato) => stato.gruppoAttivoId);
  const { gruppo, membriAttivi, isLoading } = useGruppoAttivo();
  const { liste, isLoading: listeInCaricamento } = useListe(gruppoAttivoId);
  const { note, isLoading: noteInCaricamento } = useNoteGruppo(gruppoAttivoId, null);
  const {
    articoli,
    isLoading: articoliInCaricamento,
    error: erroreArticoli,
  } = useArticoliSpesa(gruppoAttivoId);
  const { transazioni, isLoading: saldiInCaricamento, error: erroreSaldi } =
    useSaldi(gruppoAttivoId);
  const { sfide, isLoading: sfideInCaricamento } = useSfide(gruppoAttivoId);
  const { impegni, occorrenze, isLoading: impegniInCaricamento } = useImpegni(gruppoAttivoId);

  const coloreSaldo = useColoreCasella('dashboard.saldo', colori.panna);
  const coloreSpesa = useColoreCasella('dashboard.spesa', colori.menta);
  const coloreScrivi = useColoreCasella('dashboard.scrivi', colori.oro);
  const coloreFaccende = useColoreCasella('dashboard.faccende', colori.viola);
  const coloreListe = useColoreCasella('dashboard.liste', colori.panna);
  const coloreSfide = useColoreCasella('dashboard.sfide', colori.oro);
  const coloreCalendario = useColoreCasella('dashboard.calendario', colori.menta);
  const coloreNote = useColoreCasella('dashboard.note', colori.viola);
  const [casellaInModifica, setCasellaInModifica] = useState<AperturaSelettoreColore | null>(null);

  // Posizione netta dell'utente in QUESTO gruppo - vedi
  // calcolaPosizionePersonale in GroupBalanceCard.tsx (testata a parte in
  // GroupBalanceCard.test.ts) per cosa fa e perché non è un nuovo calcolo
  // finanziario. Il calcolo non cambia: cambia solo chi lo mostra.
  const ilMioMembro = membriAttivi.find((m) => m.utente_id === utenteId);
  const mioNettoCentesimi = useMemo(() => {
    if (ilMioMembro === undefined) {
      return null;
    }
    return calcolaPosizionePersonale(transazioni, ilMioMembro.id);
  }, [transazioni, ilMioMembro]);

  const impegniPerId = useMemo(() => new Map(impegni.map((i) => [i.id, i])), [impegni]);
  // impegniPerId.has(...): cancellaImpegno è un soft delete, quindi
  // un'occorrenza del suo impegno può restare nel DB anche dopo che
  // l'impegno non è più attivo - va ignorata, non mostrata come "prossimo impegno".
  const prossimaOccorrenza = useMemo(
    () => occorrenze.find((o) => impegniPerId.has(o.impegno_id) && new Date(o.data_ora) > new Date()),
    [occorrenze, impegniPerId]
  );

  // Si arriva qui solo scegliendo un gruppo dall'elenco gruppi; senza un
  // gruppo attivo selezionato (es. link diretto, o store appena resettato)
  // si torna all'elenco gruppi.
  if (gruppoAttivoId === null) {
    return <Redirect href="/gruppi" />;
  }

  if (isLoading || gruppo === null || !fontPronti) {
    return (
      <SafeAreaView style={[styles.schermo, styles.centrato]} edges={['top']}>
        <ActivityIndicator color={colori.scuro} />
      </SafeAreaView>
    );
  }

  const listeInHome = liste.filter((l) => l.mostra_in_home);

  const pendenti = articoli.filter((a) => a.stato === 'da_comprare').length;
  const erroreArticoliBool = erroreArticoli !== null && erroreArticoli !== undefined;
  // "Tutto comprato" ha senso solo se la lista non è vuota - altrimenti si
  // lascerebbe intendere che c'era qualcosa da comprare quando in realtà
  // non è mai stato aggiunto nulla.
  const dettaglioSpesa =
    articoliInCaricamento || erroreArticoliBool
      ? undefined
      : articoli.length === 0
        ? 'Lista vuota'
        : pendenti === 0
          ? 'Tutto comprato'
          : undefined;

  const sfideAttive = sfide.filter((s) => s.sfida.stato === 'in_corso').length;

  const titoloProssimoImpegno = impegniInCaricamento
    ? undefined
    : prossimaOccorrenza === undefined
      ? 'Nessun impegno in programma'
      : impegniPerId.get(prossimaOccorrenza.impegno_id)?.titolo ?? 'Impegno';

  function tornaIndietro() {
    if (router.canGoBack()) {
      router.back();
    } else {
      // Nessuna cronologia di navigazione (es. link diretto a /dashboard,
      // ricaricamento della pagina su web): si torna comunque in un posto
      // sicuro invece di restare bloccati o uscire dall'app.
      router.replace('/gruppi');
    }
  }

  function apriImpostazioni() {
    router.push('/gruppo');
  }

  return (
    // SafeAreaView (non il padding calcolato a mano con insets.top) per il
    // bordo superiore: su Android con edge-to-edge insets.top può valere 0
    // al primo render prima che la misura nativa arrivi, lasciando
    // l'intestazione sovrapposta alla status bar - vedi lo screenshot del
    // problema. SafeAreaView riserva lo spazio a livello nativo, non JS.
    <SafeAreaView style={styles.schermo} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.contenuto,
          { paddingTop: 16, paddingBottom: altezzaBarraConSafeArea(insets.bottom) },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.rigaTitolo}>
            <Pressable onPress={tornaIndietro} hitSlop={8}>
              <BloccoDuro
                offset={2}
                colore={colori.panna}
                raggio={10}
                contenutoStyle={styles.quadrato}
              >
                <Feather name="arrow-left" size={17} color={colori.scuro} />
              </BloccoDuro>
            </Pressable>
            <Text style={styles.titolo} numberOfLines={1}>
              {gruppo.nome}
            </Text>
          </View>
          <View style={styles.azioniHeader}>
            <Pressable onPress={apriImpostazioni} hitSlop={8}>
              <BloccoDuro
                offset={2}
                colore={colori.panna}
                raggio={10}
                contenutoStyle={styles.quadrato}
              >
                <Feather name="settings" size={17} color={colori.scuro} />
              </BloccoDuro>
            </Pressable>
            {membriAttivi.length > 0 && (
              <Pressable onPress={apriImpostazioni} style={styles.membri} hitSlop={8}>
                {/* Al massimo 4 cerchietti + un "+N": oltre non ci sta nella
                    riga dell'header, e il gruppo può avere molti più di
                    due membri (CLAUDE.md regola 4). */}
                {membriAttivi.slice(0, 4).map((membro) => (
                  <View key={membro.id} style={styles.membro}>
                    <Text style={styles.inizialeMembro}>
                      {membro.nome.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                ))}
                {membriAttivi.length > 4 && (
                  <View style={[styles.membro, styles.membroExtra]}>
                    <Text style={styles.inizialeMembroExtra}>+{membriAttivi.length - 4}</Text>
                  </View>
                )}
              </Pressable>
            )}
          </View>
        </View>

        {/* Primo piano: i conti e la spesa. */}
        <Vassoio>
          <View style={styles.mosaico}>
            <Scomparto
              colore={coloreSaldo}
              azione="Vedi"
              orizzontale
              onPress={() => router.push('/saldi')}
              onLongPress={() => setCasellaInModifica(apriSelettore('dashboard.saldo'))}
            >
              <View style={styles.testiSaldo}>
                <Text style={styles.nomeScomparto}>Il tuo saldo</Text>
                {saldiInCaricamento ? (
                  <ActivityIndicator color={colori.scuro} style={styles.caricamentoSaldo} />
                ) : erroreSaldi !== null && erroreSaldi !== undefined ? (
                  <Text style={styles.saldoNeutro}>Vedi saldi e spese</Text>
                ) : mioNettoCentesimi === null ? (
                  <Text style={styles.saldoNeutro}>Vedi saldi e spese</Text>
                ) : mioNettoCentesimi === 0 ? (
                  <Text style={styles.saldoInPari}>In pari</Text>
                ) : (
                  <>
                    <Text
                      style={[
                        styles.saldo,
                        {
                          color:
                            mioNettoCentesimi > 0 ? soldiNB.credito : soldiNB.debito,
                        },
                      ]}
                    >
                      {mioNettoCentesimi > 0 ? '+' : '−'}
                      {formattaEuro(Math.abs(mioNettoCentesimi))}
                    </Text>
                    <Text style={styles.dettaglioSaldo}>
                      {mioNettoCentesimi > 0
                        ? 'Ti devono, in questo gruppo'
                        : 'Devi tu, in questo gruppo'}
                    </Text>
                  </>
                )}
              </View>
            </Scomparto>

            <View style={styles.riga}>
              <Scomparto
                style={styles.cella}
                nome="Spesa"
                icona="shopping-cart"
                colore={coloreSpesa}
                azione="Apri"
                onPress={() => router.push('/lista-spesa')}
                onLongPress={() => setCasellaInModifica(apriSelettore('dashboard.spesa'))}
              >
                {articoliInCaricamento ? (
                  <ActivityIndicator color={colori.scuro} />
                ) : (
                  <CifraScomparto
                    cifra={pendenti}
                    unita="da comprare"
                    dettaglio={dettaglioSpesa}
                  />
                )}
              </Scomparto>

              <Scomparto
                style={styles.cella}
                colore={coloreScrivi}
                azione="Scrivi"
                onPress={() => router.push('/assistente')}
                onLongPress={() => setCasellaInModifica(apriSelettore('dashboard.scrivi'))}
              >
                <View style={styles.rigaScrivi}>
                  <View style={styles.badgeScrivi}>
                    <Feather name="edit-3" size={20} color={colori.scuro} />
                  </View>
                  <Text style={styles.nomeScrivi}>Scrivi cosa{'\n'}hai fatto</Text>
                </View>
              </Scomparto>
            </View>
          </View>
        </Vassoio>

        {/* Secondo piano: le attività. Nessuno scomparto confinante ha lo
            stesso colore (viola | panna / oro | menta). */}
        <Vassoio>
          <View style={styles.mosaico}>
            <View style={styles.riga}>
              <Scomparto
                style={styles.cella}
                nome="Faccende"
                icona="check-square"
                colore={coloreFaccende}
                azione="Apri"
                onPress={() => router.push('/faccende')}
                onLongPress={() => setCasellaInModifica(apriSelettore('dashboard.faccende'))}
              >
                {/* Nessuna cifra: la dashboard non carica i punti delle faccende,
                    e un numero inventato sarebbe peggio di nessun numero. */}
                <CifraScomparto unita="Punti e classifica" />
              </Scomparto>

              <Scomparto
                style={styles.cella}
                nome="Liste"
                icona="list"
                colore={coloreListe}
                azione="Apri"
                onPress={() => router.push('/liste')}
                onLongPress={() => setCasellaInModifica(apriSelettore('dashboard.liste'))}
              >
                {listeInCaricamento ? (
                  <ActivityIndicator color={colori.scuro} />
                ) : (
                  <CifraScomparto
                    cifra={liste.length}
                    unita={liste.length === 1 ? 'lista' : 'liste'}
                  />
                )}
              </Scomparto>
            </View>

            <View style={styles.riga}>
              <Scomparto
                style={styles.cella}
                nome="Sfide"
                icona="award"
                colore={coloreSfide}
                azione="Apri"
                onPress={() => router.push('/sfide')}
                onLongPress={() => setCasellaInModifica(apriSelettore('dashboard.sfide'))}
              >
                {sfideInCaricamento ? (
                  <ActivityIndicator color={colori.scuro} />
                ) : sfideAttive === 0 ? (
                  <CifraScomparto unita="Nessuna attiva" />
                ) : (
                  <CifraScomparto
                    cifra={sfideAttive}
                    unita={sfideAttive === 1 ? 'attiva' : 'attive'}
                  />
                )}
              </Scomparto>

              <Scomparto
                style={styles.cella}
                nome="Calendario"
                icona="calendar"
                colore={coloreCalendario}
                azione="Apri"
                onPress={() => router.push('/calendario')}
                onLongPress={() => setCasellaInModifica(apriSelettore('dashboard.calendario'))}
              >
                <CifraScomparto unita="Prossimo" dettaglio={titoloProssimoImpegno} />
              </Scomparto>
            </View>
          </View>
        </Vassoio>

        <Vassoio>
          <Scomparto
            nome="Note"
            icona="edit-3"
            colore={coloreNote}
            azione="Apri"
            orizzontale
            onPress={() => router.push('/note')}
            onLongPress={() => setCasellaInModifica(apriSelettore('dashboard.note'))}
          >
            {noteInCaricamento ? (
              <ActivityIndicator color={colori.scuro} />
            ) : (
              <CifraScomparto
                cifra={note.length}
                unita={note.length === 1 ? 'nota salvata' : 'note salvate'}
              />
            )}
          </Scomparto>
        </Vassoio>

        {listeInHome.length > 0 && (
          <Vassoio etichetta="In evidenza">
            <View style={styles.righePiatte}>
              {listeInHome.map((lista) => (
                <Pressable
                  key={lista.id}
                  style={styles.rigaPiatta}
                  onPress={() =>
                    router.push({
                      pathname: '/liste/[id]',
                      params: {
                        id: lista.id,
                        nome: lista.nome,
                        conPrezzi: lista.con_prezzi ? '1' : '0',
                      },
                    })
                  }
                >
                  <Text style={styles.testoRigaPiatta} numberOfLines={1}>
                    {lista.nome}
                  </Text>
                  <Feather name="arrow-right" size={14} color={colori.scuro} />
                </Pressable>
              ))}
            </View>
          </Vassoio>
        )}
      </ScrollView>

      <BarraInferiore attiva="gruppi" />

      <SelettoreColoreCasella apertura={casellaInModifica} onChiudi={() => setCasellaInModifica(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  schermo: {
    flex: 1,
    backgroundColor: colori.crema,
  },
  centrato: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  contenuto: {
    flexGrow: 1,
    paddingHorizontal: 16,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  rigaTitolo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    flexShrink: 1,
  },
  quadrato: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titolo: {
    ...pesi.extraBold,
    fontSize: 26,
    letterSpacing: -0.9,
    textTransform: 'uppercase',
    color: colori.scuro,
    flexShrink: 1,
  },
  azioniHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  membri: {
    flexDirection: 'row',
  },
  membro: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: colori.scuro,
    backgroundColor: colori.panna,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -5,
  },
  inizialeMembro: {
    ...pesi.extraBold,
    fontSize: 12,
    color: colori.scuro,
  },
  membroExtra: {
    backgroundColor: colori.scuro,
  },
  inizialeMembroExtra: {
    ...pesi.extraBold,
    fontSize: 10.5,
    color: colori.crema,
  },
  mosaico: {
    gap: PARETE,
  },
  riga: {
    flexDirection: 'row',
    gap: PARETE,
  },
  cella: {
    flex: 1,
  },
  testiSaldo: {
    flexShrink: 1,
  },
  nomeScomparto: {
    ...pesi.extraBold,
    fontSize: 11.5,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colori.scuro,
  },
  /** Il verde e il rosso stanno solo sulla cifra, mai come riempimento. */
  saldo: {
    ...stileValoreScomparto,
    fontSize: 28,
    lineHeight: 30,
    marginTop: 4,
  },
  saldoInPari: {
    ...stileValoreScomparto,
    fontSize: 28,
    lineHeight: 30,
    marginTop: 4,
  },
  saldoNeutro: {
    ...pesi.bold,
    fontSize: 12.5,
    color: colori.soft,
    marginTop: 5,
  },
  dettaglioSaldo: {
    ...pesi.bold,
    fontSize: 12.5,
    color: colori.soft,
    marginTop: 4,
  },
  caricamentoSaldo: {
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  rigaScrivi: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    flexShrink: 1,
  },
  badgeScrivi: {
    width: 40,
    height: 40,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colori.scuro,
    backgroundColor: colori.panna,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nomeScrivi: {
    ...pesi.extraBold,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colori.scuro,
    flexShrink: 1,
  },
  righePiatte: {
    gap: 2,
    backgroundColor: colori.scuro,
  },
  rigaPiatta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 11,
    backgroundColor: colori.panna,
    paddingVertical: 12,
    paddingHorizontal: 13,
  },
  testoRigaPiatta: {
    ...pesi.extraBold,
    fontSize: 13.5,
    color: colori.scuro,
    flexShrink: 1,
  },
});
