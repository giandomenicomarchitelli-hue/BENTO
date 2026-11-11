import { StyleSheet, View } from 'react-native';

import { BloccoDuro } from '@/components/BloccoDuro';
import { coloriNB } from '@/theme/neoBrutalista';

/**
 * Una variante "da marchio" dei tre accenti, più satura dei token
 * `coloriNB` veri (oro/menta coincidono, il viola no): a grandezza di
 * marchio, in campiture larghe senza testo sopra, le tinte dell'app
 * leggevano smorte - qui non c'è il vincolo di contrasto testo-su-
 * riempimento che tiene `coloriNB.viola` più tenue altrove. Non è una
 * proposta di cambiare i token dell'app, solo questo componente.
 */
const ACCENTI_MARCHIO = {
  oro: '#F6A91E',
  menta: '#17A398',
  viola: '#7B57F2',
};

/**
 * Il marchio: tre scomparti (menta grande a sinistra, oro e viola
 * impilati a destra), stesso linguaggio di `Vassoio`/`BloccoDuro` -
 * un'ombra dura sfalsata, non le proprietà shadow di RN. Condiviso da
 * Home, Personale e Gruppi (le tre schermate che oggi portano il
 * marchio in testata): era duplicato identico in tutte e tre.
 */
export function MarchioBento() {
  return (
    <BloccoDuro offset={2} colore={coloriNB.scuro} raggio={9} contenutoStyle={styles.vassoio}>
      <View style={[styles.cella, { flex: 40, backgroundColor: ACCENTI_MARCHIO.menta }]} />
      <View style={styles.colonnaDestra}>
        <View style={[styles.cella, { flex: 1, backgroundColor: ACCENTI_MARCHIO.oro }]} />
        <View style={[styles.cella, { flex: 1, backgroundColor: ACCENTI_MARCHIO.viola }]} />
      </View>
    </BloccoDuro>
  );
}

const styles = StyleSheet.create({
  vassoio: {
    width: 36,
    height: 36,
    flexDirection: 'row',
    gap: 2,
    // Senza questo gli angoli quadrati delle celle sporgono oltre il
    // bordo arrotondato esterno di BloccoDuro (raggio 9, bordo 2px a
    // offset<=2): il raggio interno deve essere concentrico, raggio
    // esterno meno lo spessore del bordo (9-2=7), non solo "overflow
    // hidden" senza un proprio borderRadius.
    borderRadius: 7,
    overflow: 'hidden',
  },
  colonnaDestra: {
    flex: 43,
    gap: 2,
  },
  cella: {
    flex: 1,
  },
});
