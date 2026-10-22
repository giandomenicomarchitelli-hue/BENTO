import { Feather } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { SfidaConStato } from '@/api/sfide';
import { BentoButton } from '@/components/BentoButton';
import { BentoScreen } from '@/components/BentoScreen';
import { GlassCard } from '@/components/GlassCard';
import { SectionHeader } from '@/components/SectionHeader';
import { useListe } from '@/hooks/useListe';
import { useSfide } from '@/hooks/useSfide';
import { useGruppoAttivoStore } from '@/store/gruppoAttivoStore';
import { bento, spaziatura } from '@/theme/tokens';

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
            <Feather name="x" size={22} color={bento.testoPrimario} />
          </Pressable>
        </View>
        {isLoading ? (
          <ActivityIndicator color={bento.testoPrimario} style={{ marginTop: spaziatura.xl }} />
        ) : liste.length === 0 ? (
          <Text style={styles.vuotoModal}>
            Nessuna lista disponibile. Crea prima una lista con almeno 3 voci.
          </Text>
        ) : (
          <FlatList
            data={liste}
            keyExtractor={(l) => l.id}
            contentContainerStyle={styles.modalLista}
            renderItem={({ item }) => (
              <GlassCard
                onPress={() => {
                  onChiudi();
                  router.push({ pathname: '/sfide/nuova', params: { listaId: item.id } });
                }}
                elevazione="bassa"
              >
                <View style={styles.rigaLista}>
                  <Text style={styles.nomeLista}>{item.nome}</Text>
                  <Feather name="chevron-right" size={16} color={bento.testoMuto} />
                </View>
              </GlassCard>
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
  const { sfide, isLoading, sincronizzaScadenze } = useSfide(gruppoAttivoId);
  const [mostraSceltaLista, setMostraSceltaLista] = useState(false);

  useEffect(() => {
    sincronizzaScadenze.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gruppoAttivoId]);

  if (isLoading) {
    return (
      <View style={styles.centrato}>
        <ActivityIndicator color={bento.testoPrimario} />
      </View>
    );
  }

  return (
    <BentoScreen>
      <ModalSceltaLista
        visibile={mostraSceltaLista}
        onChiudi={() => setMostraSceltaLista(false)}
        gruppoId={gruppoAttivoId}
      />

      {sfide.length === 0 ? (
        <View style={styles.vuotoContenitore}>
          <Text style={styles.vuoto}>Nessuna sfida ancora.</Text>
          <BentoButton
            etichetta="Inizia nuova sfida"
            variante="vetro"
            onPress={() => setMostraSceltaLista(true)}
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.contenuto}>
          <BentoButton
            etichetta="Inizia nuova sfida"
            variante="vetro"
            onPress={() => setMostraSceltaLista(true)}
          />
          {SEZIONI.map(({ chiave, titolo }) => {
            const sfideSezione = sfide.filter((s) => sezioneDi(s) === chiave);
            if (sfideSezione.length === 0) {
              return null;
            }
            return (
              <View key={chiave} style={styles.sezione}>
                <SectionHeader titolo={titolo} />
                {sfideSezione.map(({ sfida }) => (
                  <Pressable
                    key={sfida.id}
                    onPress={() => router.push({ pathname: '/sfide/[id]', params: { id: sfida.id } })}
                  >
                    <GlassCard elevazione="bassa">
                      <Text style={styles.titoloSfida}>{sfida.titolo}</Text>
                    </GlassCard>
                  </Pressable>
                ))}
              </View>
            );
          })}
        </ScrollView>
      )}
    </BentoScreen>
  );
}

const styles = StyleSheet.create({
  centrato: {
    flex: 1,
    backgroundColor: bento.sfondo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contenuto: {
    gap: spaziatura.lg,
    paddingBottom: spaziatura.xxl,
  },
  vuotoContenitore: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spaziatura.lg,
    paddingHorizontal: spaziatura.xl,
  },
  sezione: {
    gap: spaziatura.sm,
  },
  titoloSfida: {
    fontSize: 15,
    fontWeight: '600',
    color: bento.testoPrimario,
  },
  vuoto: {
    fontSize: 14,
    color: bento.testoSecondario,
    textAlign: 'center',
  },
  // Modal
  modalContenitore: {
    flex: 1,
    backgroundColor: bento.sfondo,
    paddingTop: spaziatura.lg,
  },
  modalIntestazione: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spaziatura.lg,
    paddingBottom: spaziatura.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: bento.bordoForte,
  },
  modalTitolo: {
    fontSize: 17,
    fontWeight: '700',
    color: bento.testoPrimario,
  },
  modalLista: {
    padding: spaziatura.lg,
    gap: spaziatura.sm,
  },
  rigaLista: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spaziatura.sm,
  },
  nomeLista: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: bento.testoPrimario,
  },
  vuotoModal: {
    fontSize: 14,
    color: bento.testoSecondario,
    textAlign: 'center',
    margin: spaziatura.xl,
  },
});
