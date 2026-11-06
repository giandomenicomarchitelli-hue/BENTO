import { Feather } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BloccoDuro } from '@/components/BloccoDuro';
import { CifraScomparto, Scomparto } from '@/components/Scomparto';
import { PARETE, Vassoio } from '@/components/Vassoio';
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
            <BloccoDuro
              offset={2}
              colore={colori.scuro}
              raggio={9}
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

        <Text style={styles.titolo}>Personale</Text>

        {/* La fascia del vassoio dice l'unica cosa che conta qui: chi può
            vedere questa roba. Per questo il sottotitolo di prima è
            sparito - diceva la stessa cosa, due volte. */}
        <Vassoio etichetta="Solo tu puoi vederli" iconaEtichetta="lock">
          <View style={styles.mosaicoPersonale}>
            <View style={styles.rigaAlta}>
              <Scomparto
                style={styles.colonnaLarga}
                nome="Liste"
                icona="list"
                colore={colori.oro}
                azione="Apri"
                onPress={() => router.push('/personale/liste')}
              >
                {listeInCaricamento ? (
                  <ActivityIndicator color={colori.scuro} />
                ) : (
                  <CifraScomparto
                    cifra={liste.length}
                    unita={liste.length === 1 ? 'lista attiva' : 'liste attive'}
                  />
                )}
              </Scomparto>

              <Scomparto
                style={styles.colonnaStretta}
                nome="Note"
                icona="edit-3"
                colore={colori.viola}
                azione="Apri"
                onPress={() => router.push('/personale/note')}
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
            </View>

            <Scomparto
              colore={colori.panna}
              azione="Apri"
              orizzontale
              onPress={() => router.push('/personale/calendario')}
            >
              <View style={styles.rigaCalendario}>
                <View style={styles.chipCalendario}>
                  <Feather name="calendar" size={20} color={colori.scuro} />
                </View>
                <View style={styles.testiCalendario}>
                  <Text style={styles.nomeCalendario}>Calendario</Text>
                  {eventiInCaricamento ? (
                    <ActivityIndicator color={colori.scuro} style={styles.caricamentoCalendario} />
                  ) : (
                    <Text style={styles.metaCalendario} numberOfLines={1}>
                      {sommarioCalendario}
                    </Text>
                  )}
                </View>
              </View>
            </Scomparto>
          </View>
        </Vassoio>
      </ScrollView>

      <View style={[styles.barraInferiore, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
        <View style={styles.vociBarra}>
          <Pressable style={styles.voceBarra} onPress={() => router.push('/')}>
            <Feather name="home" size={21} color={colori.scuro} />
            <Text style={styles.etichettaBarra}>HOME</Text>
          </Pressable>
          <View style={styles.voceBarra}>
            <BloccoDuro
              offset={1.5}
              colore={colori.viola}
              raggio={9}
              contenutoStyle={styles.chipAttivo}
            >
              <Feather name="user" size={16} color={colori.scuro} />
            </BloccoDuro>
            <Text style={styles.etichettaBarra}>PERSONALE</Text>
          </View>
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
              <Feather name="edit-3" size={22} color="#fff" />
            </BloccoDuro>
            <Text style={styles.etichettaBarra}>SCRIVI</Text>
          </Pressable>
          <Pressable style={styles.voceBarra} onPress={() => router.push('/gruppi')}>
            <Feather name="users" size={21} color={colori.scuro} />
            <Text style={styles.etichettaBarra}>GRUPPI</Text>
          </Pressable>
          <View style={styles.voceBarra}>
            <Feather name="credit-card" size={21} color={colori.scuro} />
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
  logoVassoio: {
    width: 36,
    height: 36,
    gap: 2,
    overflow: 'hidden',
  },
  logoRiga: {
    flex: 1,
    flexDirection: 'row',
    gap: 2,
  },
  logoCella: {
    flex: 1,
  },
  marchio: {
    ...pesi.extraBold,
    fontSize: 25,
    letterSpacing: -0.5,
    color: colori.scuro,
  },
  puntoMarchio: {
    color: colori.corallo,
  },
  avatarCerchio: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTesto: {
    ...pesi.extraBold,
    fontSize: 15,
    color: colori.scuro,
  },
  titolo: {
    ...pesi.extraBold,
    fontSize: 33,
    lineHeight: 32,
    letterSpacing: -1.15,
    textTransform: 'uppercase',
    color: colori.scuro,
  },
  mosaicoPersonale: {
    gap: PARETE,
  },
  rigaAlta: {
    flexDirection: 'row',
    gap: PARETE,
  },
  colonnaLarga: {
    flex: 1.1,
  },
  colonnaStretta: {
    flex: 1,
  },
  rigaCalendario: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    flexShrink: 1,
  },
  chipCalendario: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colori.scuro,
    backgroundColor: colori.menta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testiCalendario: {
    flexShrink: 1,
  },
  nomeCalendario: {
    ...pesi.extraBold,
    fontSize: 11.5,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colori.scuro,
  },
  metaCalendario: {
    ...pesi.bold,
    fontSize: 12.5,
    color: colori.soft,
    marginTop: 5,
  },
  caricamentoCalendario: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  /**
   * PERSONALE è mostrata attiva per via statica (siamo sempre su questa
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
    paddingTop: 9,
    paddingHorizontal: 10,
  },
  vociBarra: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  voceBarra: {
    width: 60,
    alignItems: 'center',
    gap: 5,
  },
  etichettaBarra: {
    ...pesi.extraBold,
    fontSize: 9,
    letterSpacing: 0.7,
    color: colori.scuro,
  },
  chipAttivo: {
    width: 44,
    height: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voceCentrale: {
    marginTop: -18,
  },
  bottoneScrivi: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
