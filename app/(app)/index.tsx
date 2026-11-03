import { Feather } from '@expo/vector-icons';
import { formatDistanceToNowStrict } from 'date-fns';
import { it } from 'date-fns/locale';
import { Redirect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { cubicBezier } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { esci } from '@/api/auth';
import { useFontBento } from '@/hooks/useFontBento';
import { useListePersonali } from '@/hooks/useListePersonali';
import { useMieiGruppi } from '@/hooks/useMieiGruppi';
import { useNotePersonali } from '@/hooks/useNotePersonali';
import { useNotifiche } from '@/hooks/useNotifiche';
import { useProfilo } from '@/hooks/useProfilo';
import { useAuthStore } from '@/store/authStore';

/**
 * Palette "neo-brutalista" solo per questa schermata (bordi spessi neri,
 * ombre dure a blocco, nessun vetro/blur) - un restyling isolato della
 * sola Home, non un nuovo tema globale: il resto dell'app resta sul
 * tema "Hybrid Liquid Glass" di theme/tokens.ts.
 */
const colori = {
  crema: '#F8F9FA',
  cremaCard: '#F3EFE6',
  scuro: '#1A1817',
  corallo: '#EE5D50',
  oro: '#FDCB4E',
  menta: '#72C4B8',
  grigioTesto: '#716C65',
};

/**
 * Nessuna variante 900/Black esiste per Plus Jakarta Sans (vedi
 * useFontBento.ts) - 800 ExtraBold è il peso massimo reale caricato.
 * `fontFamily` è ciò che conta per il rendering con un font custom
 * caricato per singolo peso; `fontWeight` resta allineato per coerenza,
 * non ha effetto aggiuntivo una volta che `fontFamily` è impostato.
 */
const pesi = {
  extraBold: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontWeight: '800' as const },
  bold: { fontFamily: 'PlusJakartaSans_700Bold', fontWeight: '700' as const },
};

/** Curva di ease-out decisa (skill animate-expo), per il feedback al tocco di BloccoDuro. */
const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);

/**
 * Altezza del solo contenuto della barra inferiore (senza la safe area,
 * aggiunta a parte) - serve sia allo spazio lasciato in fondo allo
 * ScrollView sia allo stile della barra stessa, deve restare la stessa
 * costante nei due punti.
 */
const ALTEZZA_BARRA = 64;

/**
 * "Ombra dura" neo-brutalista: un rettangolo scuro pieno, sfalsato di
 * `offset` px dietro la superficie visibile - non le proprietà shadow
 * (o elevation) di RN, che rendono in modo incoerente tra iOS/Android/web e non danno mai
 * il bordo netto voluto qui.
 *
 * `style` dimensiona/posiziona il blocco nel layout circostante (es.
 * flex:1 per due card affiancate); `contenutoStyle` è solo l'interno
 * (padding, gap, allineamento) - separati apposta, non un unico `style`
 * ambiguo (vedi il difetto già corretto altrove in questo progetto per
 * GlassCard, dove un `style` unico finiva sul wrapper sbagliato).
 *
 * Con `onPress`, il blocco diventa il proprio Pressable (stesso pattern
 * di GlassCard altrove in questo progetto) e al tocco la superficie si
 * anima verso `offset` px in basso a destra, esattamente sopra alla sua
 * ombra dura - la stessa illusione di "premere il blocco nella sua
 * ombra" del bottone centrale del mockup originale (active:translate-
 * y-0.5 active:shadow-none).
 *
 * Transizione CSS di Reanimated (ricetta "Press feedback" della skill
 * animate-expo), non il modulo `Animated` core di RN: nessun gesto né
 * valore continuo qui (solo premi/rilascia), quindi non serve una
 * shared value - una `transitionProperty` dichiarativa è l'intera
 * implementazione, gira sul thread UI e non si inceppa se il thread JS
 * è occupato. `pressRetentionOffset` evita che un lieve spostamento del
 * dito annulli la pressione.
 *
 * `gradiente` sostituisce `colore` con un riempimento a sfumatura
 * (solo il box "compartimenti" lo usa) - non interattivo per
 * costruzione, quindi niente Pressable/transizione di pressione qui:
 * nessun punto di questa schermata passa `onPress` insieme a
 * `gradiente`.
 */
function BloccoDuro({
  children,
  style,
  contenutoStyle,
  colore,
  gradiente,
  offset = 3,
  raggio = 20,
  bordo = true,
  onPress,
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contenutoStyle?: StyleProp<ViewStyle>;
  colore?: string;
  gradiente?: [string, string];
  offset?: number;
  raggio?: number;
  bordo?: boolean;
  onPress?: () => void;
}) {
  const [premuto, setPremuto] = useState(false);
  const stileBordo = bordo ? { borderWidth: offset <= 2 ? 2 : 2.5, borderColor: colori.scuro } : undefined;

  return (
    <View style={[styles.involucroOmbra, style]}>
      <View
        style={[
          styles.ombraDura,
          { top: offset, left: offset, right: -offset, bottom: -offset, borderRadius: raggio },
        ]}
      />
      {gradiente !== undefined ? (
        <LinearGradient
          colors={gradiente}
          style={[{ borderRadius: raggio }, stileBordo, contenutoStyle]}
        >
          {children}
        </LinearGradient>
      ) : (
        <Animated.View
          style={[
            {
              backgroundColor: colore,
              borderRadius: raggio,
              transform: [
                { translateX: premuto ? offset : 0 },
                { translateY: premuto ? offset : 0 },
              ],
              transitionProperty: 'transform',
              transitionDuration: '100ms',
              transitionTimingFunction: EASE_OUT,
            },
            stileBordo,
          ]}
        >
          <Pressable
            onPress={onPress}
            onPressIn={() => setPremuto(true)}
            onPressOut={() => setPremuto(false)}
            disabled={onPress === undefined}
            pressRetentionOffset={16}
            style={[styles.riempimentoPressable, contenutoStyle]}
          >
            {children}
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
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
                      <Text style={styles.statoPersonale}>{liste.length} liste</Text>
                      <Text style={styles.statoPersonaleSecondario}>{note.length} note</Text>
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
              <View style={styles.contenitoreElencoNotifiche}>
                <ScrollView
                  style={styles.elencoNotificheScroll}
                  contentContainerStyle={styles.elencoNotificheContenuto}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                >
                  {notifiche.map((notifica) => {
                    const eSfida = notifica.tipo.startsWith('sfida_');
                    const coloreTipo = eSfida ? colori.oro : colori.menta;
                    return (
                      <BloccoDuro
                        key={notifica.id}
                        offset={2}
                        colore="#fff"
                        raggio={18}
                        contenutoStyle={styles.rigaNotifica}
                      >
                        <View style={[styles.iconaNotifica, { backgroundColor: coloreTipo }]}>
                          <Feather name={eSfida ? 'award' : 'calendar'} size={16} color={colori.scuro} />
                        </View>
                        <View style={styles.contenutoNotifica}>
                          <View style={styles.rigaMetaNotifica}>
                            <Text style={[styles.badgeTipo, { backgroundColor: coloreTipo }]}>
                              {eSfida ? 'Sfida' : 'Impegno'}
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
                    );
                  })}
                </ScrollView>
                {notifiche.length > 3 && (
                  <LinearGradient
                    colors={['transparent', colori.cremaCard]}
                    style={styles.sfumaturaNotifiche}
                    pointerEvents="none"
                  />
                )}
              </View>
              <Pressable onPress={() => router.push('/notifiche')} style={styles.bottoneVediTutte}>
                <Text style={styles.testoVediTutte}>VEDI TUTTE LE NOTIFICHE</Text>
                <Text style={styles.frecciaVediTutte}>→</Text>
              </Pressable>
            </BloccoDuro>
          )}
        </View>
      </ScrollView>

      <View style={[styles.barraInferiore, { paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.vociBarra}>
          <View style={styles.vocetaBarra}>
            <View style={styles.iconaHomeAttiva}>
              <Feather name="home" size={16} color={colori.scuro} />
            </View>
            <Text style={styles.etichettaBarra}>HOME</Text>
          </View>
          <View style={styles.vocetaBarra}>
            <Feather name="user" size={20} color={colori.scuro} />
            <Text style={styles.etichettaBarra}>PERSONALE</Text>
          </View>
          <View style={[styles.vocetaBarra, styles.voceCentrale]}>
            <BloccoDuro offset={2.5} colore={colori.corallo} raggio={999} contenutoStyle={styles.bottoneVoce}>
              <Feather name="mic" size={22} color="#fff" />
            </BloccoDuro>
            <Text style={styles.etichettaBarra}>VOCE</Text>
          </View>
          <View style={styles.vocetaBarra}>
            <Feather name="users" size={20} color={colori.scuro} />
            <Text style={styles.etichettaBarra}>GRUPPI</Text>
          </View>
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
  involucroOmbra: {
    position: 'relative',
  },
  ombraDura: {
    position: 'absolute',
    backgroundColor: colori.scuro,
  },
  riempimentoPressable: {
    flex: 1,
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
  contenitoreElencoNotifiche: {
    position: 'relative',
  },
  elencoNotificheScroll: {
    maxHeight: 260,
  },
  elencoNotificheContenuto: {
    gap: 10,
    paddingBottom: 4,
  },
  sfumaturaNotifiche: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 36,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
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
   * Solo grafica, nessun collegamento per ora (vedi richiesta): HOME è
   * mostrata attiva per via statica (siamo sempre su questa schermata),
   * le altre voci non hanno onPress.
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
