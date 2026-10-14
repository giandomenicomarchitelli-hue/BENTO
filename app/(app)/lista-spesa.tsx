import { Feather } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { ArticoloSpesa } from '@/api/articoliSpesa';
import { Badge } from '@/components/Badge';
import { useArticoliSpesa } from '@/hooks/useArticoliSpesa';
import { useGruppoAttivo } from '@/hooks/useGruppoAttivo';
import { formattaEuro } from '@/lib/formato';
import { useAuthStore } from '@/store/authStore';
import { useGruppoAttivoStore } from '@/store/gruppoAttivoStore';
import { colori, raggio, spaziatura, tipografia } from '@/theme/tokens';

function RigaArticolo({
  articolo,
  nomeCompratore,
  onTocca,
  onApriModifica,
  onElimina,
}: {
  articolo: ArticoloSpesa;
  nomeCompratore: string | null;
  onTocca: () => void;
  onApriModifica: () => void;
  onElimina: () => void;
}) {
  const comprato = articolo.stato === 'comprato';

  const contenuto = (
    <>
      <View style={[styles.casella, comprato && styles.caselladSelezionata]}>
        {comprato && <Feather name="check" size={14} color="#fff" />}
      </View>
      <View style={styles.testiArticolo}>
        <Text style={[styles.nomeArticolo, comprato && styles.nomeArticoloComprato]}>
          {articolo.nome}
        </Text>
        {comprato && (
          <Text style={styles.compratoDa}>
            {nomeCompratore !== null ? `Comprato da ${nomeCompratore}` : 'Comprato'}
            {articolo.prezzo_centesimi !== null
              ? ` · ${formattaEuro(articolo.prezzo_centesimi)}`
              : ''}
          </Text>
        )}
      </View>
    </>
  );

  return (
    <View style={styles.riga}>
      {comprato ? (
        <>
          {contenuto}
          <Pressable onPress={onApriModifica} hitSlop={8} style={styles.bottoneAltro}>
            <Feather name="more-vertical" size={18} color={colori.inchiostro500} />
          </Pressable>
        </>
      ) : (
        <Pressable
          style={({ pressed }) => [styles.rigaCliccabile, pressed && styles.rigaPremuta]}
          onPress={onTocca}
        >
          {contenuto}
        </Pressable>
      )}
      <Pressable onPress={onElimina} hitSlop={8}>
        <Feather name="trash-2" size={16} color={colori.inchiostro300} />
      </Pressable>
    </View>
  );
}

export default function ListaSpesa() {
  const gruppoAttivoId = useGruppoAttivoStore((stato) => stato.gruppoAttivoId);

  if (gruppoAttivoId === null) {
    return <Redirect href="/gruppi" />;
  }

  return <ListaSpesaDelGruppo gruppoAttivoId={gruppoAttivoId} />;
}

function ListaSpesaDelGruppo({ gruppoAttivoId }: { gruppoAttivoId: string }) {
  const { membri } = useGruppoAttivo();
  const utenteId = useAuthStore((stato) => stato.session?.user.id);
  const { articoli, isLoading, aggiungi, elimina } = useArticoliSpesa(gruppoAttivoId);
  const [nuovoArticolo, setNuovoArticolo] = useState('');

  const ilMioMembroId = membri.find((m) => m.utente_id === utenteId)?.id ?? null;

  function aggiungiArticoloAllaLista() {
    const nome = nuovoArticolo.trim();
    if (nome === '' || ilMioMembroId === null) {
      return;
    }
    aggiungi.mutate({ nome, creatoDaMembroId: ilMioMembroId });
    setNuovoArticolo('');
  }

  const daComprare = articoli.filter((a) => a.stato === 'da_comprare');
  const comprati = articoli.filter((a) => a.stato === 'comprato');
  const elencoOrdinato = [...daComprare, ...comprati];

  return (
    <View style={styles.contenitore}>
      <View style={styles.intestazione}>
        <View>
          <Text style={styles.titolo}>Lista della spesa</Text>
          {articoli.length > 0 && (
            <Text style={styles.sottotitolo}>
              {comprati.length} di {articoli.length} comprati
            </Text>
          )}
        </View>
        {articoli.length > 0 && (
          <Badge testo={`${comprati.length}/${articoli.length}`} tono="blu" />
        )}
      </View>

      <View style={styles.rigaInput}>
        <TextInput
          style={styles.input}
          placeholder="Aggiungi un articolo"
          placeholderTextColor={colori.inchiostro300}
          value={nuovoArticolo}
          onChangeText={setNuovoArticolo}
          onSubmitEditing={aggiungiArticoloAllaLista}
          returnKeyType="done"
        />
        <Pressable style={styles.bottoneAggiungi} onPress={aggiungiArticoloAllaLista}>
          <Feather name="plus" size={20} color="#fff" />
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.caricamento} />
      ) : elencoOrdinato.length === 0 ? (
        <Text style={styles.vuoto}>Nessun articolo in lista.</Text>
      ) : (
        <FlatList
          data={elencoOrdinato}
          keyExtractor={(articolo) => articolo.id}
          style={styles.elenco}
          renderItem={({ item }) => (
            <RigaArticolo
              articolo={item}
              nomeCompratore={membri.find((m) => m.id === item.comprato_da)?.nome ?? null}
              onTocca={() => {
                // Segnare comprato apre il form per registrare la spesa
                // (o saltarlo, se non si vuole registrare nulla).
                router.push({
                  pathname: '/spese/nuova',
                  params: { articoloId: item.id, nomeArticolo: item.nome },
                });
              }}
              onApriModifica={() =>
                router.push({ pathname: '/articoli/[id]', params: { id: item.id } })
              }
              onElimina={() => elimina.mutate(item.id)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenitore: {
    flex: 1,
    backgroundColor: colori.sfondoApp,
    padding: spaziatura.lg,
    gap: spaziatura.md,
  },
  intestazione: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  titolo: {
    ...tipografia.titolo,
    fontSize: 22,
    color: colori.inchiostro900,
  },
  sottotitolo: {
    marginTop: 2,
    fontSize: 13,
    color: colori.inchiostro500,
  },
  rigaInput: {
    flexDirection: 'row',
    gap: spaziatura.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colori.superficie,
    borderWidth: 1,
    borderColor: colori.inchiostro150,
    borderRadius: raggio.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: colori.inchiostro900,
  },
  bottoneAggiungi: {
    width: 44,
    height: 44,
    borderRadius: raggio.sm,
    backgroundColor: colori.blu600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caricamento: {
    marginTop: 24,
  },
  vuoto: {
    textAlign: 'center',
    color: colori.inchiostro500,
    marginTop: 24,
  },
  elenco: {
    flex: 1,
  },
  riga: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spaziatura.md,
    backgroundColor: colori.superficie,
    borderRadius: raggio.md,
    paddingVertical: 12,
    paddingHorizontal: spaziatura.md,
    marginBottom: spaziatura.sm,
  },
  rigaCliccabile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spaziatura.md,
  },
  rigaPremuta: {
    opacity: 0.7,
  },
  bottoneAltro: {
    padding: 4,
  },
  casella: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colori.blu600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caselladSelezionata: {
    backgroundColor: colori.blu600,
    borderColor: colori.blu600,
  },
  testiArticolo: {
    flex: 1,
  },
  nomeArticolo: {
    fontSize: 16,
    fontWeight: '600',
    color: colori.inchiostro900,
  },
  nomeArticoloComprato: {
    textDecorationLine: 'line-through',
    color: colori.inchiostro300,
  },
  compratoDa: {
    fontSize: 12,
    color: colori.inchiostro500,
    marginTop: 2,
  },
});
