import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Notifica } from '@/api/notifiche';
import { BloccoDuro } from '@/components/BloccoDuro';
import { useNotifiche } from '@/hooks/useNotifiche';
import { useGruppoAttivoStore } from '@/store/gruppoAttivoStore';
import { coloreCiclico, coloriNB as colori, pesiNB as pesi } from '@/theme/neoBrutalista';

/** Notifiche di TUTTI i gruppi dell'utente, non serve più un gruppo attivo. */
export default function Notifiche() {
  const insets = useSafeAreaInsets();
  const { notifiche, isLoading, segnaLetta } = useNotifiche();
  const impostaGruppoAttivo = useGruppoAttivoStore((stato) => stato.impostaGruppoAttivo);

  function apriNotifica(notifica: Notifica) {
    if (notifica.letta_il === null) {
      segnaLetta.mutate(notifica.id);
    }
    if (notifica.sfida_id !== null) {
      // La notifica può riguardare un gruppo diverso da quello attualmente
      // aperto: senza impostarlo come attivo, la pagina della sfida (che
      // legge il gruppo dallo store, non dalla notifica) opererebbe sul
      // gruppo sbagliato.
      impostaGruppoAttivo(notifica.gruppo_id);
      router.push({ pathname: '/sfide/[id]', params: { id: notifica.sfida_id } });
    } else if (notifica.impegno_id !== null) {
      // Stesso ragionamento del ramo sfida_id: il calendario legge il
      // gruppo attivo dallo store, non dalla notifica.
      impostaGruppoAttivo(notifica.gruppo_id);
      router.push('/calendario');
    }
  }

  function tornaIndietro() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
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
          <Text style={styles.titolo}>Notifiche</Text>
        </View>

        {isLoading ? (
          <View style={styles.centrato}>
            <ActivityIndicator color={colori.scuro} />
          </View>
        ) : notifiche.length === 0 ? (
          <Text style={styles.vuoto}>Nessuna notifica ancora.</Text>
        ) : (
          <BloccoDuro offset={4} colore={colori.scuro} raggio={16} contenutoStyle={styles.feed}>
            <View style={styles.righeFeed}>
              {notifiche.map((notifica) => (
                <Pressable
                  key={notifica.id}
                  style={styles.rigaFeed}
                  onPress={() => apriNotifica(notifica)}
                >
                  <View
                    style={[
                      styles.barraFeed,
                      {
                        backgroundColor:
                          notifica.letta_il === null ? colori.oro : coloreCiclico(notifica.id),
                      },
                    ]}
                  />
                  <View style={styles.testoFeed}>
                    <Text style={styles.titoloFeed} numberOfLines={1}>
                      {notifica.titolo}
                    </Text>
                    <Text style={styles.corpoFeed} numberOfLines={2}>
                      {notifica.corpo}
                    </Text>
                    <View style={styles.rigaMeta}>
                      {notifica.gruppi !== null && (
                        <Text style={styles.metaFeed}>{notifica.gruppi.nome}</Text>
                      )}
                      <Text style={styles.metaFeed}>
                        {format(new Date(notifica.creata_il), "d MMM 'alle' HH:mm", { locale: it })}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          </BloccoDuro>
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
    marginTop: 40,
    alignItems: 'center',
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
  vuoto: {
    ...pesi.bold,
    fontSize: 14.5,
    color: colori.soft,
    textAlign: 'center',
    marginTop: 40,
  },
  feed: {
    borderRadius: 16 - 2.5,
    overflow: 'hidden',
    backgroundColor: colori.scuro,
  },
  righeFeed: {
    gap: 2,
    backgroundColor: colori.scuro,
  },
  rigaFeed: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: colori.panna,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  barraFeed: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
    marginTop: 1,
  },
  testoFeed: {
    flex: 1,
    minWidth: 0,
  },
  titoloFeed: {
    ...pesi.extraBold,
    fontSize: 14,
    color: colori.scuro,
  },
  corpoFeed: {
    ...pesi.semiBold,
    fontSize: 12.5,
    color: colori.soft,
    marginTop: 2,
  },
  rigaMeta: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  metaFeed: {
    ...pesi.extraBold,
    fontSize: 10.5,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: colori.soft,
  },
});
