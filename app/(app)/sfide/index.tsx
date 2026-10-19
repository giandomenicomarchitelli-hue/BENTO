import { Redirect, router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { SfidaConStato } from '@/api/sfide';
import { BentoScreen } from '@/components/BentoScreen';
import { GlassCard } from '@/components/GlassCard';
import { SectionHeader } from '@/components/SectionHeader';
import { useSfide } from '@/hooks/useSfide';
import { useGruppoAttivoStore } from '@/store/gruppoAttivoStore';
import { bento, spaziatura } from '@/theme/tokens';

type Sezione = 'in_attesa' | 'spareggi' | 'attive' | 'concluse';

/**
 * Una sfida va in esattamente una sezione, in quest'ordine di priorità:
 * uno stato terminale della sfida vince sempre su tutto il resto; poi un
 * turno di spareggio in corso ha una sezione propria indipendentemente
 * dal mio voto (urgente/distinto per natura); solo a quel punto conta se
 * sono io ad essere in attesa di votare o se aspetto gli altri.
 */
function sezioneDi({ sfida, turnoCorrente, hoGiaVotatoNelTurnoCorrente }: SfidaConStato): Sezione {
  if (sfida.stato !== 'in_corso') {
    return 'concluse';
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
  { chiave: 'in_attesa', titolo: 'In attesa del mio voto' },
  { chiave: 'spareggi', titolo: 'Spareggi' },
  { chiave: 'attive', titolo: 'Attive' },
  { chiave: 'concluse', titolo: 'Concluse' },
];

export default function Sfide() {
  const gruppoAttivoId = useGruppoAttivoStore((stato) => stato.gruppoAttivoId);

  if (gruppoAttivoId === null) {
    return <Redirect href="/gruppi" />;
  }

  return <SfideDelGruppo gruppoAttivoId={gruppoAttivoId} />;
}

function SfideDelGruppo({ gruppoAttivoId }: { gruppoAttivoId: string }) {
  const { sfide, isLoading, sincronizzaScadenze } = useSfide(gruppoAttivoId);

  // Nessun timer: una sola sincronizzazione quando la pagina si apre
  // (stesso principio di faccende/index.tsx) - senza questa chiamata,
  // scadi_turni_sfida non veniva mai eseguita da nessuna pagina e
  // nessun turno scadeva mai (scoperto in revisione finale).
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

  if (sfide.length === 0) {
    return (
      <BentoScreen>
        <Text style={styles.vuoto}>
          Nessuna sfida ancora. Apri una lista con almeno 3 voci e tocca &quot;Inizia sfida&quot;.
        </Text>
      </BentoScreen>
    );
  }

  return (
    <BentoScreen>
      <ScrollView contentContainerStyle={styles.contenuto}>
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
    marginTop: spaziatura.xxl,
  },
});
