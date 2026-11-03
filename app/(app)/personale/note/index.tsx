import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { NotaPersonale } from '@/api/notePersonali';
import { BentoButton } from '@/components/BentoButton';
import { BentoScreen } from '@/components/BentoScreen';
import { GlassCard } from '@/components/GlassCard';
import { useNotePersonali } from '@/hooks/useNotePersonali';
import { confermaAzione } from '@/lib/conferma';
import { useAuthStore } from '@/store/authStore';
import { bento, raggio, semantica, spaziatura } from '@/theme/tokens';

/**
 * Nessun redirect/guard legato a un gruppo: le note personali sono scoped
 * solo per utente, stesso pattern di `personale/liste/index.tsx`.
 */
export default function NotePersonali() {
  const utenteId = useAuthStore((stato) => stato.session?.user.id) ?? null;
  const { note, isLoading, crea, elimina } = useNotePersonali(utenteId);
  const [nuovoTitolo, setNuovoTitolo] = useState('');

  function creaNota() {
    const titolo = nuovoTitolo.trim();
    if (titolo === '') {
      return;
    }
    crea.mutate({ titolo });
    setNuovoTitolo('');
  }

  async function confermaEliminaNota(nota: NotaPersonale) {
    const conferma = await confermaAzione(
      `Eliminare "${nota.titolo}"?`,
      'Il contenuto e le foto di questa nota andranno persi.',
      'Elimina'
    );
    if (conferma) {
      elimina.mutate(nota.id);
    }
  }

  function apriNota(nota: NotaPersonale) {
    router.push({
      pathname: '/personale/note/[id]',
      params: { id: nota.id, titolo: nota.titolo },
    });
  }

  return (
    <BentoScreen>
      <GlassCard>
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Nuova nota (es. Idee regalo)"
            placeholderTextColor={bento.testoMuto}
            value={nuovoTitolo}
            onChangeText={setNuovoTitolo}
            onSubmitEditing={creaNota}
            returnKeyType="done"
          />
          <BentoButton
            etichetta="Crea nota"
            onPress={creaNota}
            disabilitato={nuovoTitolo.trim() === ''}
          />
        </View>
      </GlassCard>

      {isLoading ? (
        <ActivityIndicator color={bento.testoPrimario} style={styles.caricamento} />
      ) : note.length === 0 ? (
        <Text style={styles.vuoto}>Nessuna nota ancora. Creane una qui sopra.</Text>
      ) : (
        <View style={styles.elenco}>
          {note.map((nota) => (
            <GlassCard key={nota.id} onPress={() => apriNota(nota)} elevazione="bassa">
              <View style={styles.riga}>
                <View style={styles.contenutoRiga}>
                  <Text style={styles.titoloNota}>{nota.titolo}</Text>
                  {nota.contenuto !== '' && (
                    <Text style={styles.anteprima} numberOfLines={2}>
                      {nota.contenuto}
                    </Text>
                  )}
                </View>
                <Pressable onPress={() => confermaEliminaNota(nota)} hitSlop={8}>
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
    gap: spaziatura.md,
  },
  contenutoRiga: {
    flex: 1,
  },
  titoloNota: {
    fontSize: 16,
    fontWeight: '600',
    color: bento.testoPrimario,
  },
  anteprima: {
    fontSize: 13,
    color: bento.testoSecondario,
    marginTop: 4,
  },
  elimina: {
    color: semantica.pericolo,
    fontSize: 13,
    fontWeight: '600',
  },
});
