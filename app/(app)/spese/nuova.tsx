import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { z } from 'zod';

import { dividiEqualmente } from '@/calcolo/divisioni';
import { useGruppoAttivo } from '@/hooks/useGruppoAttivo';
import { useSpese } from '@/hooks/useSpese';
import { euroInCentesimi } from '@/lib/formato';
import { useAuthStore } from '@/store/authStore';
import { useGruppoAttivoStore } from '@/store/gruppoAttivoStore';

const schema = z.object({
  importoCentesimi: z.number().int().positive('Inserisci un importo valido'),
  pagatoDa: z.string().min(1, 'Scegli chi ha pagato'),
  membriSelezionati: z.array(z.string()).min(1, 'Scegli chi divide la spesa'),
});

export default function NuovaSpesa() {
  const gruppoAttivoId = useGruppoAttivoStore((stato) => stato.gruppoAttivoId);
  const { membri } = useGruppoAttivo();
  const { crea } = useSpese(gruppoAttivoId);
  const utenteId = useAuthStore((stato) => stato.session?.user.id);

  const [importoEuro, setImportoEuro] = useState('');
  const [descrizione, setDescrizione] = useState('');
  // null = l'utente non ha ancora scelto esplicitamente: si usa il default
  // derivato da membri (appena caricato). Evita di sincronizzare stato
  // asincrono con un useEffect.
  const [pagatoDa, setPagatoDa] = useState<string | null>(null);
  const [membriSelezionati, setMembriSelezionati] = useState<string[] | null>(null);

  const ilMioMembro = membri.find((m) => m.utente_id === utenteId);
  const pagatoDaEffettivo = pagatoDa ?? ilMioMembro?.id ?? membri[0]?.id ?? '';
  const membriSelezionatiEffettivo = membriSelezionati ?? membri.map((m) => m.id);

  const [errore, setErrore] = useState<string | null>(null);
  const [inviando, setInviando] = useState(false);

  function alternaMembro(membroId: string) {
    setMembriSelezionati(
      membriSelezionatiEffettivo.includes(membroId)
        ? membriSelezionatiEffettivo.filter((id) => id !== membroId)
        : [...membriSelezionatiEffettivo, membroId]
    );
  }

  async function inviaForm() {
    const importoCentesimi = euroInCentesimi(importoEuro);
    const risultato = schema.safeParse({
      importoCentesimi: importoCentesimi ?? -1,
      pagatoDa: pagatoDaEffettivo,
      membriSelezionati: membriSelezionatiEffettivo,
    });
    if (!risultato.success) {
      setErrore(risultato.error.issues[0].message);
      return;
    }

    setErrore(null);
    setInviando(true);
    try {
      const quoteCentesimi = dividiEqualmente(
        risultato.data.importoCentesimi,
        risultato.data.membriSelezionati.length
      );
      await crea.mutateAsync({
        pagatoDa: risultato.data.pagatoDa,
        importoCentesimi: risultato.data.importoCentesimi,
        descrizione,
        quote: risultato.data.membriSelezionati.map((membroId, indice) => ({
          membroId,
          quotaCentesimi: quoteCentesimi[indice],
        })),
      });
      router.back();
    } catch {
      setErrore('Qualcosa è andato storto. Riprova.');
    } finally {
      setInviando(false);
    }
  }

  return (
    <View style={styles.contenitore}>
      <TextInput
        style={styles.input}
        placeholder="Importo (es. 12,50)"
        keyboardType="decimal-pad"
        value={importoEuro}
        onChangeText={setImportoEuro}
      />
      <TextInput
        style={styles.input}
        placeholder="Descrizione (opzionale)"
        value={descrizione}
        onChangeText={setDescrizione}
      />

      <Text style={styles.etichetta}>Pagato da</Text>
      <View style={styles.righeChip}>
        {membri.map((membro) => (
          <Pressable
            key={membro.id}
            style={[styles.chip, pagatoDaEffettivo === membro.id && styles.chipSelezionato]}
            onPress={() => setPagatoDa(membro.id)}
          >
            <Text
              style={[
                styles.testoChip,
                pagatoDaEffettivo === membro.id && styles.testoChipSelezionato,
              ]}
            >
              {membro.nome}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.etichetta}>Diviso tra</Text>
      <View style={styles.righeChip}>
        {membri.map((membro) => {
          const selezionato = membriSelezionatiEffettivo.includes(membro.id);
          return (
            <Pressable
              key={membro.id}
              style={[styles.chip, selezionato && styles.chipSelezionato]}
              onPress={() => alternaMembro(membro.id)}
            >
              <Text style={[styles.testoChip, selezionato && styles.testoChipSelezionato]}>
                {membro.nome}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {errore !== null && <Text style={styles.errore}>{errore}</Text>}

      <Pressable style={styles.bottone} onPress={inviaForm} disabled={inviando}>
        {inviando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.testoBottone}>Registra spesa</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  contenitore: {
    flex: 1,
    padding: 24,
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  etichetta: {
    fontSize: 14,
    color: '#555',
    marginTop: 4,
  },
  righeChip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipSelezionato: {
    backgroundColor: '#2d6cdf',
    borderColor: '#2d6cdf',
  },
  testoChip: {
    fontSize: 14,
    color: '#333',
  },
  testoChipSelezionato: {
    color: '#fff',
  },
  errore: {
    color: '#c0392b',
    textAlign: 'center',
  },
  bottone: {
    backgroundColor: '#2d6cdf',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  testoBottone: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
