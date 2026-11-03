import { Feather } from '@expo/vector-icons';
import { formatDistanceToNowStrict } from 'date-fns';
import { it } from 'date-fns/locale';
import { Redirect, useRouter } from 'expo-router';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { esci } from '@/api/auth';
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
  crema: '#FAF6EF',
  cremaCard: '#F3EFE6',
  scuro: '#1A1817',
  corallo: '#EE5D50',
  oro: '#FDCB4E',
  menta: '#72C4B8',
  grigioTesto: '#716C65',
};

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
 */
function BloccoDuro({
  children,
  style,
  contenutoStyle,
  colore,
  offset = 3,
  raggio = 20,
  bordo = true,
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contenutoStyle?: StyleProp<ViewStyle>;
  colore: string;
  offset?: number;
  raggio?: number;
  bordo?: boolean;
}) {
  return (
    <View style={[styles.involucroOmbra, style]}>
      <View
        style={[
          styles.ombraDura,
          { top: offset, left: offset, right: -offset, bottom: -offset, borderRadius: raggio },
        ]}
      />
      <View
        style={[
          { backgroundColor: colore, borderRadius: raggio },
          bordo && { borderWidth: offset <= 2 ? 2 : 2.5, borderColor: colori.scuro },
          contenutoStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

export default function Homepage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profilo, isLoading: profiloInCaricamento } = useProfilo();
  const utenteId = useAuthStore((stato) => stato.session?.user.id) ?? null;
  const { gruppi, isLoading: gruppiInCaricamento } = useMieiGruppi();
  const { liste, isLoading: listeInCaricamento } = useListePersonali(utenteId);
  const { note, isLoading: noteInCaricamento } = useNotePersonali(utenteId);
  const { notifiche, nonLette, isLoading: notificheInCaricamento } = useNotifiche();

  // Serve un nome utente fisso prima di poter fare qualunque cosa.
  if (profiloInCaricamento) {
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
  const notificheRecenti = notifiche.slice(0, 3);

  return (
    <View style={styles.schermo}>
      <ScrollView
        contentContainerStyle={[
          styles.contenuto,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
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
              <BloccoDuro
                offset={2}
                colore={colori.crema}
                raggio={999}
                contenutoStyle={styles.avatarCerchio}
              >
                <Text style={styles.avatarTesto}>{inizialeNome}</Text>
              </BloccoDuro>
            </Pressable>
          </View>
        </View>

        <Text style={styles.saluto}>CIAO, {profilo.nome_utente.toUpperCase()}!</Text>

        <View style={styles.sezioneCompartimenti}>
          <View style={styles.rigaBadge}>
            <BloccoDuro offset={2} colore={colori.corallo} raggio={999} contenutoStyle={styles.badgePill}>
              <Text style={styles.testoBadgePill}>BENTO COMPARTMENTS</Text>
            </BloccoDuro>
          </View>
          <BloccoDuro
            offset={4}
            colore={colori.cremaCard}
            raggio={28}
            contenutoStyle={styles.boxCompartimenti}
          >
            <View style={styles.rigaCard}>
              <Pressable style={styles.cardWrapper} onPress={() => router.push('/personale')}>
                <BloccoDuro offset={3} colore="#fff" raggio={20} contenutoStyle={styles.card}>
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
              </Pressable>

              <Pressable style={styles.cardWrapper} onPress={() => router.push('/gruppi')}>
                <BloccoDuro offset={3} colore="#fff" raggio={20} contenutoStyle={styles.card}>
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
              </Pressable>
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
          ) : notificheRecenti.length === 0 ? (
            <Text style={styles.nessunaNotifica}>Nessuna notifica ancora.</Text>
          ) : (
            <BloccoDuro offset={4} colore={colori.cremaCard} raggio={24} contenutoStyle={styles.boxNotifiche}>
              {notificheRecenti.map((notifica) => {
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
  centrato: {
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 26,
    fontWeight: '900',
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
    fontSize: 15,
    fontWeight: '900',
    color: colori.scuro,
  },
  saluto: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.2,
    color: colori.scuro,
    textTransform: 'uppercase',
  },
  sezioneCompartimenti: {
    paddingTop: 10,
  },
  rigaBadge: {
    alignItems: 'center',
    marginBottom: -13,
    zIndex: 1,
  },
  badgePill: {
    paddingHorizontal: 16,
    paddingVertical: 5,
  },
  testoBadgePill: {
    fontSize: 10,
    fontWeight: '900',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
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
    fontSize: 11,
    fontWeight: '900',
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
    fontSize: 16,
    fontWeight: '900',
    color: colori.scuro,
  },
  statoPersonaleSecondario: {
    fontSize: 13,
    fontWeight: '700',
    color: colori.grigioTesto,
    marginTop: 2,
  },
  numeroGruppi: {
    fontSize: 32,
    fontWeight: '900',
    color: colori.scuro,
    lineHeight: 34,
  },
  etichettaGruppiAttivi: {
    fontSize: 9,
    fontWeight: '900',
    color: colori.corallo,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 2,
  },
  nomeGruppo: {
    fontSize: 10,
    fontWeight: '700',
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
    fontSize: 11,
    fontWeight: '800',
    color: colori.scuro,
  },
  frecciaCard: {
    fontSize: 12,
    fontWeight: '700',
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
    fontSize: 14,
    fontWeight: '900',
    color: colori.scuro,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  badgeNonLette: {
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  testoBadgeNonLette: {
    fontSize: 9,
    fontWeight: '900',
    color: '#fff',
  },
  linkTutte: {
    fontSize: 11,
    fontWeight: '900',
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
    fontSize: 9,
    fontWeight: '900',
    color: colori.scuro,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colori.scuro,
    textTransform: 'uppercase',
  },
  tempoNotifica: {
    fontSize: 10,
    fontWeight: '700',
    color: colori.grigioTesto,
  },
  testoNotifica: {
    fontSize: 13,
    fontWeight: '800',
    color: colori.scuro,
    marginTop: 3,
  },
});
