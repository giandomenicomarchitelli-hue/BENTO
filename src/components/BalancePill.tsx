import { StyleSheet, Text, View } from 'react-native';

import { raggio, semantica } from '@/theme/tokens';

type Props = {
  /** true = a credito (mi deve, verde), false = a debito (devo, rosso). */
  aCredito: boolean;
  testo: string;
};

/**
 * Pillola compatta per un importo/direzione di saldo (es. "+12,50 €").
 * Usa sempre la semantica finanziaria di `semantica.successo`/`pericolo` -
 * non introdurre qui un colore diverso per "sembrare" più in tema con una
 * sezione: il significato credito/debito deve restare riconoscibile ovunque.
 */
export function BalancePill({ aCredito, testo }: Props) {
  return (
    <View style={[styles.pillola, { backgroundColor: aCredito ? semantica.successoSoft : semantica.pericoloSoft }]}>
      <Text style={[styles.testo, { color: aCredito ? semantica.successo : semantica.pericolo }]}>{testo}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pillola: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: raggio.pillola,
    alignSelf: 'flex-start',
  },
  testo: {
    fontSize: 13,
    fontWeight: '700',
  },
});
