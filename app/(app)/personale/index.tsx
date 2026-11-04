import { Feather } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BloccoDuro } from '@/components/BloccoDuro';
import { useEventiPersonali } from '@/hooks/useEventiPersonali';
import { useFontBento } from '@/hooks/useFontBento';
import { useListePersonali } from '@/hooks/useListePersonali';
import { useNotePersonali } from '@/hooks/useNotePersonali';
import { useProfilo } from '@/hooks/useProfilo';
import { useAuthStore } from '@/store/authStore';
import { coloriNB as colori, pesiNB as pesi } from '@/theme/neoBrutalista';

/** Altezza del solo contenuto della barra inferiore (vedi Home, stessa costante). */
const ALTEZZA_BARRA = 64;

function dataLocaleISO(data: Date): string {
  const fusoOrario = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return new Intl.DateTimeFormat('en-CA', { timeZone: fusoOrario }).format(data);
}

export default function PersonaleHome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [fontPronti] = useFontBento();
  const { profilo, isLoading: profiloInCaricamento } = useProfilo();
  const utenteId = useAuthStore((stato) => stato.session?.user.id) ?? null;
  const { liste, isLoading: listeInCaricamento } = useListePersonali(utenteId);
  const { note, isLoading: noteInCaricamento } = useNotePersonali(utenteId);
  const { eventi, isLoading: eventiInCaricamento } = useEventiPersonali(utenteId);

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
  const oggiISO = dataLocaleISO(new Date());
  const eventiOggi = eventi.filter((evento) => evento.data === oggiISO);
  const sommarioCalendario =
    eventiOggi.length === 0 ? 'Nessun impegno oggi' : eventiOggi.map((e) => e.titolo).join(' • ');

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
          <BloccoDuro offset={2} colore="#fff" raggio={999} contenutoStyle={styles.avatarCerchio}>
            <Text style={styles.avatarTesto}>{inizialeNome}</Text>
          </BloccoDuro>
        </View>

        <View style={styles.rigaTitolo}>
          <Text style={styles.titolo}>PERSONALE</Text>
          <BloccoDuro offset={1.5} colore={colori.scuro} raggio={999} bordo={false} contenutoStyle={styles.badgePrivato}>
            <Text style={styles.testoBadgePrivato}>PRIVATO</Text>
          </BloccoDuro>
        </View>
        <Text style={styles.sottotitolo}>I tuoi scomparti riservati e appunti quotidiani 🔒</Text>

        <BloccoDuro
          offset={4}
          gradiente={['#C83528', '#BD3125']}
          raggio={28}
          contenutoStyle={styles.boxCompartimenti}
        >
          <View style={styles.rigaCard}>
            <BloccoDuro
              style={styles.cardWrapper}
              onPress={() => router.push('/personale/liste')}
              offset={3}
              colore="#fff"
              raggio={20}
              contenutoStyle={styles.card}
            >
              <View>
                <View style={styles.intestazioneCard}>
                  <Text style={styles.etichettaCard}>LISTE</Text>
                  <View style={[styles.pallino, { backgroundColor: colori.oro }]} />
                </View>
                {listeInCaricamento ? (
                  <ActivityIndicator color={colori.scuro} style={styles.caricamentoCard} />
                ) : (
                  <View style={styles.corpoCardCentrato}>
                    <Text style={styles.numeroCard}>{liste.length}</Text>
                    <Text style={[styles.etichettaCardSecondaria, { color: colori.oro }]}>
                      LISTE ATTIVE
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.pieCard}>
                <Text style={styles.linkCard}>Apri</Text>
                <Text style={styles.frecciaCard}>→</Text>
              </View>
            </BloccoDuro>

            <BloccoDuro
              style={styles.cardWrapper}
              onPress={() => router.push('/personale/note')}
              offset={3}
              colore={colori.viola}
              raggio={20}
              contenutoStyle={styles.card}
            >
              <View>
                <View style={styles.intestazioneCard}>
                  <Text style={styles.etichettaCard}>NOTE</Text>
                  <View style={[styles.pallino, { backgroundColor: '#7C3AED' }]} />
                </View>
                {noteInCaricamento ? (
                  <ActivityIndicator color={colori.scuro} style={styles.caricamentoCard} />
                ) : (
                  <View style={styles.corpoCardCentrato}>
                    <Text style={styles.numeroCard}>{note.length}</Text>
                    <Text style={[styles.etichettaCardSecondaria, { color: '#7C3AED' }]}>
                      NOTE SALVATE
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.pieCard}>
                <Text style={styles.linkCard}>Apri</Text>
                <Text style={styles.frecciaCard}>→</Text>
              </View>
            </BloccoDuro>
          </View>

          <BloccoDuro
            onPress={() => router.push('/personale/calendario')}
            offset={3}
            colore={colori.menta}
            raggio={20}
            contenutoStyle={styles.cardCalendario}
          >
            <View style={styles.rigaCalendarioSinistra}>
              <View style={styles.iconaCalendario}>
                <Feather name="calendar" size={20} color={colori.scuro} />
              </View>
              <View style={styles.testiCalendario}>
                <View style={styles.rigaTitoloCalendario}>
                  <Text style={styles.etichettaCard}>CALENDARIO</Text>
                  {eventiOggi.length > 0 && (
                    <View style={styles.badgeOggi}>
                      <Text style={styles.testoBadgeOggi}>OGGI</Text>
                    </View>
                  )}
                </View>
                {eventiInCaricamento ? (
                  <ActivityIndicator color={colori.scuro} style={styles.caricamentoCalendario} />
                ) : (
                  <Text style={styles.statoCalendario} numberOfLines={1}>
                    {sommarioCalendario}
                  </Text>
                )}
              </View>
            </View>
            <View style={styles.pieCardCalendario}>
              <Text style={styles.linkCard}>Apri</Text>
              <Text style={styles.frecciaCard}>→</Text>
            </View>
          </BloccoDuro>
        </BloccoDuro>
      </ScrollView>

      <View style={[styles.barraInferiore, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
        <View style={styles.vociBarra}>
          <View style={styles.vocetaBarra}>
            <Feather name="home" size={20} color={colori.scuro} />
            <Text style={styles.etichettaBarra}>HOME</Text>
          </View>
          <View style={styles.vocetaBarra}>
            <View style={styles.iconaPersonaleAttiva}>
              <Feather name="user" size={16} color={colori.scuro} />
            </View>
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
  rigaTitolo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titolo: {
    ...pesi.extraBold,
    fontSize: 28,
    letterSpacing: -0.5,
    color: colori.scuro,
    textTransform: 'uppercase',
  },
  badgePrivato: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  testoBadgePrivato: {
    ...pesi.extraBold,
    fontSize: 10,
    color: colori.oro,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  sottotitolo: {
    ...pesi.bold,
    fontSize: 13,
    color: colori.grigioTesto,
    marginTop: -8,
  },
  boxCompartimenti: {
    padding: 12,
    paddingTop: 20,
    gap: 12,
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
  pallino: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colori.scuro,
  },
  etichettaCard: {
    ...pesi.extraBold,
    fontSize: 11,
    color: colori.scuro,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  caricamentoCard: {
    marginTop: 20,
  },
  corpoCardCentrato: {
    marginTop: 14,
    alignItems: 'center',
  },
  numeroCard: {
    ...pesi.extraBold,
    fontSize: 32,
    color: colori.scuro,
    lineHeight: 34,
  },
  etichettaCardSecondaria: {
    ...pesi.extraBold,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 2,
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
    textTransform: 'uppercase',
  },
  frecciaCard: {
    ...pesi.bold,
    fontSize: 12,
    color: colori.scuro,
  },
  cardCalendario: {
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rigaCalendarioSinistra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  iconaCalendario: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colori.scuro,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  testiCalendario: {
    flex: 1,
    minWidth: 0,
  },
  rigaTitoloCalendario: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeOggi: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colori.scuro,
    backgroundColor: '#fff',
  },
  testoBadgeOggi: {
    ...pesi.extraBold,
    fontSize: 9,
    color: colori.scuro,
  },
  statoCalendario: {
    ...pesi.bold,
    fontSize: 12,
    color: colori.scuro,
    opacity: 0.75,
    marginTop: 2,
  },
  caricamentoCalendario: {
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  pieCardCalendario: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
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
  iconaPersonaleAttiva: {
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
