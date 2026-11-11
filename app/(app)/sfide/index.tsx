import { Feather } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { SfidaConStato } from '@/api/sfide';
import { BloccoDuro } from '@/components/BloccoDuro';
import { useListe } from '@/hooks/useListe';
import { useSfide } from '@/hooks/useSfide';
import { useGruppoAttivoStore } from '@/store/gruppoAttivoStore';
import { coloriNB as colori, pesiNB as pesi } from '@/theme/neoBrutalista';

type Sezione = 'da_accettare' | 'in_attesa' | 'spareggi' | 'attive' | 'concluse';

/**
 * Una sfida va in esattamente una sezione, in quest'ordine di priorità:
 * uno stato terminale della sfida vince sempre su tutto il resto; poi un
 * invito non ancora accettato/rifiutato è la sezione più urgente (niente
 * da votare finché non si risponde); poi un turno di spareggio in corso
 * ha una sezione propria indipendentemente dal mio voto (urgente/distinto
 * per natura); solo a quel punto conta se sono io ad essere in attesa di
 * votare o se aspetto gli altri.
 */
function sezioneDi({ sfida, turnoCorrente, hoGiaVotatoNelTurnoCorrente, mioStatoPartecipazione }: SfidaConStato): Sezione {
  if (sfida.stato !== 'in_corso') {
    return 'concluse';
  }
  if (mioStatoPartecipazione === 'in_attesa') {
    return 'da_accettare';
  }
  if (turnoCorrente?.tipo_turno === 'spareggio') {
    return 'spareggi';
  }
  if (!hoGiaVotatoNelTurnoCorrente) {
    return 'in_attesa';
  }
  return 'attive';
}

const SEZIONI: { chiave: Sezione; titolo: string }[] = [
  { chiave: 'da_accettare', titolo: 'Inviti da accettare' },
  { chiave: 'in_attesa', titolo: 'In attesa del mio voto' },
  { chiave: 'spareggi', titolo: 'Spareggi' },
  { chiave: 'attive', titolo: 'Attive' },
  { chiave: 'concluse', titolo: 'Concluse' },
];

function ModalSceltaLista({
  visibile,
  onChiudi,
  gruppoId,
}: {
  visibile: boolean;
  onChiudi: () => void;
  gruppoId: string;
}) {
  const { liste, isLoading } = useListe(gruppoId);

  return (
    <Modal visible={visibile} animationType="slide" presentationStyle="pageSheet" onRequestClose={onChiudi}>
      <View style={styles.modalContenitore}>
        <View style={styles.modalIntestazione}>
          <Text style={styles.modalTitolo}>Scegli una lista</Text>
          <Pressable onPress={onChiudi} hitSlop={12}>
            <Feather name="x" size={22} color={colori.scuro} />
          </Pressable>
        </View>
        {isLoading ? (
          <ActivityIndicator color={colori.scuro} style={styles.caricamentoModal} />
        ) : liste.length === 0 ? (
          <Text style={styles.vuotoModal}>Nessuna lista disponibile. Crea prima una lista con almeno 3 voci.</Text>
        ) : (
          <FlatList
            data={liste}
            keyExtractor={(l) => l.id}
            contentContainerStyle={styles.modalLista}
            renderItem={({ item }) => (
              <Pressable
                style={styles.rigaLista}
                onPress={() => {
                  onChiudi();
                  router.push({ pathname: '/sfide/nuova', params: { listaId: item.id } });
                }}
              >
                <Text style={styles.nomeLista}>{item.nome}</Text>
                <Feather name="chevron-right" size={16} color={colori.soft} />
              </Pressable>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

export default function Sfide() {
  const gruppoAttivoId = useGruppoAttivoStore((stato) => stato.gruppoAttivoId);

  if (gruppoAttivoId === null) {
    return <Redirect href="/gruppi" />;
  }

  return <SfideDelGruppo gruppoAttivoId={gruppoAttivoId} />;
}

function SfideDelGruppo({ gruppoAttivoId }: { gruppoAttivoId: string }) {
  const insets = useSafeAreaInsets();
  const { sfide, isLoading, sincronizzaScadenze } = useSfide(gruppoAttivoId);
  const [mostraSceltaLista, setMostraSceltaLista] = useState(false);

  useEffect(() => {
    sincronizzaScadenze.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gruppoAttivoId]);

  function tornaIndietro() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/gruppi');
    }
  }

  return (
    <View style={styles.schermo}>
      <ModalSceltaLista visibile={mostraSceltaLista} onChiudi={() => setMostraSceltaLista(false)} gruppoId={gruppoAttivoId} />

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
          <Text style={styles.titolo}>Sfide</Text>
        </View>

        <BloccoDuro
          offset={2.5}
          colore={colori.corallo}
          raggio={12}
          contenutoStyle={styles.bottonePieno}
          onPress={() => setMostraSceltaLista(true)}
        >
          <Feather name="plus" size={14} color="#fff" />
          <Text style={styles.testoBottonePieno}>Inizia nuova sfida</Text>
        </BloccoDuro>

        {isLoading ? (
          <ActivityIndicator color={colori.scuro} style={styles.caricamento} />
        ) : sfide.length === 0 ? (
          <Text style={styles.vuoto}>Nessuna sfida ancora.</Text>
        ) : (
          SEZIONI.map(({ chiave, titolo }) => {
            const sfideSezione = sfide.filter((s) => sezioneDi(s) === chiave);
            if (sfideSezione.length === 0) {
              return null;
            }
            return (
              <View key={chiave} style={styles.sezione}>
                <Text style={styles.etichettaSezione}>{titolo}</Text>
                {sfideSezione.map(({ sfida, turnoCorrente }) => {
                  const spareggio = chiave === 'spareggi' && turnoCorrente?.tipo_turno === 'spareggio';
                  return (
                    <Pressable
                      key={sfida.id}
                      style={[styles.rigaSfida, sfida.stato !== 'in_corso' && styles.rigaConclusa]}
                      onPress={() => router.push({ pathname: '/sfide/[id]', params: { id: sfida.id } })}
                    >
                      <Text style={styles.titoloSfida} numberOfLines={1}>{sfida.titolo}</Text>
                      {spareggio ? (
                        <View style={styles.pillSpareggio}>
                          <Text style={styles.testoPillSpareggio}>Spareggio</Text>
                        </View>
                      ) : (
                        <Feather name="chevron-right" size={14} color={colori.soft} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            );
          })
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
  contenuto: {
    paddingHorizontal: 16,
    gap: 16,
  },
  rigaTitolo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
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
  bottonePieno: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 12,
  },
  testoBottonePieno: {
    ...pesi.extraBold,
    fontSize: 11.5,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#fff',
  },
  caricamento: {
    marginTop: 20,
  },
  vuoto: {
    ...pesi.bold,
    fontSize: 13,
    color: colori.soft,
    textAlign: 'center',
    marginTop: 20,
  },
  sezione: {
    gap: 5,
  },
  etichettaSezione: {
    ...pesi.extraBold,
    fontSize: 9.5,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colori.soft,
    paddingLeft: 2,
  },
  rigaSfida: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: colori.panna,
    borderWidth: 2,
    borderColor: colori.scuro,
    borderRadius: 11,
    paddingVertical: 10,
    paddingHorizontal: 11,
  },
  rigaConclusa: {
    opacity: 0.6,
  },
  titoloSfida: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '700',
    color: colori.scuro,
  },
  pillSpareggio: {
    borderWidth: 1.5,
    borderColor: colori.scuro,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
    backgroundColor: colori.oro,
  },
  testoPillSpareggio: {
    ...pesi.extraBold,
    fontSize: 8,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: colori.scuro,
  },
  // Modal
  modalContenitore: {
    flex: 1,
    backgroundColor: colori.crema,
    paddingTop: 16,
  },
  modalIntestazione: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: colori.scuro,
  },
  modalTitolo: {
    ...pesi.extraBold,
    fontSize: 16,
    color: colori.scuro,
  },
  caricamentoModal: {
    marginTop: 24,
  },
  modalLista: {
    padding: 16,
    gap: 8,
  },
  rigaLista: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colori.panna,
    borderWidth: 2,
    borderColor: colori.scuro,
    borderRadius: 11,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  nomeLista: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colori.scuro,
  },
  vuotoModal: {
    ...pesi.bold,
    fontSize: 13,
    color: colori.soft,
    textAlign: 'center',
    margin: 24,
  },
});
