import { StyleSheet, Text, View } from 'react-native';

import { coloriNB, pesiNB } from '@/theme/neoBrutalista';

type Props = { etichetta: string };

const LARGHEZZA_DENTE = 8;
// shortcut: riga fissa di denti invece di calcolarne il numero in base alla
// larghezza reale (richiederebbe onLayout) - 56 * 8px = 448px copre anche lo
// schermo più largo tra quelli supportati (iPhone Pro Max, 430pt); il
// contenitore taglia l'eccedenza con overflow:hidden.
const NUMERO_DENTI = 56;

/**
 * Il divisore fisico "da comprare"/"comprati" dentro lo stesso vassoio
 * (HANDOFF 9.2): non un'intestazione fra due contenitori, una parete in
 * più nella stessa griglia a pareti delle righe.
 *
 * Il bordo frastagliato nel render è un path SVG, ma `react-native-svg`
 * non è una dipendenza di questo progetto (verificato: assente da
 * package.json e da node_modules, nonostante l'handoff lo dia per
 * scontato) - aggiungerla solo per uno zigzag decorativo non si
 * ripagava. Stesso effetto con una fila di quadratini ruotati di 45°,
 * tagliata a metà dal contenitore: pura View, nessuna nuova dipendenza.
 */
export function Baran({ etichetta }: Props) {
  return (
    <View style={styles.contenitore}>
      <View style={styles.rigaDenti} pointerEvents="none">
        {Array.from({ length: NUMERO_DENTI }).map((_, indice) => (
          <View key={indice} style={styles.dente} />
        ))}
      </View>
      <Text style={styles.etichetta}>{etichetta}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contenitore: {
    height: 27,
    backgroundColor: coloriNB.menta,
    paddingHorizontal: 11,
    justifyContent: 'flex-end',
    alignItems: 'center',
    overflow: 'hidden',
  },
  rigaDenti: {
    position: 'absolute',
    top: -LARGHEZZA_DENTE / 2,
    left: 0,
    flexDirection: 'row',
  },
  dente: {
    width: LARGHEZZA_DENTE,
    height: LARGHEZZA_DENTE,
    backgroundColor: coloriNB.scuro,
    transform: [{ rotate: '45deg' }],
  },
  etichetta: {
    ...pesiNB.extraBold,
    fontSize: 8.8,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: coloriNB.scuro,
  },
});
