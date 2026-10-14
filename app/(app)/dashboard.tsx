import { Redirect, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { esci } from '@/api/auth';
import { ActionTile } from '@/components/ActionTile';
import { ListGroup } from '@/components/ListGroup';
import { ListRow } from '@/components/ListRow';
import { useGruppoAttivo } from '@/hooks/useGruppoAttivo';
import { useArticoliSpesa } from '@/hooks/useArticoliSpesa';
import { useListe } from '@/hooks/useListe';
import { colori } from '@/theme/tokens';
import { useAuthStore } from '@/store/authStore';
import { useGruppoAttivoStore } from '@/store/gruppoAttivoStore';

export default function Dashboard() {
  const router = useRouter();
  const email = useAuthStore((stato) => stato.session?.user.email);
  const gruppoAttivoId = useGruppoAttivoStore((stato) => stato.gruppoAttivoId);
  const { gruppo, isLoading } = useGruppoAttivo();
  const { liste } = useListe(gruppoAttivoId);
  const { articoli } = useArticoliSpesa(gruppoAttivoId);
  const listeInHome = liste.filter((l) => l.mostra_in_home);
  const daComprare = articoli.filter((a) => a.stato === 'da_comprare').length;

  // Si arriva qui solo scegliendo un gruppo dall'elenco gruppi; senza un
  // gruppo attivo selezionato (es. link diretto, o store appena resettato)
  // si torna all'elenco gruppi.
  if (gruppoAttivoId === null) {
    return <Redirect href="/gruppi" />;
  }

  if (isLoading || gruppo === null) {
    return (
      <View style={styles.centrato}>
        <ActivityIndicator />
      </View>
    );
  }

  const inizialeAvatar = email !== undefined ? email.charAt(0).toUpperCase() : '?';

  return (
    <View style={styles.contenitore}>
      <View style={styles.intestazione}>
        <View>
          <Text style={styles.etichettaGruppo}>Gruppo</Text>
          <Text style={styles.nomeGruppo}>{gruppo.nome}</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarTesto}>{inizialeAvatar}</Text>
        </View>
      </View>

      <View style={styles.azioniPrimarie}>
        <ActionTile
          icona="shopping-cart"
          titolo="Lista della spesa"
          sottotitolo={daComprare === 1 ? '1 articolo da comprare' : `${daComprare} articoli da comprare`}
          variante="primaria"
          onPress={() => router.push('/lista-spesa')}
        />
        <ActionTile
          icona="repeat"
          titolo="Saldi e spese"
          sottotitolo="Chi deve cosa a chi"
          onPress={() => router.push('/saldi')}
        />
      </View>

      <View style={styles.sezione}>
        <Text style={styles.titoloSezione}>Le tue liste</Text>
        <ListGroup>
          <ListRow icona="list" titolo="Tutte le liste" onPress={() => router.push('/liste')} />
          {listeInHome.map((lista) => (
            <ListRow
              key={lista.id}
              icona="file-text"
              titolo={lista.nome}
              onPress={() =>
                router.push({
                  pathname: '/liste/[id]',
                  params: { id: lista.id, nome: lista.nome, conPrezzi: lista.con_prezzi ? '1' : '0' },
                })
              }
            />
          ))}
        </ListGroup>
      </View>

      <View style={styles.sezione}>
        <Text style={styles.titoloSezione}>Gruppo</Text>
        <ListGroup>
          <ListRow icona="users" titolo="Il tuo gruppo" onPress={() => router.push('/gruppo')} />
        </ListGroup>
      </View>

      <View style={styles.spaziatore} />

      <View style={styles.piePagina}>
        {email !== undefined && (
          <Text style={styles.email} numberOfLines={1}>
            {email}
          </Text>
        )}
        <Pressable style={styles.bottoneEsci} onPress={() => esci()}>
          <Feather name="log-out" size={15} color={colori.rosso600} />
          <Text style={styles.testoEsci}>Esci</Text>
        </Pressable>
      </View>
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
    backgroundColor: colori.sfondoApp,
    padding: 20,
    paddingTop: 24,
    gap: 28,
  },
  intestazione: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  etichettaGruppo: {
    fontSize: 13,
    fontWeight: '600',
    color: colori.inchiostro500,
  },
  nomeGruppo: {
    marginTop: 4,
    fontSize: 26,
    fontWeight: '700',
    color: colori.inchiostro900,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colori.blu100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTesto: {
    fontSize: 15,
    fontWeight: '700',
    color: colori.blu700,
  },
  azioniPrimarie: {
    flexDirection: 'row',
    gap: 12,
  },
  sezione: {
    gap: 10,
  },
  titoloSezione: {
    fontSize: 13,
    fontWeight: '600',
    color: colori.inchiostro500,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  spaziatore: {
    flex: 1,
  },
  piePagina: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colori.inchiostro150,
  },
  email: {
    flex: 1,
    fontSize: 12.5,
    color: colori.inchiostro500,
    marginRight: 12,
  },
  bottoneEsci: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  testoEsci: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colori.rosso600,
  },
});
