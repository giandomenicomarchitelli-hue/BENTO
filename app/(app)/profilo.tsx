import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BloccoDuro } from '@/components/BloccoDuro';
import { useProfilo } from '@/hooks/useProfilo';
import { attivaPushNotifiche, pushGiaAttiva, statoSupportoPush } from '@/lib/pushNotifiche';
import { useAuthStore } from '@/store/authStore';
import { coloriNB as colori, pesiNB as pesi } from '@/theme/neoBrutalista';

export default function Profilo() {
  const { profilo, isLoading } = useProfilo();
  const utenteId = useAuthStore((stato) => stato.session?.user.id);
  const insets = useSafeAreaInsets();
  const [copiato, setCopiato] = useState(false);
  const [pushAttiva, setPushAttiva] = useState(pushGiaAttiva());
  const [pushInCorso, setPushInCorso] = useState(false);
  const [errorePush, setErrorePush] = useState<string | null>(null);
  const statoPush = statoSupportoPush();

  function tornaIndietro() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }

  if (isLoading || profilo === null) {
    return (
      <View style={[styles.schermo, styles.centrato]}>
        <ActivityIndicator color={colori.scuro} />
      </View>
    );
  }

  const copiaCodice = async () => {
    await Clipboard.setStringAsync(profilo.codice_utente);
    setCopiato(true);
    setTimeout(() => setCopiato(false), 2000);
  };

  const attivaPush = async () => {
    if (utenteId === undefined) {
      return;
    }
    setErrorePush(null);
    setPushInCorso(true);
    try {
      await attivaPushNotifiche(utenteId);
      setPushAttiva(true);
    } catch (errore) {
      setErrorePush(errore instanceof Error ? errore.message : 'Qualcosa è andato storto.');
    } finally {
      setPushInCorso(false);
    }
  };

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
          <Text style={styles.titolo}>Il mio profilo</Text>
        </View>

        <Text style={styles.etichetta}>Nome utente</Text>
        <Text style={styles.nomeUtente}>{profilo.nome_utente}</Text>
        <Text style={styles.suggerimento}>
          Fisso: è il nome con cui ti vedono gli altri in ogni gruppo.
        </Text>

        <Text style={[styles.etichetta, styles.etichettaCodice]}>Codice utente</Text>
        <Pressable onPress={copiaCodice}>
          <BloccoDuro offset={3} colore={colori.scuro} raggio={14} contenutoStyle={styles.riquadroCodice}>
            <Text style={styles.codice}>{profilo.codice_utente}</Text>
          </BloccoDuro>
        </Pressable>
        <Text style={styles.suggerimento}>
          {copiato ? 'Copiato!' : 'Tocca il codice per copiarlo'}
        </Text>

        {Platform.OS === 'web' && (
          <>
            <Text style={[styles.etichetta, styles.etichettaCodice]}>Notifiche</Text>

            {statoPush === 'supportata' &&
              (pushAttiva ? (
                <Text style={styles.suggerimento}>Notifiche push attive su questo dispositivo.</Text>
              ) : (
                <>
                  <Text style={styles.suggerimento}>
                    Ricevi un avviso quando c&apos;è una nuova sfida o un invito in uno dei tuoi gruppi, anche ad
                    app chiusa. Da ogni gruppo puoi poi silenziarle singolarmente.
                  </Text>
                  {errorePush !== null && <Text style={styles.testoErrore}>{errorePush}</Text>}
                  {pushInCorso ? (
                    <ActivityIndicator color={colori.scuro} style={styles.caricamentoPush} />
                  ) : (
                    <BloccoDuro
                      offset={2.5}
                      colore={colori.menta}
                      raggio={12}
                      contenutoStyle={styles.bottonePieno}
                      onPress={attivaPush}
                    >
                      <Text style={styles.testoBottonePieno}>Attiva notifiche</Text>
                    </BloccoDuro>
                  )}
                </>
              ))}

            {statoPush === 'ios_va_aggiunto_a_home' && (
              <Text style={styles.suggerimento}>
                Su iPhone le notifiche funzionano solo se aggiungi Bento alla schermata Home: in Safari tocca
                l&apos;icona Condividi, poi &quot;Aggiungi a Home&quot;. Riapri Bento da quell&apos;icona e torna
                qui per attivarle.
              </Text>
            )}

            {statoPush === 'non_supportata' && (
              <Text style={styles.suggerimento}>Le notifiche push non sono supportate su questo browser.</Text>
            )}
          </>
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
  centrato: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  contenuto: {
    paddingHorizontal: 16,
  },
  rigaTitolo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginBottom: 18,
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
  etichetta: {
    ...pesi.extraBold,
    fontSize: 12.5,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: colori.soft,
    marginBottom: 8,
  },
  etichettaCodice: {
    marginTop: 28,
  },
  nomeUtente: {
    ...pesi.extraBold,
    fontSize: 24,
    letterSpacing: -0.4,
    color: colori.scuro,
  },
  riquadroCodice: {
    paddingVertical: 18,
    alignItems: 'center',
    backgroundColor: colori.panna,
  },
  codice: {
    ...pesi.extraBold,
    fontSize: 24,
    letterSpacing: 2,
    color: colori.scuro,
  },
  suggerimento: {
    ...pesi.bold,
    fontSize: 12.5,
    color: colori.soft,
    marginTop: 8,
  },
  testoErrore: {
    ...pesi.bold,
    fontSize: 12.5,
    color: colori.corallo,
    marginTop: 8,
  },
  bottonePieno: {
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  testoBottonePieno: {
    ...pesi.extraBold,
    fontSize: 12,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: colori.scuro,
  },
  caricamentoPush: {
    marginTop: 12,
  },
});
