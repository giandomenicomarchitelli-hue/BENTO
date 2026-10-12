import { Redirect, router, useLocalSearchParams } from 'expo-router';
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

import { useGruppoAttivo } from '@/hooks/useGruppoAttivo';
import { useSaldi } from '@/hooks/useSaldi';
import { useSpese } from '@/hooks/useSpese';
import { euroInCentesimi, formattaEuro } from '@/lib/formato';
import { useGruppoAttivoStore } from '@/store/gruppoAttivoStore';

const schema = z.object({
  importoCentesimi: z.number().int().positive('Inserisci un importo valido'),
  chiPagaId: z.string().min(1, 'Scegli chi paga'),
  aChiId: z.string().min(1, 'Scegli a chi'),
});

export default function SaldaDebito() {
  const gruppoAttivoId = useGruppoAttivoStore((stato) => stato.gruppoAttivoId);

  if (gruppoAttivoId === null) {
    return <Redirect href="/" />;
  }

  return <SaldaDebitoDelGruppo gruppoAttivoId={gruppoAttivoId} />;
}

function SaldaDebitoDelGruppo({ gruppoAttivoId }: { gruppoAttivoId: string }) {
  const { membriAttivi } = useGruppoAttivo();
  const { transazioni } = useSaldi(gruppoAttivoId);
  const { crea } = useSpese(gruppoAttivoId);

  // Presenti solo se si arriva toccando "Salda" su un debito gia' mostrato
  // in Saldi: precompilano chi/a chi/importo con quel debito esatto.
  const params = useLocalSearchParams<{
    da?: string;
    a?: string;
    importoCentesimi?: string;
  }>();

  const [chiPaga, setChiPaga] = useState<string | null>(params.da ?? null);
  const [aChi, setAChi] = useState<string | null>(params.a ?? null);
  const [importoEuro, setImportoEuro] = useState(() =>
    params.importoCentesimi !== undefined
      ? (Number(params.importoCentesimi) / 100).toFixed(2).replace('.', ',')
      : ''
  );
  const [errore, setErrore] = useState<string | null>(null);
  const [inviando, setInviando] = useState(false);

  // Se chi paga e a chi corrispondono a un debito esistente, suggerisce
  // l'importo esatto rimasto da saldare (senza sovrascrivere una modifica
  // manuale dell'utente: solo quando il campo importo e' ancora vuoto).
  function selezionaChiPaga(id: string) {
    setChiPaga(id);
    aggiornaSuggerimento(id, aChi);
  }
  function selezionaAChi(id: string) {
    setAChi(id);
    aggiornaSuggerimento(chiPaga, id);
  }
  function aggiornaSuggerimento(daId: string | null, aId: string | null) {
    if (importoEuro.trim() !== '' || daId === null || aId === null) {
      return;
    }
    const debito = transazioni.find((t) => t.da === daId && t.a === aId);
    if (debito !== undefined) {
      setImportoEuro((debito.importoCentesimi / 100).toFixed(2).replace('.', ','));
    }
  }

  async function inviaForm() {
    const importoCentesimi = euroInCentesimi(importoEuro);
    const risultato = schema.safeParse({
      importoCentesimi: importoCentesimi ?? -1,
      chiPagaId: chiPaga ?? '',
      aChiId: aChi ?? '',
    });
    if (!risultato.success) {
      setErrore(risultato.error.issues[0].message);
      return;
    }
    if (risultato.data.chiPagaId === risultato.data.aChiId) {
      setErrore('Chi paga e a chi devono essere due persone diverse');
      return;
    }

    setErrore(null);
    setInviando(true);
    try {
      const nomeCreditore =
        membriAttivi.find((m) => m.id === risultato.data.aChiId)?.nome ?? '';
      await crea.mutateAsync({
        pagatoDa: risultato.data.chiPagaId,
        importoCentesimi: risultato.data.importoCentesimi,
        descrizione: `Pagamento a ${nomeCreditore}`,
        quote: [{ membroId: risultato.data.aChiId, quotaCentesimi: risultato.data.importoCentesimi }],
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
      <Text style={styles.etichetta}>Chi paga</Text>
      <View style={styles.righeChip}>
        {membriAttivi.map((membro) => (
          <Pressable
            key={membro.id}
            style={[styles.chip, chiPaga === membro.id && styles.chipSelezionato]}
            onPress={() => selezionaChiPaga(membro.id)}
          >
            <Text style={[styles.testoChip, chiPaga === membro.id && styles.testoChipSelezionato]}>
              {membro.nome}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.etichetta}>A chi</Text>
      <View style={styles.righeChip}>
        {membriAttivi
          .filter((m) => m.id !== chiPaga)
          .map((membro) => (
            <Pressable
              key={membro.id}
              style={[styles.chip, aChi === membro.id && styles.chipSelezionato]}
              onPress={() => selezionaAChi(membro.id)}
            >
              <Text style={[styles.testoChip, aChi === membro.id && styles.testoChipSelezionato]}>
                {membro.nome}
              </Text>
            </Pressable>
          ))}
      </View>

      <Text style={styles.etichetta}>Importo</Text>
      <TextInput
        style={styles.input}
        placeholder="Importo (es. 12,50)"
        keyboardType="decimal-pad"
        value={importoEuro}
        onChangeText={setImportoEuro}
      />
      {chiPaga !== null && aChi !== null && (
        <Text style={styles.suggerimento}>
          {(() => {
            const debito = transazioni.find((t) => t.da === chiPaga && t.a === aChi);
            return debito !== undefined
              ? `Debito totale: ${formattaEuro(debito.importoCentesimi)} — puoi saldarlo tutto o in parte`
              : 'Nessun debito registrato in questa direzione al momento, ma puoi comunque registrare il pagamento';
          })()}
        </Text>
      )}

      {errore !== null && <Text style={styles.errore}>{errore}</Text>}

      <Pressable style={styles.bottone} onPress={inviaForm} disabled={inviando}>
        {inviando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.testoBottone}>Registra pagamento</Text>
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
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  suggerimento: {
    fontSize: 13,
    color: '#888',
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
