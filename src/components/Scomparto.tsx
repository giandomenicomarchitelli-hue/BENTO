import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, View, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { coloriNB, EASE_OUT_NB, pesiNB } from '@/theme/neoBrutalista';

/**
 * Uno scomparto del vassoio. Non ha ombra propria: ce l'ha il vassoio.
 * Proprio per questo l'azione in fondo ("Apri", "Entra", "Scrivi") non è
 * decorazione ma l'unica cosa che lo fa sembrare premibile.
 *
 * Anatomia fissa, uguale in ogni scomparto: nome in alto, cifra al
 * centro, azione in fondo. Chi impara a leggerne uno li ha letti tutti.
 *
 * Alla pressione il contenuto affonda di 2px dentro la parete mentre la
 * superficie resta ferma: è la sensazione di BloccoDuro conservata, ma
 * senza muovere il tassello nel mosaico. La superficie si scurisce del 6%
 * abbassando l'opacità sopra il nero del vassoio - `filter: brightness`
 * non esiste in React Native, ma il fondo scuro rende il risultato
 * identico.
 *
 * `minHeight` e mai altezze fisse: è quello che fa reggere il mosaico
 * quando i dati sono zero o il testo di sistema è ingrandito.
 */
export function Scomparto({
  nome,
  icona,
  azione,
  colore,
  onPress,
  style,
  orizzontale = false,
  children,
}: {
  nome?: string;
  icona?: React.ComponentProps<typeof Feather>['name'];
  azione: string;
  colore: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  /** Scomparto a fascia (es. Calendario): contenuto e azione sulla stessa riga. */
  orizzontale?: boolean;
  children?: React.ReactNode;
}) {
  const [premuto, setPremuto] = useState(false);

  return (
    <Animated.View
      style={[
        styles.superficie,
        { backgroundColor: colore },
        {
          opacity: premuto ? 0.94 : 1,
          transitionProperty: 'opacity',
          transitionDuration: '90ms',
          transitionTimingFunction: EASE_OUT_NB,
        },
        orizzontale && styles.superficieOrizzontale,
        style,
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={() => setPremuto(true)}
        onPressOut={() => setPremuto(false)}
        pressRetentionOffset={16}
        style={styles.areaTocco}
      >
        <Animated.View
          style={[
            orizzontale ? styles.corpoOrizzontale : styles.corpo,
            {
              transform: [{ translateX: premuto ? 2 : 0 }, { translateY: premuto ? 2 : 0 }],
              transitionProperty: 'transform',
              transitionDuration: '90ms',
              transitionTimingFunction: EASE_OUT_NB,
            },
          ]}
        >
          {orizzontale ? (
            children
          ) : (
            <>
              {/* Senza `nome` lo scomparto porta un contenuto suo in cima
                  (es. "Scrivi cosa hai fatto"), non la riga nome+icona. */}
              {nome !== undefined && (
                <View style={styles.testa}>
                  <Text style={styles.nome}>{nome}</Text>
                  {icona !== undefined && <Feather name={icona} size={13} color={coloriNB.scuro} />}
                </View>
              )}
              <View>{children}</View>
            </>
          )}
          <View style={styles.azione}>
            <Text style={styles.testoAzione}>{azione}</Text>
            <Feather name="arrow-right" size={11} color={coloriNB.scuro} />
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

/** La cifra grande di uno scomparto, con la sua unità e un'eventuale riga di dettaglio. */
export function CifraScomparto({
  cifra,
  unita,
  dettaglio,
}: {
  cifra?: number;
  unita?: string;
  dettaglio?: string;
}) {
  return (
    <>
      {cifra !== undefined && <Text style={styles.cifra}>{cifra}</Text>}
      {unita !== undefined && (
        <Text style={[styles.unita, cifra === undefined && styles.unitaSenzaCifra]}>{unita}</Text>
      )}
      {dettaglio !== undefined && <Text style={styles.dettaglio}>{dettaglio}</Text>}
    </>
  );
}

const styles = StyleSheet.create({
  superficie: {
    minHeight: 76,
  },
  superficieOrizzontale: {
    minHeight: 0,
  },
  areaTocco: {
    flex: 1,
  },
  corpo: {
    flex: 1,
    paddingTop: 10,
    paddingHorizontal: 11,
    paddingBottom: 9,
    justifyContent: 'space-between',
    gap: 8,
  },
  corpoOrizzontale: {
    flex: 1,
    paddingTop: 10,
    paddingHorizontal: 11,
    paddingBottom: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  testa: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  nome: {
    ...pesiNB.extraBold,
    fontSize: 9,
    letterSpacing: 1.17,
    textTransform: 'uppercase',
    color: coloriNB.scuro,
  },
  /**
   * Prima passata senza Archivo: Plus Jakarta ExtraBold ingrandito. Rende
   * un po' meno del render, ma la schermata atterra senza aggiungere una
   * dipendenza (vedi 2.5 dell'handoff).
   */
  cifra: {
    ...pesiNB.extraBold,
    fontSize: 44,
    lineHeight: 35,
    letterSpacing: -2,
    color: coloriNB.scuro,
    fontVariant: ['tabular-nums'],
  },
  unita: {
    ...pesiNB.extraBold,
    fontSize: 9.5,
    letterSpacing: 0.95,
    textTransform: 'uppercase',
    color: coloriNB.scuro,
    marginTop: 6,
  },
  unitaSenzaCifra: {
    marginTop: 0,
  },
  dettaglio: {
    ...pesiNB.bold,
    fontSize: 9.5,
    color: coloriNB.soft,
    marginTop: 4,
  },
  azione: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  testoAzione: {
    ...pesiNB.extraBold,
    fontSize: 8.5,
    letterSpacing: 0.85,
    textTransform: 'uppercase',
    color: coloriNB.scuro,
  },
});
