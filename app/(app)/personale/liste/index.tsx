import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { ListaPersonale } from '@/api/listePersonali';
import { BentoButton } from '@/components/BentoButton';
import { BentoScreen } from '@/components/BentoScreen';
import { GlassCard } from '@/components/GlassCard';
import { useListePersonali } from '@/hooks/useListePersonali';
import { confermaAzione } from '@/lib/conferma';
import { useAuthStore } from '@/store/authStore';
import { bento, raggio, semantica, spaziatura } from '@/theme/tokens';

/**
 * Nessun redirect/guard legato a un gruppo: le liste personali sono scoped
 * solo per utente. Senza utenteId (non dovrebbe succedere dentro (app)/)
 * l'hook resta semplicemente in attesa, mostrando l'elenco vuoto.
 */
export default function ListePersonali() {
  const utenteId = useAuthStore((stato) => stato.session?.user.id) ?? null;
  const { liste, isLoading, crea, elimina } = useListePersonali(utenteId);
  const [nuovaLista, setNuovaLista] = useState('');

  function creaLista() {
    const nome = nuovaLista.trim();
    if (nome === '') {
      return;
    }
    crea.mutate({ nome });
    setNuovaLista('');
  }

  async function confermaEliminaLista(lista: ListaPersonale) {
    const conferma = await confermaAzione(
      `Eliminare "${lista.nome}"?`,
      'Tutte le voci di questa lista andranno perse.',
      'Elimina'
    );
    if (conferma) {
      elimina.mutate(lista.id);
    }
  }

  function apriLista(lista: ListaPersonale) {
    router.push({
      pathname: '/personale/liste/[id]',
      params: { id: lista.id, nome: lista.nome },
    });
  }

  return (
    <BentoScreen>
      <GlassCard>
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Nuova lista (es. Film da vedere)"
            placeholderTextColor={bento.testoMuto}
            value={nuovaLista}
            onChangeText={setNuovaLista}
            onSubmitEditing={creaLista}
            returnKeyType="done"
          />
          <BentoButton
            etichetta="Crea lista"
            onPress={creaLista}
            disabilitato={nuovaLista.trim() === ''}
          />
        </View>
      </GlassCard>

      {isLoading ? (
        <ActivityIndicator color={bento.testoPrimario} style={styles.caricamento} />
      ) : liste.length === 0 ? (
        <Text style={styles.vuoto}>Nessuna lista ancora. Creane una qui sopra.</Text>
      ) : (
        <View style={styles.elenco}>
          {liste.map((lista) => (
            <GlassCard key={lista.id} onPress={() => apriLista(lista)} elevazione="bassa">
              <View style={styles.riga}>
                <Text style={styles.nomeLista}>{lista.nome}</Text>
                <Pressable onPress={() => confermaEliminaLista(lista)} hitSlop={8}>
                  <Text style={styles.elimina}>Elimina</Text>
                </Pressable>
              </View>
            </GlassCard>
          ))}
        </View>
      )}
    </BentoScreen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spaziatura.md,
  },
  input: {
    fontSize: 16,
    color: bento.testoPrimario,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: bento.sfondoAlt,
    borderRadius: raggio.sm,
  },
  caricamento: {
    marginTop: spaziatura.xl,
  },
  vuoto: {
    textAlign: 'center',
    color: bento.testoSecondario,
    marginTop: spaziatura.xl,
  },
  elenco: {
    gap: spaziatura.sm,
  },
  riga: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nomeLista: {
    fontSize: 16,
    fontWeight: '600',
    color: bento.testoPrimario,
  },
  elimina: {
    color: semantica.pericolo,
    fontSize: 13,
    fontWeight: '600',
  },
});
