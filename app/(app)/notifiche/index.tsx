import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Notifica } from '@/api/notifiche';
import { BentoButton } from '@/components/BentoButton';
import { BentoScreen } from '@/components/BentoScreen';
import { GlassCard } from '@/components/GlassCard';
import { useGruppoAttivo } from '@/hooks/useGruppoAttivo';
import { useNotifiche } from '@/hooks/useNotifiche';
import { attivaPushNotifiche, pushGiaAttiva, pushSupportata } from '@/lib/pushNotifiche';
import { useAuthStore } from '@/store/authStore';
import { useGruppoAttivoStore } from '@/store/gruppoAttivoStore';
import { accenti, bento, semantica, spaziatura } from '@/theme/tokens';

export default function Notifiche() {
  const gruppoAttivoId = useGruppoAttivoStore((stato) => stato.gruppoAttivoId);

  if (gruppoAttivoId === null) {
    return <Redirect href="/gruppi" />;
  }

  return <NotificheDelGruppo gruppoAttivoId={gruppoAttivoId} />;
}

function NotificheDelGruppo({ gruppoAttivoId }: { gruppoAttivoId: string }) {
  const { notifiche, isLoading, segnaLetta } = useNotifiche(gruppoAttivoId);
  const { membriAttivi } = useGruppoAttivo();
  const utenteId = useAuthStore((stato) => stato.session?.user.id);
  const ilMioMembroId = membriAttivi.find((m) => m.utente_id === utenteId)?.id ?? null;

  const [pushAttiva, setPushAttiva] = useState(pushGiaAttiva());
  const [pushInCorso, setPushInCorso] = useState(false);
  const [erroreePush, setErrorePush] = useState<string | null>(null);

  async function attivaPush() {
    if (ilMioMembroId === null) {
      return;
    }
    setErrorePush(null);
    setPushInCorso(true);
    try {
      await attivaPushNotifiche(ilMioMembroId);
      setPushAttiva(true);
    } catch (errore) {
      setErrorePush(errore instanceof Error ? errore.message : 'Qualcosa è andato storto.');
    } finally {
      setPushInCorso(false);
    }
  }

  function apriNotifica(notifica: Notifica) {
    if (notifica.letta_il === null) {
      segnaLetta.mutate(notifica.id);
    }
    if (notifica.sfida_id !== null) {
      router.push({ pathname: '/sfide/[id]', params: { id: notifica.sfida_id } });
    }
  }

  if (isLoading) {
    return (
      <View style={styles.centrato}>
        <ActivityIndicator color={bento.testoPrimario} />
      </View>
    );
  }

  return (
    <BentoScreen>
      {pushSupportata() && !pushAttiva && (
        <GlassCard style={styles.cardPush}>
          <Text style={styles.titoloPush}>Attiva le notifiche</Text>
          <Text style={styles.testoPush}>
            Ricevi un avviso sul telefono/computer quando c&apos;è una nuova sfida o un invito, anche ad app chiusa.
          </Text>
          {erroreePush !== null && <Text style={styles.testoErrorePush}>{erroreePush}</Text>}
          <BentoButton etichetta="Attiva notifiche" onPress={attivaPush} caricando={pushInCorso} />
        </GlassCard>
      )}

      {notifiche.length === 0 ? (
        <Text style={styles.vuoto}>Nessuna notifica ancora.</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.contenuto}>
          {notifiche.map((notifica) => (
            <GlassCard
              key={notifica.id}
              onPress={() => apriNotifica(notifica)}
              elevazione="bassa"
              style={notifica.letta_il === null ? styles.nonLetta : undefined}
            >
              <View style={styles.rigaTitolo}>
                {notifica.letta_il === null && <View style={styles.pallinoNonLetta} />}
                <Text style={styles.titoloNotifica}>{notifica.titolo}</Text>
              </View>
              <Text style={styles.corpoNotifica}>{notifica.corpo}</Text>
              <Text style={styles.dataNotifica}>
                {format(new Date(notifica.creata_il), "d MMMM yyyy 'alle' HH:mm", { locale: it })}
              </Text>
            </GlassCard>
          ))}
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
    gap: spaziatura.sm,
    paddingBottom: spaziatura.xxl,
  },
  nonLetta: {
    borderColor: bento.bordoForte,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardPush: {
    gap: spaziatura.xs,
    marginBottom: spaziatura.sm,
  },
  titoloPush: {
    fontSize: 15,
    fontWeight: '600',
    color: bento.testoPrimario,
  },
  testoPush: {
    fontSize: 13,
    color: bento.testoSecondario,
    marginBottom: spaziatura.xs,
  },
  testoErrorePush: {
    fontSize: 13,
    color: semantica.pericolo,
  },
  rigaTitolo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spaziatura.xs,
  },
  pallinoNonLetta: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: accenti.rosa,
  },
  titoloNotifica: {
    fontSize: 15,
    fontWeight: '600',
    color: bento.testoPrimario,
  },
  corpoNotifica: {
    fontSize: 13,
    color: bento.testoSecondario,
    marginTop: 2,
  },
  dataNotifica: {
    fontSize: 11,
    color: bento.testoMuto,
    marginTop: 4,
  },
  vuoto: {
    fontSize: 14,
    color: bento.testoSecondario,
    textAlign: 'center',
    marginTop: spaziatura.xxl,
  },
});
