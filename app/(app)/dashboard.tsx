import { Redirect, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { esci } from '@/api/auth';
import { BentoScreen } from '@/components/BentoScreen';
import { GlassListRow } from '@/components/GlassListRow';
import { GroupBalanceCard } from '@/components/GroupBalanceCard';
import { GroupHeader } from '@/components/GroupHeader';
import { MemberAvatarRow } from '@/components/MemberAvatarRow';
import { QuickActionRow, type QuickAction } from '@/components/QuickActionRow';
import { SectionHeader } from '@/components/SectionHeader';
import { ShoppingListPreviewCard } from '@/components/ShoppingListPreviewCard';
import { useArticoliSpesa } from '@/hooks/useArticoliSpesa';
import { useGruppoAttivo } from '@/hooks/useGruppoAttivo';
import { useListe } from '@/hooks/useListe';
import { useSaldi } from '@/hooks/useSaldi';
import { useAuthStore } from '@/store/authStore';
import { useGruppoAttivoStore } from '@/store/gruppoAttivoStore';
import { accenti, bento, spaziatura } from '@/theme/tokens';

export default function Dashboard() {
  const router = useRouter();
  const utenteId = useAuthStore((stato) => stato.session?.user.id);
  const gruppoAttivoId = useGruppoAttivoStore((stato) => stato.gruppoAttivoId);
  const { gruppo, membriAttivi, isLoading } = useGruppoAttivo();
  const { liste } = useListe(gruppoAttivoId);
  const {
    articoli,
    isLoading: articoliInCaricamento,
    error: erroreArticoli,
  } = useArticoliSpesa(gruppoAttivoId);
  const { transazioni, isLoading: saldiInCaricamento, error: erroreSaldi } =
    useSaldi(gruppoAttivoId);

  // Posizione netta dell'utente in QUESTO gruppo: somma delle transazioni
  // già semplificate da useSaldi (calcolaSaldi) dove è coinvolto - nessun
  // nuovo calcolo finanziario, solo un'addizione sui valori che il motore
  // di saldi ha già prodotto, stessa direzione/segno usati in /saldi.
  const ilMioMembro = membriAttivi.find((m) => m.utente_id === utenteId);
  const mioNettoCentesimi = useMemo(() => {
    if (ilMioMembro === undefined) {
      return null;
    }
    return transazioni.reduce((totale, t) => {
      if (t.a === ilMioMembro.id) {
        return totale + t.importoCentesimi;
      }
      if (t.da === ilMioMembro.id) {
        return totale - t.importoCentesimi;
      }
      return totale;
    }, 0);
  }, [transazioni, ilMioMembro]);

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

  const azioniRapide: QuickAction[] = [
    {
      icona: 'shopping-cart',
      accento: accenti.ciano,
      etichetta: 'Lista spesa',
      onPress: () => router.push('/lista-spesa'),
    },
    {
      icona: 'plus-circle',
      accento: accenti.indaco,
      etichetta: 'Nuova spesa',
      onPress: () => router.push('/spese/nuova'),
    },
    {
      icona: 'list',
      accento: accenti.viola,
      etichetta: 'Liste',
      onPress: () => router.push('/liste'),
    },
  ];

  return (
    <BentoScreen senzaIntestazione>
      <GroupHeader
        gruppo={gruppo}
        onIndietro={tornaIndietro}
        onImpostazioni={apriImpostazioni}
        onEsci={() => esci()}
      />

      {membriAttivi.length > 0 && (
        <MemberAvatarRow membri={membriAttivi} onPress={apriImpostazioni} />
      )}

      <GroupBalanceCard
        nettoCentesimi={mioNettoCentesimi}
        caricando={saldiInCaricamento}
        errore={erroreSaldi !== null && erroreSaldi !== undefined}
        onPress={() => router.push('/saldi')}
      />

      <QuickActionRow azioni={azioniRapide} />

      <ShoppingListPreviewCard
        articoli={articoli}
        caricando={articoliInCaricamento}
        errore={erroreArticoli !== null && erroreArticoli !== undefined}
        onPress={() => router.push('/lista-spesa')}
      />

      <View style={styles.sezione}>
        <SectionHeader titolo="Le tue liste" />
        <View style={styles.elencoListe}>
          <GlassListRow
            icona="list"
            accento={accenti.viola}
            titolo="Tutte le liste"
            onPress={() => router.push('/liste')}
          />
          {listeInHome.map((lista) => (
            <GlassListRow
              key={lista.id}
              icona="file-text"
              accento={accenti.ciano}
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
  sezione: {
    gap: spaziatura.md,
  },
  elencoListe: {
    gap: spaziatura.sm,
  },
});
