import { Redirect, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { esci } from '@/api/auth';
import { BentoScreen } from '@/components/BentoScreen';
import { GlassListRow } from '@/components/GlassListRow';
import { GlassTile } from '@/components/GlassTile';
import { calcolaPosizionePersonale } from '@/components/GroupBalanceCard';
import { GroupBalanceHero } from '@/components/GroupBalanceHero';
import { GroupHeader } from '@/components/GroupHeader';
import { MemberAvatarRow } from '@/components/MemberAvatarRow';
import { SectionHeader } from '@/components/SectionHeader';
import { useArticoliSpesa } from '@/hooks/useArticoliSpesa';
import { useGruppoAttivo } from '@/hooks/useGruppoAttivo';
import { useImpegni } from '@/hooks/useImpegni';
import { useListe } from '@/hooks/useListe';
import { useNotifiche } from '@/hooks/useNotifiche';
import { useSaldi } from '@/hooks/useSaldi';
import { useSfide } from '@/hooks/useSfide';
import { useAuthStore } from '@/store/authStore';
import { useGruppoAttivoStore } from '@/store/gruppoAttivoStore';
import { accenti, bento, spaziatura } from '@/theme/tokens';

export default function Dashboard() {
  const router = useRouter();
  const utenteId = useAuthStore((stato) => stato.session?.user.id);
  const gruppoAttivoId = useGruppoAttivoStore((stato) => stato.gruppoAttivoId);
  const { gruppo, membriAttivi, isLoading } = useGruppoAttivo();
  const { liste, isLoading: listeInCaricamento } = useListe(gruppoAttivoId);
  const {
    articoli,
    isLoading: articoliInCaricamento,
    error: erroreArticoli,
  } = useArticoliSpesa(gruppoAttivoId);
  const { transazioni, isLoading: saldiInCaricamento, error: erroreSaldi } =
    useSaldi(gruppoAttivoId);
  const { sfide, isLoading: sfideInCaricamento } = useSfide(gruppoAttivoId);
  const { impegni, occorrenze, isLoading: impegniInCaricamento } = useImpegni(gruppoAttivoId);
  const { nonLette: notificheNonLette } = useNotifiche();

  // Posizione netta dell'utente in QUESTO gruppo - vedi
  // calcolaPosizionePersonale in GroupBalanceCard.tsx (testata a parte in
  // GroupBalanceCard.test.ts) per cosa fa e perché non è un nuovo calcolo
  // finanziario. Nessun cambiamento qui rispetto alla Fase 2.1: solo il
  // componente che la mostra (GroupBalanceHero) è nuovo.
  const ilMioMembro = membriAttivi.find((m) => m.utente_id === utenteId);
  const mioNettoCentesimi = useMemo(() => {
    if (ilMioMembro === undefined) {
      return null;
    }
    return calcolaPosizionePersonale(transazioni, ilMioMembro.id);
  }, [transazioni, ilMioMembro]);

  const impegniPerId = useMemo(() => new Map(impegni.map((i) => [i.id, i])), [impegni]);
  // impegniPerId.has(...): cancellaImpegno è un soft delete, quindi
  // un'occorrenza del suo impegno può restare nel DB anche dopo che
  // l'impegno non è più attivo - va ignorata, non mostrata come "prossimo impegno".
  const prossimaOccorrenza = useMemo(
    () => occorrenze.find((o) => impegniPerId.has(o.impegno_id) && new Date(o.data_ora) > new Date()),
    [occorrenze, impegniPerId]
  );

  // Si arriva qui solo scegliendo un gruppo dall'elenco gruppi; senza un
  // gruppo attivo selezionato (es. link diretto, o store appena resettato)
  // si torna all'elenco gruppi.
  if (gruppoAttivoId === null) {
    return <Redirect href="/gruppi" />;
  }

  if (isLoading || gruppo === null) {
    return (
      <View style={styles.centrato}>
        <ActivityIndicator color={bento.testoPrimario} />
      </View>
    );
  }

  const listeInHome = liste.filter((l) => l.mostra_in_home);

  const pendenti = articoli.filter((a) => a.stato === 'da_comprare').length;
  const erroreArticoliBool = erroreArticoli !== null && erroreArticoli !== undefined;
  // "Tutto comprato" ha senso solo se la lista non è vuota - altrimenti si
  // lascerebbe intendere che c'era qualcosa da comprare quando in realtà
  // non è mai stato aggiunto nulla.
  const sottotitoloSpesa = articoliInCaricamento || erroreArticoliBool
    ? undefined
    : articoli.length === 0
      ? 'Lista vuota'
      : pendenti === 0
        ? 'Tutto comprato'
        : `${pendenti} ${pendenti === 1 ? 'articolo da comprare' : 'articoli da comprare'}`;

  const sottotitoloGruppo = `${membriAttivi.length} ${membriAttivi.length === 1 ? 'membro' : 'membri'}`;

  const sottotitoloListe = listeInCaricamento
    ? undefined
    : liste.length === 0
      ? 'Nessuna lista'
      : `${liste.length} ${liste.length === 1 ? 'lista' : 'liste'}`;

  const sfideAttive = sfide.filter((s) => s.sfida.stato === 'in_corso').length;
  const sottotitoloSfide = sfideInCaricamento
    ? undefined
    : sfideAttive === 0
      ? 'Nessuna sfida attiva'
      : `${sfideAttive} ${sfideAttive === 1 ? 'attiva' : 'attive'}`;

  const sottotitoloCalendario = impegniInCaricamento
    ? undefined
    : prossimaOccorrenza === undefined
      ? 'Nessun impegno in programma'
      : impegniPerId.get(prossimaOccorrenza.impegno_id)?.titolo ?? 'Impegno';

  function tornaIndietro() {
    if (router.canGoBack()) {
      router.back();
    } else {
      // Nessuna cronologia di navigazione (es. link diretto a /dashboard,
      // ricaricamento della pagina su web): si torna comunque in un posto
      // sicuro invece di restare bloccati o uscire dall'app.
      router.replace('/gruppi');
    }
  }

  function apriImpostazioni() {
    router.push('/gruppo');
  }

  return (
    <BentoScreen senzaIntestazione>
      <GroupHeader
        gruppo={gruppo}
        onIndietro={tornaIndietro}
        onImpostazioni={apriImpostazioni}
        onEsci={() => esci()}
        onNotifiche={() => router.push('/notifiche')}
        notificheNonLette={notificheNonLette}
      />

      {membriAttivi.length > 0 && (
        <MemberAvatarRow membri={membriAttivi} onPress={apriImpostazioni} />
      )}

      <GroupBalanceHero
        nettoCentesimi={mioNettoCentesimi}
        caricando={saldiInCaricamento}
        errore={erroreSaldi !== null && erroreSaldi !== undefined}
        onPress={() => router.push('/saldi')}
      />

      <View style={styles.griglia}>
        <View style={styles.rigaGriglia}>
          <GlassTile
            icona="shopping-cart"
            accento={accenti.ciano}
            titolo="Lista spesa"
            sottotitolo={sottotitoloSpesa}
            onPress={() => router.push('/lista-spesa')}
          />
          <GlassTile
            icona="users"
            accento={accenti.viola}
            titolo="Gruppo"
            sottotitolo={sottotitoloGruppo}
            onPress={apriImpostazioni}
          />
        </View>
        <View style={styles.rigaGriglia}>
          <GlassTile
            icona="check-square"
            accento={accenti.menta}
            titolo="Faccende"
            sottotitolo="Punti e classifica"
            onPress={() => router.push('/faccende')}
          />
          <GlassTile
            icona="list"
            accento={accenti.oro}
            titolo="Liste"
            sottotitolo={sottotitoloListe}
            onPress={() => router.push('/liste')}
          />
        </View>
        <View style={styles.rigaGriglia}>
          <GlassTile
            icona="award"
            accento={accenti.rosa}
            titolo="Sfide"
            sottotitolo={sottotitoloSfide}
            onPress={() => router.push('/sfide')}
          />
          <GlassTile
            icona="calendar"
            accento={accenti.indaco}
            titolo="Calendario"
            sottotitolo={sottotitoloCalendario}
            onPress={() => router.push('/calendario')}
          />
        </View>
        <View style={styles.rigaGriglia}>
          <GlassTile
            icona="edit-3"
            accento={accenti.ciano}
            titolo="Scrivi"
            onPress={() => router.push('/assistente')}
          />
        </View>
      </View>

      {listeInHome.length > 0 && (
        <View style={styles.sezione}>
          <SectionHeader titolo="In evidenza" />
          <View style={styles.elencoListe}>
            {listeInHome.map((lista) => (
              <GlassListRow
                key={lista.id}
                icona="file-text"
                accento={accenti.oro}
                titolo={lista.nome}
                onPress={() =>
                  router.push({
                    pathname: '/liste/[id]',
                    params: { id: lista.id, nome: lista.nome, conPrezzi: lista.con_prezzi ? '1' : '0' },
                  })
                }
              />
            ))}
          </View>
        </View>
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
  griglia: {
    gap: spaziatura.md,
  },
  rigaGriglia: {
    flexDirection: 'row',
    gap: spaziatura.md,
  },
  sezione: {
    gap: spaziatura.md,
  },
  elencoListe: {
    gap: spaziatura.sm,
  },
});
