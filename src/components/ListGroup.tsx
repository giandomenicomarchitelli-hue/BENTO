import { Children, Fragment, isValidElement } from 'react';
import { StyleSheet, View } from 'react-native';

import { colori, raggio } from '@/theme/tokens';

type Props = {
  children: React.ReactNode;
};

/** Contenitore per una serie di ListRow, con divisori automatici tra una riga e l'altra. */
export function ListGroup({ children }: Props) {
  const righe = Children.toArray(children).filter(isValidElement);

  return (
    <View style={styles.contenitore}>
      {righe.map((riga, indice) => (
        <Fragment key={riga.key ?? indice}>
          {riga}
          {indice < righe.length - 1 && <View style={styles.divisore} />}
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  contenitore: {
    backgroundColor: colori.superficie,
    borderRadius: raggio.md,
    borderWidth: 1,
    borderColor: colori.inchiostro150,
    overflow: 'hidden',
  },
  divisore: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colori.inchiostro150,
    marginLeft: 16 + 32 + 12,
  },
});
