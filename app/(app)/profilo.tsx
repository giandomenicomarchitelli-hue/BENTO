import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useProfilo } from '@/hooks/useProfilo';
import { attivaPushNotifiche, pushGiaAttiva, statoSupportoPush } from '@/lib/pushNotifiche';
import { useAuthStore } from '@/store/authStore';

export default function Profilo() {
  const { profilo, isLoading } = useProfilo();
  const utenteId = useAuthStore((stato) => stato.session?.user.id);
  const [copiato, setCopiato] = useState(false);
  const [pushAttiva, setPushAttiva] = useState(pushGiaAttiva());
  const [pushInCorso, setPushInCorso] = useState(false);
  const [errorePush, setErrorePush] = useState<string | null>(null);
  const statoPush = statoSupportoPush();

  if (isLoading || profilo === null) {
    return (
      <View style={styles.centrato}>
        <ActivityIndicator />
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
    <View style={styles.contenitore}>
      <Text style={styles.etichetta}>Nome utente</Text>
      <Text style={styles.nomeUtente}>{profilo.nome_utente}</Text>
      <Text style={styles.suggerimento}>
        Fisso: è il nome con cui ti vedono gli altri in ogni gruppo.
      </Text>

      <Text style={[styles.etichetta, styles.etichettaCodice]}>Codice utente</Text>
      <Pressable style={styles.riquadroCodice} onPress={copiaCodice}>
        <Text style={styles.codice}>{profilo.codice_utente}</Text>
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
                  <ActivityIndicator style={styles.caricamentoPush} />
                ) : (
                  <Pressable style={styles.bottonePush} onPress={attivaPush}>
                    <Text style={styles.testoBottonePush}>Attiva notifiche</Text>
                  </Pressable>
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
    </View>
  );
}

const styles = StyleSheet.create({
  centrato: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contenitore: {
    flex: 1,
    padding: 24,
  },
  etichetta: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
  },
  etichettaCodice: {
    marginTop: 32,
  },
  nomeUtente: {
    fontSize: 24,
    fontWeight: '700',
  },
  riquadroCodice: {
    borderWidth: 1,
    borderColor: '#2d6cdf',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  codice: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 2,
    color: '#2d6cdf',
  },
  suggerimento: {
    fontSize: 13,
    color: '#888',
    marginTop: 8,
  },
  testoErrore: {
    fontSize: 13,
    color: '#c0392b',
    marginTop: 8,
  },
  bottonePush: {
    backgroundColor: '#2d6cdf',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  testoBottonePush: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  caricamentoPush: {
    marginTop: 12,
  },
});
