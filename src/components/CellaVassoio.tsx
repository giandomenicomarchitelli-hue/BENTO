import { Pressable, StyleSheet, Text, View } from 'react-native';

import { coloriNB, pesiNB } from '@/theme/neoBrutalista';

type Props = {
  dataISO: string;
  giorno: number;
  delMeseCorrente: boolean;
  oggi: boolean;
  selezionata: boolean;
  haOccorrenze: boolean;
  onPress: () => void;
};

/**
 * Una cella della griglia del mese - non è uno `Scomparto` (pensato per
 * essere sfogliato, troppo grande per 42 celle minuscole): qui c'è spazio
 * solo per un numero e, al più, un punto.
 *
 * Tre stati che non devono mai coincidere: "oggi" è un bordo interno
 * (non un riempimento, altrimenti si confonde con "selezionata"),
 * "selezionata" è un riempimento oro, "ha occorrenze" è un punto in
 * basso - l'unico dato che la cella porta a questa scala. Il tocco è
 * sempre valido, anche fuori mese: è la schermata chiamante a decidere
 * se cambiare mese, non questa cella.
 */
export function CellaVassoio({
  giorno,
  delMeseCorrente,
  oggi,
  selezionata,
  haOccorrenze,
  onPress,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.cella,
        { backgroundColor: delMeseCorrente ? coloriNB.panna : coloriNB.crema },
        selezionata && styles.selezionata,
      ]}
    >
      {/* Assoluto, non un bordo sulla cella stessa: un bordo sulla cella
          ne cambierebbe la dimensione nella griglia (le vicine non ce
          l'hanno), disallineando le pareti. */}
      {oggi && <View style={styles.anelloOggi} />}
      <Text style={[styles.numero, !delMeseCorrente && styles.numeroFuoriMese]}>{giorno}</Text>
      {haOccorrenze && <View style={styles.puntino} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cella: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  selezionata: {
    backgroundColor: coloriNB.oro,
  },
  anelloOggi: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: 3,
    bottom: 3,
    borderWidth: 1.6,
    borderColor: coloriNB.scuro,
    borderRadius: 5,
  },
  numero: {
    ...pesiNB.bold,
    fontSize: 12.5,
    color: coloriNB.scuro,
  },
  numeroFuoriMese: {
    opacity: 0.34,
  },
  puntino: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: coloriNB.scuro,
  },
});
