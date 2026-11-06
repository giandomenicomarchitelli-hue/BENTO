import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, type StyleProp, View, type ViewStyle } from 'react-native';

import { BloccoDuro } from '@/components/BloccoDuro';
import { coloriNB, pesiNB } from '@/theme/neoBrutalista';

/** Lo spessore della parete fra due scomparti. È nero perché È il vassoio. */
export const PARETE = 2.5;

/**
 * Il vassoio: un contenitore nero unico che tiene gli scomparti, al posto
 * di tante card separate ognuna con la sua ombra.
 *
 * Il trucco è il `gap` sullo sfondo scuro: quei 2.5px non sono spazio
 * vuoto, sono la parete fra uno scomparto e l'altro. Per questo il
 * contenuto va clippato (`overflow: 'hidden'`) - sono gli angoli del
 * vassoio a dare la forma, non quelli degli scomparti.
 *
 * L'ombra dura e il bordo arrivano da BloccoDuro, stessa tecnica di tutto
 * il resto della schermata (rettangolo sfalsato, non `shadow`).
 *
 * `etichetta` è la fascia in cima: va messa solo se dice qualcosa di vero.
 * Su Personale è "solo tu puoi vederli"; su Home non c'è, perché lì non
 * c'era niente da dire.
 */
export function Vassoio({
  children,
  style,
  etichetta,
  iconaEtichetta,
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  etichetta?: string;
  iconaEtichetta?: React.ComponentProps<typeof Feather>['name'];
}) {
  return (
    <BloccoDuro
      style={style}
      offset={5}
      colore={coloriNB.scuro}
      raggio={20}
      contenutoStyle={styles.interno}
    >
      {etichetta !== undefined && (
        <View style={styles.fascia}>
          {iconaEtichetta !== undefined && (
            <Feather name={iconaEtichetta} size={11} color={coloriNB.crema} />
          )}
          <Text style={styles.testoFascia}>{etichetta}</Text>
        </View>
      )}
      {children}
    </BloccoDuro>
  );
}

const styles = StyleSheet.create({
  interno: {
    // Raggio interno = raggio esterno meno il bordo, altrimenti gli angoli
    // degli scomparti sbucano fuori dalla curva del vassoio.
    borderRadius: 20 - PARETE,
    overflow: 'hidden',
    backgroundColor: coloriNB.scuro,
  },
  fascia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingTop: 7,
    paddingBottom: 8,
  },
  testoFascia: {
    ...pesiNB.extraBold,
    fontSize: 8.5,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: coloriNB.crema,
  },
});
