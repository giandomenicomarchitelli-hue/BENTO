import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { router } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Notifica } from '@/api/notifiche';
import { BentoScreen } from '@/components/BentoScreen';
import { GlassCard } from '@/components/GlassCard';
import { useNotifiche } from '@/hooks/useNotifiche';
import { useGruppoAttivoStore } from '@/store/gruppoAttivoStore';
import { accenti, bento, spaziatura } from '@/theme/tokens';

/** Notifiche di TUTTI i gruppi dell'utente, non serve più un gruppo attivo. */
export default function Notifiche() {
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

  if (isLoading) {
    return (
      <View style={styles.centrato}>
        <ActivityIndicator color={bento.testoPrimario} />
      </View>
    );
  }

  return (
    <BentoScreen>
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
              <View style={styles.rigaMeta}>
                {notifica.gruppi !== null && <Text style={styles.gruppoNotifica}>{notifica.gruppi.nome}</Text>}
                <Text style={styles.dataNotifica}>
                  {format(new Date(notifica.creata_il), "d MMMM yyyy 'alle' HH:mm", { locale: it })}
                </Text>
              </View>
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
  rigaMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spaziatura.xs,
    marginTop: 4,
  },
  gruppoNotifica: {
    fontSize: 11,
    fontWeight: '600',
    color: bento.testoMuto,
  },
  dataNotifica: {
    fontSize: 11,
    color: bento.testoMuto,
  },
  vuoto: {
    fontSize: 14,
    color: bento.testoSecondario,
    textAlign: 'center',
    marginTop: spaziatura.xxl,
  },
});
