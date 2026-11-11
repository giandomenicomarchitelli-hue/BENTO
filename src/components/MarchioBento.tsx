import { StyleSheet, View } from 'react-native';

import { BloccoDuro } from '@/components/BloccoDuro';
import { coloriNB } from '@/theme/neoBrutalista';

/**
 * Il marchio: griglia 2×2 nei quattro accenti (oro/menta in cima,
 * viola/corallo in fondo - l'unico punto dell'app dove il corallo
 * riempie una cella, per il resto riservato a soldi in uscita/bottone
 * centrale), stesso linguaggio di `Vassoio`/`BloccoDuro` - un'ombra
 * dura sfalsata, non le proprietà shadow di RN. Condiviso da Home,
 * Personale e Gruppi (le tre schermate che oggi portano il marchio in
 * testata): era duplicato identico in tutte e tre.
 */
export function MarchioBento() {
  return (
    <BloccoDuro offset={2} colore={coloriNB.scuro} raggio={9} contenutoStyle={styles.vassoio}>
      <View style={styles.riga}>
        <View style={[styles.cella, { backgroundColor: coloriNB.oro }]} />
        <View style={[styles.cella, { backgroundColor: coloriNB.menta }]} />
      </View>
      <View style={styles.riga}>
        <View style={[styles.cella, { backgroundColor: coloriNB.viola }]} />
        <View style={[styles.cella, { backgroundColor: coloriNB.corallo }]} />
      </View>
    </BloccoDuro>
  );
}

const styles = StyleSheet.create({
  vassoio: {
    width: 36,
    height: 36,
    gap: 2,
    overflow: 'hidden',
  },
  riga: {
    flex: 1,
    flexDirection: 'row',
    gap: 2,
  },
  cella: {
    flex: 1,
  },
});
