import { Feather } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Gruppo } from '@/api/gruppi';
import { esci } from '@/api/auth';
import { BentoButton } from '@/components/BentoButton';
import { BentoScreen } from '@/components/BentoScreen';
import { GlassCard } from '@/components/GlassCard';
import { GroupPreviewCard } from '@/components/GroupPreviewCard';
import { HeroBalanceCard } from '@/components/HeroBalanceCard';
import { IconBadge } from '@/components/IconBadge';
import { Badge } from '@/components/Badge';
import { QuickActionRow, type QuickAction } from '@/components/QuickActionRow';
import { SectionHeader } from '@/components/SectionHeader';
import { useMieiGruppi } from '@/hooks/useMieiGruppi';
import { useNotifiche } from '@/hooks/useNotifiche';
import { useProfilo } from '@/hooks/useProfilo';
import { useGruppoAttivoStore } from '@/store/gruppoAttivoStore';
import { accenti, bento, spaziatura, tipografia } from '@/theme/tokens';

const ANTEPRIMA_MASSIMA = 3;

export default function Homepage() {
  const router = useRouter();
  const { profilo, isLoading: profiloInCaricamento } = useProfilo();
  const { gruppi, isLoading: gruppiInCaricamento, error: erroreGruppi } = useMieiGruppi();
  const impostaGruppoAttivo = useGruppoAttivoStore((stato) => stato.impostaGruppoAttivo);
  // Notifiche sono per-gruppo: qui si mostra il conteggio del gruppo
  // attualmente aperto in questa sessione (se c'è già stato), stesso dato
  // già usato da ogni altra pagina per-gruppo (dashboard, liste, ecc.) -
  // nessun nuovo stato, nessuna query aggregata su più gruppi.
  const gruppoAttivoId = useGruppoAttivoStore((stato) => stato.gruppoAttivoId);
  const { nonLette } = useNotifiche(gruppoAttivoId);

  // Serve un nome utente fisso prima di poter fare qualunque cosa.
  if (profiloInCaricamento) {
    return (
      <View style={styles.centrato}>
        <ActivityIndicator color={bento.testoPrimario} />
      </View>
    );
  }
  if (profilo === null) {
    return <Redirect href="/crea-profilo" />;
  }

  function apriGruppo(gruppo: Gruppo) {
    impostaGruppoAttivo(gruppo.id);
    router.push('/dashboard');
  }

  // Tre scorciatoie, non quattro: "i tuoi gruppi" è già la destinazione
  // della card hero e della sezione gruppi qui sotto, ripeterla qui
  // sarebbe un'azione di navigazione duplicata.
  const azioniRapide: QuickAction[] = [
    {
      icona: 'plus-circle',
      accento: accenti.menta,
      etichetta: 'Crea gruppo',
      onPress: () => router.push('/onboarding/crea-gruppo'),
    },
    {
      icona: 'user-plus',
      accento: accenti.ciano,
      etichetta: 'Unisciti',
      onPress: () => router.push('/onboarding/unisciti-a-gruppo'),
    },
    {
      icona: 'repeat',
      accento: accenti.oro,
      etichetta: 'I miei saldi',
      onPress: () => router.push('/saldi-personali'),
    },
  ];

  return (
    <BentoScreen senzaIntestazione>
      <View style={styles.intestazione}>
        <View>
          <Text style={styles.marchio}>bento</Text>
          <Text style={styles.payoff}>Everything, together.</Text>
        </View>
        <View style={styles.azioniIntestazione}>
          <Pressable onPress={() => router.push('/notifiche')} hitSlop={8} style={styles.bottoneCampanella}>
            <Feather name="bell" size={18} color={bento.testoMuto} />
            {nonLette > 0 && (
              <View style={styles.badgeCampanella}>
                <Badge testo={String(nonLette)} tono="rosso" />
              </View>
            )}
          </Pressable>
          <Pressable onPress={() => router.push('/profilo')} hitSlop={8}>
            <IconBadge icona="user" colore={accenti.indaco} dimensione={40} />
          </Pressable>
          <Pressable onPress={() => esci()} hitSlop={8} style={styles.bottoneEsci}>
            <Feather name="log-out" size={16} color={bento.testoMuto} />
          </Pressable>
        </View>
      </View>

      <View>
        <Text style={styles.saluto}>Ciao, {profilo.nome_utente}</Text>
        <Text style={styles.sottoSaluto}>Ecco una panoramica dei tuoi gruppi.</Text>
      </View>

      {erroreGruppi ? (
        <GlassCard>
          <View style={styles.rigaErrore}>
            <Feather name="alert-circle" size={18} color={bento.testoSecondario} />
            <Text style={styles.testoErrore}>Non riesco a caricare i tuoi gruppi al momento.</Text>
          </View>
        </GlassCard>
      ) : (
        <HeroBalanceCard
          etichetta="I tuoi spazi condivisi"
          valore={gruppi.length}
          caricandoValore={gruppiInCaricamento}
          descrizione={
            gruppi.length === 0
              ? 'Non fai ancora parte di nessun gruppo'
              : gruppi.length === 1
                ? gruppi[0].nome
                : 'Casa, viaggi, ufficio e altro'
          }
          azioni={[{ etichetta: 'I tuoi gruppi', onPress: () => router.push('/gruppi') }]}
        />
      )}

      <QuickActionRow azioni={azioniRapide} />

      <View style={styles.sezione}>
        {/* Senza "Vedi tutti": la card hero sopra porta già a /gruppi, un
            secondo link alla stessa destinazione qui sarebbe ridondante. */}
        <SectionHeader titolo="I tuoi gruppi" />

        {gruppi.length === 0 ? (
          <GlassCard>
            <View style={styles.vuoto}>
              <IconBadge icona="users" colore={accenti.indaco} dimensione={44} />
              <Text style={styles.testoVuoto}>Non fai ancora parte di nessun gruppo.</Text>
              <BentoButton
                etichetta="Crea un gruppo"
                onPress={() => router.push('/onboarding/crea-gruppo')}
              />
            </View>
          </GlassCard>
        ) : (
          <View style={styles.listaGruppi}>
            {gruppi.slice(0, ANTEPRIMA_MASSIMA).map((gruppo) => (
              <GroupPreviewCard key={gruppo.id} gruppo={gruppo} onPress={() => apriGruppo(gruppo)} />
            ))}
          </View>
        )}
      </View>
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
  intestazione: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  marchio: {
    fontSize: 20,
    fontWeight: '800',
    color: bento.testoPrimario,
  },
  payoff: {
    fontSize: 12,
    color: bento.testoMuto,
    marginTop: 1,
  },
  azioniIntestazione: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spaziatura.sm,
  },
  bottoneEsci: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottoneCampanella: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeCampanella: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  saluto: {
    ...tipografia.display,
    fontSize: 28,
    color: bento.testoPrimario,
  },
  sottoSaluto: {
    fontSize: 14,
    color: bento.testoSecondario,
    marginTop: 2,
  },
  rigaErrore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spaziatura.sm,
  },
  testoErrore: {
    flex: 1,
    color: bento.testoSecondario,
    fontSize: 14,
  },
  sezione: {
    gap: spaziatura.md,
  },
  vuoto: {
    alignItems: 'center',
    gap: spaziatura.md,
    paddingVertical: spaziatura.md,
  },
  testoVuoto: {
    fontSize: 14,
    color: bento.testoSecondario,
    textAlign: 'center',
  },
  listaGruppi: {
    gap: spaziatura.sm,
  },
});
