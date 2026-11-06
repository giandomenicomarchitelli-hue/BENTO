import { Feather } from '@expo/vector-icons';
import { formatDistanceToNowStrict } from 'date-fns';
import { it } from 'date-fns/locale';
import { Redirect, useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { esci } from '@/api/auth';
import { BloccoDuro } from '@/components/BloccoDuro';
import { CifraScomparto, Scomparto } from '@/components/Scomparto';
import { PARETE, Vassoio } from '@/components/Vassoio';
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
 * Quante notifiche entrano nel feed prima del bottone. Il conteggio
 * totale sta nel bottone stesso, quindi non serve sfumare l'ultima riga
 * per far capire che ce ne sono altre (era il difetto della versione
 * precedente).
 */
const RIGHE_FEED = 3;

/** Icona e colore del quadratino per ogni famiglia di tipo notifica. */
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
    return { icona: 'shopping-bag', etichetta: 'Spesa', colore: colori.viola };
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
  const { notifiche, isLoading: notificheInCaricamento } = useNotifiche();

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
  const personaleVuoto = liste.length === 0 && note.length === 0;

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
            <BloccoDuro
              offset={2}
              colore={colori.scuro}
              raggio={7}
              contenutoStyle={styles.logoVassoio}
            >
              <View style={styles.logoRiga}>
                <View style={[styles.logoCella, { backgroundColor: colori.oro }]} />
                <View style={[styles.logoCella, { backgroundColor: colori.menta }]} />
              </View>
              <View style={styles.logoRiga}>
                <View style={[styles.logoCella, { backgroundColor: colori.viola }]} />
                <View style={[styles.logoCella, { backgroundColor: colori.corallo }]} />
              </View>
            </BloccoDuro>
            <Text style={styles.marchio}>
              BENTO<Text style={styles.puntoMarchio}>.</Text>
            </Text>
          </View>
          <View style={styles.azioniHeader}>
            <Pressable onPress={() => esci()} hitSlop={8} style={styles.bottoneEsci}>
              <Feather name="log-out" size={17} color={colori.scuro} />
            </Pressable>
            <Pressable onPress={() => router.push('/profilo')}>
              <BloccoDuro
                offset={2}
                colore={colori.panna}
                raggio={999}
                contenutoStyle={styles.avatarCerchio}
              >
                <Text style={styles.avatarTesto}>{inizialeNome}</Text>
              </BloccoDuro>
            </Pressable>
          </View>
        </View>

        <Text style={styles.saluto}>Ciao, {profilo.nome_utente}</Text>

        {/* Mosaico Home: Personale a tutta altezza a sinistra, Gruppi e
            Scrivi impilati a destra. Diverso da quello di Personale
            apposta, così le due schermate non si confondono. */}
        <Vassoio>
          <View style={styles.mosaicoHome}>
            <Scomparto
              style={styles.colonnaLarga}
              nome="Personale"
              icona="user"
              colore={colori.panna}
              azione={personaleVuoto ? 'Crea la prima' : 'Entra'}
              onPress={() => router.push('/personale')}
            >
              {personaleInCaricamento ? (
                <ActivityIndicator color={colori.scuro} />
              ) : personaleVuoto ? (
                <CifraScomparto unita="Ancora vuoto" dettaglio="Liste e note solo tue" />
              ) : (
                <CifraScomparto
                  cifra={liste.length}
                  unita={liste.length === 1 ? 'lista' : 'liste'}
                  dettaglio={`+ ${note.length} ${note.length === 1 ? 'nota' : 'note'}`}
                />
              )}
            </Scomparto>

            <View style={styles.colonnaStretta}>
              <Scomparto
                nome="Gruppi"
                icona="users"
                colore={colori.menta}
                azione="Apri"
                onPress={() => router.push('/gruppi')}
              >
                {gruppiInCaricamento ? (
                  <ActivityIndicator color={colori.scuro} />
                ) : (
                  <CifraScomparto
                    cifra={gruppi.length}
                    dettaglio={
                      gruppi.length === 0
                        ? 'Nessun gruppo'
                        : `${gruppi[0].nome}${gruppi.length > 1 ? ` +${gruppi.length - 1}` : ''}`
                    }
                  />
                )}
              </Scomparto>

              <Scomparto
                colore={colori.oro}
                azione="Scrivi"
                onPress={() => router.push('/assistente')}
              >
                <View style={styles.rigaScrivi}>
                  <View style={styles.badgeScrivi}>
                    <Feather name="edit-3" size={16} color={colori.scuro} />
                  </View>
                  <Text style={styles.nomeScrivi}>Scrivi cosa{'\n'}hai fatto</Text>
                </View>
              </Scomparto>
            </View>
          </View>
        </Vassoio>

        {/* Feed appiattito: le notifiche vivono nelle pareti del loro
            contenitore, come gli scomparti. Nessuna card dentro la card. */}
        <BloccoDuro offset={4} colore={colori.scuro} raggio={18} contenutoStyle={styles.feed}>
          {notificheInCaricamento ? (
            <View style={styles.feedVuoto}>
              <ActivityIndicator color={colori.scuro} />
            </View>
          ) : notifiche.length === 0 ? (
            <View style={styles.feedVuoto}>
              <Text style={styles.testoFeedVuoto}>Nessuna notifica ancora</Text>
            </View>
          ) : (
            <>
              <View style={styles.righeFeed}>
                {notifiche.slice(0, RIGHE_FEED).map((notifica) => {
                  const { icona, etichetta, colore } = infoTipoNotifica(notifica.tipo);
                  return (
                    <View key={notifica.id} style={styles.rigaFeed}>
                      <View style={[styles.segnoFeed, { backgroundColor: colore }]}>
                        <Feather name={icona} size={12} color={colori.scuro} />
                      </View>
                      <View style={styles.testoFeed}>
                        <View style={styles.metaFeed}>
                          <Text style={styles.etichettaFeed}>{etichetta}</Text>
                          <Text style={styles.etichettaFeed}>
                            {formatDistanceToNowStrict(new Date(notifica.creata_il), {
                              locale: it,
                              addSuffix: true,
                            })}
                          </Text>
                        </View>
                        <Text style={styles.titoloFeed} numberOfLines={1}>
                          {notifica.titolo}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
              <Pressable onPress={() => router.push('/notifiche')} style={styles.ctaFeed}>
                <Text style={styles.testoCtaFeed}>Tutte le notifiche</Text>
                <Text style={styles.contatoreFeed}>{notifiche.length}</Text>
              </Pressable>
            </>
          )}
        </BloccoDuro>
      </ScrollView>

      <View style={[styles.barraInferiore, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
        <View style={styles.vociBarra}>
          <View style={styles.voceBarra}>
            <BloccoDuro
              offset={1.5}
              colore={colori.menta}
              raggio={7}
              contenutoStyle={styles.chipAttivo}
            >
              <Feather name="home" size={13} color={colori.scuro} />
            </BloccoDuro>
            <Text style={styles.etichettaBarra}>HOME</Text>
          </View>
          <Pressable style={styles.voceBarra} onPress={() => router.push('/personale')}>
            <Feather name="user" size={17} color={colori.scuro} />
            <Text style={styles.etichettaBarra}>PERSONALE</Text>
          </Pressable>
          <Pressable
            style={[styles.voceBarra, styles.voceCentrale]}
            onPress={() => router.push('/assistente')}
          >
            <BloccoDuro
              offset={2.5}
              colore={colori.corallo}
              raggio={999}
              contenutoStyle={styles.bottoneScrivi}
            >
              <Feather name="edit-3" size={18} color="#fff" />
            </BloccoDuro>
            <Text style={styles.etichettaBarra}>SCRIVI</Text>
          </Pressable>
          <Pressable style={styles.voceBarra} onPress={() => router.push('/gruppi')}>
            <Feather name="users" size={17} color={colori.scuro} />
            <Text style={styles.etichettaBarra}>GRUPPI</Text>
          </Pressable>
          <View style={styles.voceBarra}>
            <Feather name="credit-card" size={17} color={colori.scuro} />
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
    paddingHorizontal: 16,
    gap: 13,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  marchioRiga: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoVassoio: {
    width: 28,
    height: 28,
    gap: 1.5,
    overflow: 'hidden',
  },
  logoRiga: {
    flex: 1,
    flexDirection: 'row',
    gap: 1.5,
  },
  logoCella: {
    flex: 1,
  },
  marchio: {
    ...pesi.extraBold,
    fontSize: 20,
    letterSpacing: -0.4,
    color: colori.scuro,
  },
  puntoMarchio: {
    color: colori.corallo,
  },
  azioniHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  bottoneEsci: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCerchio: {
    width: 29,
    height: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTesto: {
    ...pesi.extraBold,
    fontSize: 12,
    color: colori.scuro,
  },
  saluto: {
    ...pesi.extraBold,
    fontSize: 14.5,
    letterSpacing: 0.1,
    color: colori.scuro,
  },
  mosaicoHome: {
    flexDirection: 'row',
    gap: PARETE,
  },
  colonnaLarga: {
    flex: 1.06,
  },
  colonnaStretta: {
    flex: 1,
    gap: PARETE,
  },
  rigaScrivi: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    flexShrink: 1,
  },
  badgeScrivi: {
    width: 32,
    height: 32,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colori.scuro,
    backgroundColor: colori.panna,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nomeScrivi: {
    ...pesi.extraBold,
    fontSize: 9,
    lineHeight: 13,
    letterSpacing: 1.17,
    textTransform: 'uppercase',
    color: colori.scuro,
    flexShrink: 1,
  },
  feed: {
    borderRadius: 18 - PARETE,
    overflow: 'hidden',
    backgroundColor: colori.scuro,
  },
  righeFeed: {
    gap: 2,
    backgroundColor: colori.scuro,
  },
  rigaFeed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: colori.panna,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  segnoFeed: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colori.scuro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testoFeed: {
    flex: 1,
    minWidth: 0,
  },
  metaFeed: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  etichettaFeed: {
    ...pesi.extraBold,
    fontSize: 7.5,
    letterSpacing: 0.75,
    textTransform: 'uppercase',
    color: colori.soft,
  },
  titoloFeed: {
    ...pesi.extraBold,
    fontSize: 10.5,
    color: colori.scuro,
    marginTop: 2,
  },
  ctaFeed: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: colori.scuro,
    padding: 9,
  },
  testoCtaFeed: {
    ...pesi.extraBold,
    fontSize: 8.5,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: colori.crema,
  },
  contatoreFeed: {
    ...pesi.extraBold,
    fontSize: 8.5,
    letterSpacing: 0.5,
    color: colori.scuro,
    backgroundColor: colori.oro,
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  feedVuoto: {
    backgroundColor: colori.panna,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  testoFeedVuoto: {
    ...pesi.bold,
    fontSize: 10.5,
    color: colori.soft,
  },
  /**
   * HOME è mostrata attiva per via statica (siamo sempre su questa
   * schermata). SALDI resta solo grafica: non esiste ancora una
   * schermata per lei.
   */
  barraInferiore: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colori.crema,
    borderTopWidth: 2.5,
    borderTopColor: colori.scuro,
    paddingTop: 7,
    paddingHorizontal: 11,
  },
  vociBarra: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  voceBarra: {
    width: 47,
    alignItems: 'center',
    gap: 4,
  },
  etichettaBarra: {
    ...pesi.extraBold,
    fontSize: 6.8,
    letterSpacing: 0.55,
    color: colori.scuro,
  },
  chipAttivo: {
    width: 34,
    height: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voceCentrale: {
    marginTop: -15,
  },
  bottoneScrivi: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
