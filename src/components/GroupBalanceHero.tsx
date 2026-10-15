import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { BalancePill } from '@/components/BalancePill';
import { etichettaPosizione } from '@/components/GroupBalanceCard';
import { elevazione, gradienti, raggio, spaziatura } from '@/theme/tokens';

type Props = {
  /**
   * Posizione netta dell'utente in questo gruppo, in centesimi (positivo =
   * gli altri mi devono, negativo = devo io, 0 = in pari). null quando non
   * è derivabile in modo sicuro - in quel caso si mostra solo l'ingresso a
   * /saldi, senza nessuna cifra (vedi GroupBalanceCard.tsx).
   */
  nettoCentesimi: number | null;
  caricando: boolean;
  errore: boolean;
  onPress: () => void;
};

/**
 * Hero del saldo personale nel gruppo, gradiente di marchio viola→rosa.
 * Nessun calcolo qui: usa `etichettaPosizione` (già testata in
 * GroupBalanceCard.test.ts) solo per formattare un valore già calcolato da
 * useSaldi altrove. Il colore credito/debito resta sempre
 * semantica.successo/pericolo (via BalancePill), anche su questo sfondo
 * colorato - la direzione del saldo non deve mai dipendere dal tema della
 * sezione che la mostra.
 */
export function GroupBalanceHero({ nettoCentesimi, caricando, errore, onPress }: Props) {
  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <View style={[styles.ombra, pressed && styles.premuto]}>
          <LinearGradient
            colors={gradienti.hero}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <Text style={styles.etichetta}>IL TUO SALDO IN QUESTO GRUPPO</Text>

            <View style={styles.corpo}>
              {caricando ? (
                <ActivityIndicator color="#fff" style={styles.caricamento} />
              ) : errore || nettoCentesimi === null ? (
                <Text style={styles.testoNeutro}>Vedi saldi e spese del gruppo</Text>
              ) : nettoCentesimi === 0 ? (
                <Text style={styles.testoNeutro}>Sei in pari con tutti</Text>
              ) : (
                <BalancePill {...etichettaPosizione(nettoCentesimi)} grande />
              )}
            </View>

            <View style={styles.rigaAzione}>
              <Text style={styles.testoAzione}>Vedi saldi e spese</Text>
              <Feather name="arrow-right" size={14} color="rgba(255,255,255,0.9)" />
            </View>
          </LinearGradient>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ombra: {
    borderRadius: raggio.xl,
    ...elevazione.media,
  },
  premuto: {
    opacity: 0.92,
  },
  card: {
    borderRadius: raggio.xl,
    padding: spaziatura.xl,
    gap: spaziatura.sm,
  },
  etichetta: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: 'rgba(255,255,255,0.8)',
  },
  corpo: {
    minHeight: 34,
    justifyContent: 'center',
  },
  caricamento: {
    alignSelf: 'flex-start',
  },
  testoNeutro: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  rigaAzione: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spaziatura.xs,
  },
  testoAzione: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
});
