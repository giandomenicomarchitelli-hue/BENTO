import { Feather } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { BalancePill } from '@/components/BalancePill';
import { GlassCard } from '@/components/GlassCard';
import { formattaEuro } from '@/lib/formato';
import { bento } from '@/theme/tokens';

type Props = {
  /**
   * Posizione netta dell'utente in questo gruppo, in centesimi (positivo =
   * gli altri mi devono, negativo = devo io, 0 = in pari). null quando non
   * è derivabile in modo sicuro dai dati di useSaldi/useGruppoAttivo - in
   * quel caso si mostra solo l'ingresso a /saldi, senza nessuna cifra.
   */
  nettoCentesimi: number | null;
  caricando: boolean;
  errore: boolean;
  onPress: () => void;
};

/**
 * Posizione netta di un membro date le transazioni già semplificate da
 * calcolaSaldi (src/calcolo/saldi.ts): positivo = a credito (gli altri gli
 * devono), negativo = a debito, 0 = in pari. Nessun calcolo finanziario
 * nuovo - solo la somma delle transazioni dove il membro compare, stessa
 * direzione (da = debitore, a = creditore) già usata in /saldi. Esportata
 * come funzione pura, separata dalla UI, per poterla testare a parte da
 * dashboard.tsx (vedi GroupBalanceCard.test.ts).
 */
export function calcolaPosizionePersonale(
  transazioni: { da: string; a: string; importoCentesimi: number }[],
  membroId: string
): number {
  return transazioni.reduce((totale, t) => {
    if (t.a === membroId) {
      return totale + t.importoCentesimi;
    }
    if (t.da === membroId) {
      return totale - t.importoCentesimi;
    }
    return totale;
  }, 0);
}

/** Etichetta e segno da mostrare per una posizione netta diversa da zero (lo zero si gestisce a parte, vedi il componente). */
export function etichettaPosizione(nettoCentesimi: number): { testo: string; aCredito: boolean } {
  return {
    aCredito: nettoCentesimi > 0,
    testo: `${nettoCentesimi > 0 ? 'Ti devono' : 'Devi'} ${formattaEuro(Math.abs(nettoCentesimi))}`,
  };
}

/** Il saldo personale nel gruppo attivo, con ingresso a "Saldi e spese". */
export function GroupBalanceCard({ nettoCentesimi, caricando, errore, onPress }: Props) {
  return (
    <GlassCard onPress={onPress}>
      <View style={styles.riga}>
        <View style={styles.testi}>
          <Text style={styles.etichetta}>Il tuo saldo in questo gruppo</Text>

          {caricando ? (
            <ActivityIndicator style={styles.caricamento} color={bento.testoPrimario} />
          ) : errore || nettoCentesimi === null ? (
            <Text style={styles.sottotitolo}>Vedi saldi e spese del gruppo</Text>
          ) : nettoCentesimi === 0 ? (
            <Text style={styles.sottotitolo}>Sei in pari con tutti</Text>
          ) : (
            <View style={styles.rigaPillola}>
              <BalancePill {...etichettaPosizione(nettoCentesimi)} />
            </View>
          )}
        </View>
        <Feather name="chevron-right" size={18} color={bento.testoMuto} />
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  riga: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  testi: {
    flex: 1,
  },
  etichetta: {
    fontSize: 13,
    fontWeight: '600',
    color: bento.testoSecondario,
  },
  sottotitolo: {
    fontSize: 15,
    fontWeight: '600',
    color: bento.testoPrimario,
    marginTop: 4,
  },
  rigaPillola: {
    marginTop: 8,
  },
  caricamento: {
    alignSelf: 'flex-start',
    marginTop: 6,
  },
});
