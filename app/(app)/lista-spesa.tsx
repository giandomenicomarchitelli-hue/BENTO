import { Redirect, router } from 'expo-router';
import { ActivityIndicator, SectionList, StyleSheet, Text, View } from 'react-native';

import type { ArticoloSpesa } from '@/api/articoliSpesa';
import { BentoScreen } from '@/components/BentoScreen';
import { IconBadge } from '@/components/IconBadge';
import { SectionHeader } from '@/components/SectionHeader';
import { ShoppingListAddForm } from '@/components/ShoppingListAddForm';
import { ShoppingListHeader } from '@/components/ShoppingListHeader';
import { ShoppingListRow } from '@/components/ShoppingListRow';
import { useArticoliSpesa } from '@/hooks/useArticoliSpesa';
import { useGruppoAttivo } from '@/hooks/useGruppoAttivo';
import { useAuthStore } from '@/store/authStore';
import { useGruppoAttivoStore } from '@/store/gruppoAttivoStore';
import { accenti, bento, semantica, spaziatura, tipografia } from '@/theme/tokens';

export default function ListaSpesa() {
  const gruppoAttivoId = useGruppoAttivoStore((stato) => stato.gruppoAttivoId);

  if (gruppoAttivoId === null) {
    return <Redirect href="/gruppi" />;
  }

  return <ListaSpesaDelGruppo gruppoAttivoId={gruppoAttivoId} />;
}

function ListaSpesaDelGruppo({ gruppoAttivoId }: { gruppoAttivoId: string }) {
  const { gruppo, membri } = useGruppoAttivo();
  const utenteId = useAuthStore((stato) => stato.session?.user.id);
  const { articoli, isLoading, error, aggiungi, elimina } = useArticoliSpesa(gruppoAttivoId);

  const ilMioMembroId = membri.find((m) => m.utente_id === utenteId)?.id ?? null;

  function aggiungiArticoloAllaLista(nome: string, nota: string | null) {
    if (ilMioMembroId === null) {
      return;
    }
    aggiungi.mutate({ nome, creatoDaMembroId: ilMioMembroId, note: nota });
  }

  function tornaIndietro() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/gruppi');
    }
  }

  function apriRegistraSpesa(articolo: ArticoloSpesa) {
    // Segnare comprato NON avviene qui: si apre solo il form di
    // registrazione spesa esistente, che decide lui (con un'azione
    // esplicita dell'utente) se creare una spesa e segnare comprato, o
    // segnare comprato senza spesa. Vedi spese/nuova.tsx.
    router.push({
      pathname: '/spese/nuova',
      params: {
        articoloId: articolo.id,
        nomeArticolo: articolo.nome,
        notaEsistente: articolo.note ?? undefined,
      },
    });
  }

  const daComprare = articoli.filter((a) => a.stato === 'da_comprare');
  const comprati = articoli.filter((a) => a.stato === 'comprato');

  const sezioni = [
    ...(daComprare.length > 0 ? [{ titolo: 'Da comprare', dati: daComprare }] : []),
    ...(comprati.length > 0 ? [{ titolo: 'Comprati', dati: comprati }] : []),
  ];

  return (
    <BentoScreen senzaIntestazione scroll={false}>
      <View style={styles.sezioneFissa}>
        <ShoppingListHeader
          nomeGruppo={gruppo?.nome ?? null}
          totale={articoli.length}
          comprati={comprati.length}
          onIndietro={tornaIndietro}
        />
        <ShoppingListAddForm onAggiungi={aggiungiArticoloAllaLista} />
      </View>

      {isLoading ? (
        <View style={styles.statoContenitore}>
          <ActivityIndicator color={bento.testoPrimario} />
        </View>
      ) : error !== null && error !== undefined ? (
        <View style={styles.statoContenitore}>
          <IconBadge icona="alert-circle" colore={semantica.pericolo} dimensione={48} />
          <Text style={styles.statoTesto}>Non riesco a caricare la lista al momento.</Text>
        </View>
      ) : articoli.length === 0 ? (
        <View style={styles.statoContenitore}>
          <IconBadge icona="shopping-cart" colore={accenti.ciano} dimensione={48} />
          <Text style={styles.statoTitolo}>Lista della spesa vuota</Text>
          <Text style={styles.statoTesto}>
            Aggiungi il primo articolo dal campo qui sopra.
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sezioni.map((s) => ({ title: s.titolo, data: s.dati }))}
          keyExtractor={(articolo) => articolo.id}
          style={styles.elenco}
          contentContainerStyle={styles.contenutoElenco}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <View style={styles.intestazioneSezione}>
              <SectionHeader titolo={section.title} />
            </View>
          )}
          renderItem={({ item }) => (
            <View style={styles.rigaContenitore}>
              <ShoppingListRow
                articolo={item}
                nomeCompratore={membri.find((m) => m.id === item.comprato_da)?.nome ?? null}
                onTocca={() => apriRegistraSpesa(item)}
                onApriModifica={() =>
                  router.push({ pathname: '/articoli/[id]', params: { id: item.id } })
                }
                onElimina={() => elimina.mutate(item.id)}
              />
            </View>
          )}
        />
      )}
    </BentoScreen>
  );
}

const styles = StyleSheet.create({
  sezioneFissa: {
    paddingHorizontal: spaziatura.xl,
    gap: spaziatura.lg,
  },
  elenco: {
    flex: 1,
  },
  contenutoElenco: {
    paddingHorizontal: spaziatura.xl,
    paddingTop: spaziatura.lg,
    paddingBottom: spaziatura.xl,
  },
  intestazioneSezione: {
    marginBottom: spaziatura.sm,
    marginTop: spaziatura.sm,
  },
  rigaContenitore: {
    marginBottom: spaziatura.sm,
  },
  statoContenitore: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spaziatura.xxl,
    gap: spaziatura.sm,
  },
  statoTitolo: {
    ...tipografia.corpo,
    fontSize: 17,
    color: bento.testoPrimario,
    marginTop: spaziatura.sm,
  },
  statoTesto: {
    fontSize: 14,
    color: bento.testoSecondario,
    textAlign: 'center',
  },
});
