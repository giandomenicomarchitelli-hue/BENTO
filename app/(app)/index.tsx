import { Feather } from '@expo/vector-icons';
import { formatDistanceToNowStrict } from 'date-fns';
import { it } from 'date-fns/locale';
import { Redirect, useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { esci } from '@/api/auth';
import { BloccoDuro } from '@/components/BloccoDuro';
import { useFontBento } from '@/hooks/useFontBento';
import { useListePersonali } from '@/hooks/useListePersonali';
import { useMieiGruppi } from '@/hooks/useMieiGruppi';
import { useNotePersonali } from '@/hooks/useNotePersonali';
import { useNotifiche } from '@/hooks/useNotifiche';
import { useProfilo } from '@/hooks/useProfilo';
import { useAuthStore } from '@/store/authStore';
import { coloriNB as colori, pesiNB as pesi } from '@/theme/neoBrutalista';

/**
 * Altezza del solo contenuto della barra inferiore (senza la safe area,
 * aggiunta a parte) - serve sia allo spazio lasciato in fondo allo
 * ScrollView sia allo stile della barra stessa, deve restare la stessa
 * costante nei due punti.
 */
const ALTEZZA_BARRA = 64;

/**
 * Elenco notifiche fisso, non scorrevole: uno scorrimento annidato con
 * sfumatura in overlay si è rivelato fragile (l'ombra/bordo dura
 * dell'ultima riga restava visibile sotto la sfumatura, creando una
 * "card fantasma" vuota) - più semplice e robusto mostrare al massimo
 * le N più recenti, con "Vedi tutte le notifiche" per il resto.
 */
const MASSIMO_NOTIFICHE = 8;

/** Icona, etichetta e colore del badge per ogni famiglia di tipo notifica. */
function infoTipoNotifica(tipo: string): {
  icona: ComponentProps<typeof Feather>['name'];
  etichetta: string;
  colore: string;
} {
  if (tipo.startsWith('sfida_')) {
    return { icona: 'award', etichetta: 'Sfida', colore: colori.oro };
  }
  if (tipo.startsWith('impegno_')) {
    return { icona: 'calendar', etichetta: 'Impegno', colore: colori.menta };
  }
  if (tipo.startsWith('articolo_spesa_')) {
    return { icona: 'shopping-bag', etichetta: 'Spesa', colore: colori.corallo };
  }
  return { icona: 'list', etichetta: 'Lista', colore: colori.viola };
}

export default function Homepage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [fontPronti] = useFontBento();
  const { profilo, isLoading: profiloInCaricamento } = useProfilo();
  const utenteId = useAuthStore((stato) => stato.session?.user.id) ?? null;
  const { gruppi, isLoading: gruppiInCaricamento } = useMieiGruppi();
  const { liste, isLoading: listeInCaricamento } = useListePersonali(utenteId);
  const { note, isLoading: noteInCaricamento } = useNotePersonali(utenteId);
  const { notifiche, nonLette, isLoading: notificheInCaricamento } = useNotifiche();

  // Serve un nome utente fisso prima di poter fare qualunque cosa, e il
  // font neo-brutalista pronto prima di disegnare qualunque testo di
  // questa schermata (altrimenti un istante col font di sistema, poi lo
  // scatto a Plus Jakarta Sans appena pronto).
  if (profiloInCaricamento || !fontPronti) {
    return (
      <View style={[styles.schermo, styles.centrato]}>
        <ActivityIndicator color={colori.scuro} />
      </View>
    );
  }
  if (profilo === null) {
    return <Redirect href="/crea-profilo" />;
  }

  const inizialeNome = profilo.nome_utente.charAt(0).toUpperCase();
  const personaleInCaricamento = listeInCaricamento || noteInCaricamento;

  return (
    <View style={styles.schermo}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.contenuto,
          { paddingTop: insets.top + 16, paddingBottom: ALTEZZA_BARRA + 24 },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.marchioRiga}>
            <BloccoDuro offset={2} colore={colori.corallo} raggio={12} contenutoStyle={styles.logoQuadrato} />
            <Text style={styles.marchio}>
              BENTO<Text style={styles.puntoMarchio}>.</Text>
            </Text>
          </View>
          <View style={styles.azioniHeader}>
            <Pressable onPress={() => esci()} hitSlop={8} style={styles.bottoneEsci}>
              <Feather name="log-out" size={16} color={colori.scuro} />
            </Pressable>
            <Pressable onPress={() => router.push('/profilo')}>
              <BloccoDuro offset={2} colore="#fff" raggio={999} contenutoStyle={styles.avatarCerchio}>
                <Text style={styles.avatarTesto}>{inizialeNome}</Text>
              </BloccoDuro>
            </Pressable>
          </View>
        </View>

        <Text style={styles.saluto}>CIAO, {profilo.nome_utente.toUpperCase()}!</Text>

        <View style={styles.sezioneCompartimenti}>
          <BloccoDuro
            offset={4}
            gradiente={['#C83528', '#BD3125']}
            raggio={28}
            contenutoStyle={styles.boxCompartimenti}
          >
            <View style={styles.rigaCard}>
              <BloccoDuro
                style={styles.cardWrapper}
                onPress={() => router.push('/personale')}
                offset={3}
                colore="#fff"
                raggio={20}
                contenutoStyle={styles.card}
              >
                <View>
                  <View style={styles.intestazioneCard}>
                    <Text style={styles.etichettaCard}>PERSONALE</Text>
                    <View style={[styles.pallino, { backgroundColor: colori.oro }]} />
                  </View>
                  {personaleInCaricamento ? (
                    <ActivityIndicator color={colori.scuro} style={styles.caricamentoCard} />
                  ) : (
                    <View style={styles.corpoCardCentrato}>
                      <Text style={styles.statoPersonale}>
                        {liste.length} {liste.length === 1 ? 'lista' : 'liste'}
                      </Text>
                      <Text style={styles.statoPersonaleSecondario}>
                        {note.length} {note.length === 1 ? 'nota' : 'note'}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.pieCard}>
                  <Text style={styles.linkCard}>Entra</Text>
                  <Text style={styles.frecciaCard}>→</Text>
                </View>
              </BloccoDuro>

              <BloccoDuro
                style={styles.cardWrapper}
                onPress={() => router.push('/gruppi')}
                offset={3}
                colore="#fff"
                raggio={20}
                contenutoStyle={styles.card}
              >
                <View>
                  <View style={styles.intestazioneCard}>
                    <Text style={styles.etichettaCard}>GRUPPI</Text>
                    <View style={[styles.pallino, { backgroundColor: colori.corallo }]} />
                  </View>
                  {gruppiInCaricamento ? (
                    <ActivityIndicator color={colori.scuro} style={styles.caricamentoCard} />
                  ) : (
                    <View style={styles.corpoCardCentrato}>
                      <Text style={styles.numeroGruppi}>{gruppi.length}</Text>
                      <Text style={styles.etichettaGruppiAttivi}>GRUPPI ATTIVI</Text>
                      {gruppi.length > 0 && (
                        <Text style={styles.nomeGruppo} numberOfLines={1}>
                          {gruppi[0].nome}
                          {gruppi.length > 1 ? ` +${gruppi.length - 1}` : ''}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
                <View style={styles.pieCard}>
                  <Text style={styles.linkCard}>Apri</Text>
                  <Text style={styles.frecciaCard}>→</Text>
                </View>
              </BloccoDuro>
            </View>
          </BloccoDuro>
        </View>

        <View style={styles.sezioneNotifiche}>
          <View style={styles.intestazioneNotifiche}>
            <View style={styles.rigaTitoloNotifiche}>
              <Text style={styles.titoloSezione}>ULTIME NOTIFICHE</Text>
              {nonLette > 0 && (
                <BloccoDuro
                  offset={1.5}
                  colore={colori.corallo}
                  raggio={999}
                  contenutoStyle={styles.badgeNonLette}
                >
                  <Text style={styles.testoBadgeNonLette}>{nonLette} NUOVE</Text>
                </BloccoDuro>
              )}
            </View>
            <Pressable onPress={() => router.push('/notifiche')}>
              <Text style={styles.linkTutte}>Tutte →</Text>
            </Pressable>
          </View>

          {notificheInCaricamento ? (
            <ActivityIndicator color={colori.scuro} />
          ) : notifiche.length === 0 ? (
            <Text style={styles.nessunaNotifica}>Nessuna notifica ancora.</Text>
          ) : (
            <BloccoDuro offset={4} colore={colori.cremaCard} raggio={24} contenutoStyle={styles.boxNotifiche}>
              {notifiche.slice(0, MASSIMO_NOTIFICHE).map((notifica, indice, visibili) => {
                const { icona, etichetta, colore: coloreTipo } = infoTipoNotifica(notifica.tipo);
                // L'ultima riga mostrata si "spegne" quando ce ne sono
                // altre sotto - stesso effetto visivo della sfumatura a
                // scorrimento del mockup, ma su una sola riga fissa e
                // senza ScrollView/overlay: niente ombre/bordi che
                // sbucano da sotto una maschera (il difetto già trovato
                // con l'approccio a scorrimento).
                const ultimaEConAltre = indice === visibili.length - 1 && notifiche.length > MASSIMO_NOTIFICHE;
                return (
                  <View key={notifica.id} style={ultimaEConAltre && styles.notificaSfumata}>
                    <BloccoDuro offset={2} colore="#fff" raggio={18} contenutoStyle={styles.rigaNotifica}>
                      <View style={[styles.iconaNotifica, { backgroundColor: coloreTipo }]}>
                        <Feather name={icona} size={16} color={colori.scuro} />
                      </View>
                      <View style={styles.contenutoNotifica}>
                        <View style={styles.rigaMetaNotifica}>
                          <Text style={[styles.badgeTipo, { backgroundColor: coloreTipo }]}>
                            {etichetta}
                          </Text>
                          <Text style={styles.tempoNotifica}>
                            {formatDistanceToNowStrict(new Date(notifica.creata_il), {
                              locale: it,
                              addSuffix: true,
                            })}
                          </Text>
                        </View>
                        <Text style={styles.testoNotifica} numberOfLines={1}>
                          {notifica.titolo}
                        </Text>
                      </View>
                    </BloccoDuro>
                  </View>
                );
              })}
              <Pressable onPress={() => router.push('/notifiche')} style={styles.bottoneVediTutte}>
                <Text style={styles.testoVediTutte}>VEDI TUTTE LE NOTIFICHE</Text>
                <Text style={styles.frecciaVediTutte}>→</Text>
              </Pressable>
            </BloccoDuro>
          )}
        </View>
      </ScrollView>

      <View style={[styles.barraInferiore, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
        <View style={styles.vociBarra}>
          <View style={styles.vocetaBarra}>
            <View style={styles.iconaHomeAttiva}>
              <Feather name="home" size={16} color={colori.scuro} />
            </View>
            <Text style={styles.etichettaBarra}>HOME</Text>
          </View>
          <Pressable style={styles.vocetaBarra} onPress={() => router.push('/personale')}>
            <Feather name="user" size={20} color={colori.scuro} />
            <Text style={styles.etichettaBarra}>PERSONALE</Text>
          </Pressable>
          <View style={[styles.vocetaBarra, styles.voceCentrale]}>
            <BloccoDuro offset={2.5} colore={colori.corallo} raggio={999} contenutoStyle={styles.bottoneVoce}>
              <Feather name="mic" size={22} color="#fff" />
            </BloccoDuro>
            <Text style={styles.etichettaBarra}>VOCE</Text>
          </View>
          <Pressable style={styles.vocetaBarra} onPress={() => router.push('/gruppi')}>
            <Feather name="users" size={20} color={colori.scuro} />
            <Text style={styles.etichettaBarra}>GRUPPI</Text>
          </Pressable>
          <View style={styles.vocetaBarra}>
            <Feather name="credit-card" size={20} color={colori.scuro} />
            <Text style={styles.etichettaBarra}>SALDI</Text>
          </View>
        </View>
      </View>
    </View>
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
    paddingHorizontal: 20,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  marchioRiga: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoQuadrato: {
    width: 40,
    height: 40,
  },
  marchio: {
    ...pesi.extraBold,
    fontSize: 26,
    letterSpacing: -0.5,
    color: colori.scuro,
  },
  puntoMarchio: {
    color: colori.corallo,
  },
  azioniHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bottoneEsci: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCerchio: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTesto: {
    ...pesi.extraBold,
    fontSize: 15,
    color: colori.scuro,
  },
  saluto: {
    ...pesi.extraBold,
    fontSize: 20,
    letterSpacing: -0.2,
    color: colori.scuro,
    textTransform: 'uppercase',
  },
  sezioneCompartimenti: {},
  boxCompartimenti: {
    padding: 12,
    paddingTop: 20,
  },
  rigaCard: {
    flexDirection: 'row',
    gap: 12,
  },
  cardWrapper: {
    flex: 1,
  },
  card: {
    minHeight: 168,
    padding: 12,
    justifyContent: 'space-between',
  },
  intestazioneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderBottomColor: colori.scuro,
  },
  etichettaCard: {
    ...pesi.extraBold,
    fontSize: 11,
    color: colori.scuro,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  pallino: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colori.scuro,
  },
  caricamentoCard: {
    marginTop: 20,
  },
  corpoCardCentrato: {
    marginTop: 14,
    alignItems: 'center',
  },
  statoPersonale: {
    ...pesi.extraBold,
    fontSize: 16,
    color: colori.scuro,
  },
  statoPersonaleSecondario: {
    ...pesi.bold,
    fontSize: 13,
    color: colori.grigioTesto,
    marginTop: 2,
  },
  numeroGruppi: {
    ...pesi.extraBold,
    fontSize: 32,
    color: colori.scuro,
    lineHeight: 34,
  },
  etichettaGruppiAttivi: {
    ...pesi.extraBold,
    fontSize: 9,
    color: colori.corallo,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 2,
  },
  nomeGruppo: {
    ...pesi.bold,
    fontSize: 10,
    color: colori.grigioTesto,
    marginTop: 3,
    maxWidth: '100%',
  },
  pieCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E0D6',
  },
  linkCard: {
    ...pesi.extraBold,
    fontSize: 11,
    color: colori.scuro,
  },
  frecciaCard: {
    ...pesi.bold,
    fontSize: 12,
    color: colori.scuro,
  },
  sezioneNotifiche: {
    gap: 8,
  },
  intestazioneNotifiche: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rigaTitoloNotifiche: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titoloSezione: {
    ...pesi.extraBold,
    fontSize: 14,
    color: colori.scuro,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  badgeNonLette: {
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  testoBadgeNonLette: {
    ...pesi.extraBold,
    fontSize: 9,
    color: '#fff',
  },
  linkTutte: {
    ...pesi.extraBold,
    fontSize: 11,
    color: colori.scuro,
    textTransform: 'uppercase',
  },
  nessunaNotifica: {
    fontSize: 13,
    color: colori.grigioTesto,
    textAlign: 'center',
    paddingVertical: 12,
  },
  boxNotifiche: {
    padding: 12,
    gap: 10,
  },
  notificaSfumata: {
    opacity: 0.35,
  },
  rigaNotifica: {
    padding: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  iconaNotifica: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colori.scuro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contenutoNotifica: {
    flex: 1,
    minWidth: 0,
  },
  rigaMetaNotifica: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeTipo: {
    ...pesi.extraBold,
    fontSize: 9,
    color: colori.scuro,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colori.scuro,
    textTransform: 'uppercase',
  },
  tempoNotifica: {
    ...pesi.bold,
    fontSize: 10,
    color: colori.grigioTesto,
  },
  testoNotifica: {
    ...pesi.extraBold,
    fontSize: 13,
    color: colori.scuro,
    marginTop: 3,
  },
  bottoneVediTutte: {
    marginTop: 2,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colori.scuro,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  testoVediTutte: {
    ...pesi.extraBold,
    fontSize: 12,
    color: colori.scuro,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  frecciaVediTutte: {
    ...pesi.extraBold,
    fontSize: 14,
    color: colori.scuro,
  },
  /**
   * HOME è mostrata attiva per via statica (siamo sempre su questa
   * schermata). PERSONALE e GRUPPI portano alle rispettive schermate;
   * VOCE e SALDI restano solo grafica, non esiste ancora una schermata
   * per loro.
   */
  barraInferiore: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colori.crema,
    borderTopWidth: 2.5,
    borderTopColor: colori.scuro,
    paddingTop: 8,
    paddingHorizontal: 12,
  },
  vociBarra: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  vocetaBarra: {
    alignItems: 'center',
    gap: 4,
    minWidth: 48,
  },
  etichettaBarra: {
    ...pesi.extraBold,
    fontSize: 8.5,
    color: colori.scuro,
    letterSpacing: 0.2,
  },
  iconaHomeAttiva: {
    width: 40,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colori.scuro,
    backgroundColor: colori.oro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voceCentrale: {
    marginTop: -16,
  },
  bottoneVoce: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
