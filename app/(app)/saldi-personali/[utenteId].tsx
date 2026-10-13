import { useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { creaSpesa } from '@/api/spese';
import { useSaldiAggregati, useInvalidaSaldiAggregati } from '@/hooks/useSaldiAggregati';
import { useInvalidaMieiGruppi } from '@/hooks/useMieiGruppi';
import { confermaAzione } from '@/lib/conferma';
import { formattaEuro } from '@/lib/formato';

export default function SaldoConPersona() {
  const { utenteId, nome } = useLocalSearchParams<{ utenteId: string; nome?: string }>();
  const { persone, isLoading } = useSaldiAggregati();
  const invalidaSaldiAggregati = useInvalidaSaldiAggregati();
  const invalidaMieiGruppi = useInvalidaMieiGruppi();
  const queryClient = useQueryClient();
  const [saldando, setSaldando] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  const persona = persone.find((p) => p.utenteId === utenteId);

  async function saldaTutto() {
    if (persona === undefined) {
      return;
    }
    const conferma = await confermaAzione(
      `Saldare tutto con ${persona.nome}?`,
      `Registra un pagamento in ciascuno dei ${persona.gruppi.length} gruppi in comune, così da azzerare il saldo in tutti - il totale che cambia mano è ${formattaEuro(Math.abs(persona.nettoCentesimi))}.`,
      'Salda tutto'
    );
    if (!conferma) {
      return;
    }

    setErrore(null);
    setSaldando(true);
    try {
      for (const riga of persona.gruppi) {
        if (riga.importoCentesimi === 0) {
          continue;
        }
        const ioSonoCreditore = riga.importoCentesimi > 0;
        await creaSpesa({
          gruppoId: riga.gruppoId,
          pagatoDa: ioSonoCreditore ? riga.altroMembroId : riga.ilMioMembroId,
          importoCentesimi: Math.abs(riga.importoCentesimi),
          descrizione: `Saldo con ${ioSonoCreditore ? 'te' : persona.nome}`,
          quote: [
            {
              membroId: ioSonoCreditore ? riga.ilMioMembroId : riga.altroMembroId,
              quotaCentesimi: Math.abs(riga.importoCentesimi),
            },
          ],
        });
      }
      await Promise.all([
        invalidaSaldiAggregati(),
        invalidaMieiGruppi(),
        ...persona.gruppi.map((riga) =>
          queryClient.invalidateQueries({ queryKey: ['spese', riga.gruppoId], refetchType: 'all' })
        ),
      ]);
      router.back();
    } catch {
      setErrore('Qualcosa è andato storto. Riprova.');
      setSaldando(false);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.centrato}>
        <ActivityIndicator />
      </View>
    );
  }

  if (persona === undefined) {
    return (
      <View style={styles.centrato}>
        <Text style={styles.inPari}>Sei in pari con {nome ?? 'questa persona'}.</Text>
      </View>
    );
  }

  const miDeve = persona.nettoCentesimi > 0;

  return (
    <View style={styles.contenitore}>
      <Stack.Screen options={{ title: persona.nome }} />

      <Text style={styles.titolo}>
        {miDeve ? `${persona.nome} ti deve` : `Devi a ${persona.nome}`}
      </Text>
      <Text style={[styles.nettoGrande, miDeve ? styles.testoCredito : styles.testoDebito]}>
        {formattaEuro(Math.abs(persona.nettoCentesimi))}
      </Text>

      <Text style={styles.etichetta}>Nei singoli gruppi</Text>
      {persona.gruppi.map((riga) => {
        const ioSonoCreditore = riga.importoCentesimi > 0;
        return (
          <View key={riga.gruppoId} style={styles.riga}>
            <Text style={styles.nomeGruppo}>{riga.gruppoNome}</Text>
            <Text style={ioSonoCreditore ? styles.testoCredito : styles.testoDebito}>
              {ioSonoCreditore
                ? `ti deve ${formattaEuro(riga.importoCentesimi)}`
                : `devi ${formattaEuro(-riga.importoCentesimi)}`}
            </Text>
          </View>
        );
      })}

      {errore !== null && <Text style={styles.errore}>{errore}</Text>}

      <Pressable style={styles.bottone} onPress={saldaTutto} disabled={saldando}>
        {saldando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.testoBottone}>Salda tutto</Text>
        )}
      </Pressable>
      <Text style={styles.suggerimento}>
        Azzera il saldo in ogni gruppo in comune. Per saldare solo in parte, o solo un gruppo
        specifico, usa «Salda un debito» dentro al singolo gruppo.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centrato: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  inPari: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  contenitore: {
    flex: 1,
    padding: 24,
    gap: 8,
  },
  titolo: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
  },
  nettoGrande: {
    fontSize: 36,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  testoCredito: {
    color: '#2e7d32',
  },
  testoDebito: {
    color: '#c0392b',
  },
  etichetta: {
    fontSize: 14,
    color: '#555',
    marginTop: 8,
  },
  riga: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  nomeGruppo: {
    fontSize: 15,
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
    marginTop: 16,
  },
  testoBottone: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  suggerimento: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginTop: 4,
  },
});
