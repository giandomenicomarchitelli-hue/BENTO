import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
  View,
  type ViewStyle,
} from 'react-native';
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
  azione?: string;
  colore: string;
  /** Senza onPress lo scomparto non e' premibile (es. un messaggio d'errore). */
  onPress?: () => void;
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
      <Involucro
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
                  {icona !== undefined && <Feather name={icona} size={17} color={coloriNB.scuro} />}
                </View>
              )}
              <View>{children}</View>
            </>
          )}
          {azione !== undefined && (
            <View style={styles.azione}>
              <Text style={styles.testoAzione}>{azione}</Text>
              <Feather name="arrow-right" size={14} color={coloriNB.scuro} />
            </View>
          )}
        </Animated.View>
      </Involucro>
    </Animated.View>
  );
}

/** Pressable solo dove c'e' qualcosa da premere: un View con `onPress`
 *  vuoto si annuncerebbe come bottone a VoiceOver senza fare niente. */
function Involucro({
  onPress,
  ...resto
}: React.ComponentProps<typeof Pressable> & { onPress?: () => void }) {
  if (onPress === undefined) {
    return <View style={resto.style as StyleProp<ViewStyle>}>{resto.children as React.ReactNode}</View>;
  }
  return <Pressable onPress={onPress} {...resto} />;
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

/**
 * Lo stile della cifra per i valori che sono testo e non numeri (il nome
 * di un gruppo, un importo): il chiamante sovrascrive dimensione e
 * colore, il resto resta allineato alle cifre vere.
 */
export const stileValoreScomparto: TextStyle = {
  ...pesiNB.extraBold,
  letterSpacing: -0.5,
  color: coloriNB.scuro,
  fontVariant: ['tabular-nums'],
};

const styles = StyleSheet.create({
  superficie: {
    minHeight: 99,
  },
  superficieOrizzontale: {
    minHeight: 0,
  },
  areaTocco: {
    flex: 1,
  },
  corpo: {
    flex: 1,
    paddingTop: 13,
    paddingHorizontal: 14,
    paddingBottom: 12,
    justifyContent: 'space-between',
    gap: 10,
  },
  corpoOrizzontale: {
    flex: 1,
    paddingTop: 13,
    paddingHorizontal: 14,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  testa: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  nome: {
    ...pesiNB.extraBold,
    fontSize: 11.5,
    letterSpacing: 1.5,
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
    fontSize: 57,
    // Mai lineHeight < fontSize: in React Native il glifo viene ritagliato
    // dentro la riga (in CSS invece deborda, ed e' per questo che il render
    // poteva permettersi line-height 0.8 senza tagliare il numero).
    lineHeight: 58,
    letterSpacing: -2.6,
    color: coloriNB.scuro,
    fontVariant: ['tabular-nums'],
  },
  unita: {
    ...pesiNB.extraBold,
    fontSize: 12.5,
    letterSpacing: 1.25,
    textTransform: 'uppercase',
    color: coloriNB.scuro,
    marginTop: 8,
  },
  unitaSenzaCifra: {
    marginTop: 0,
  },
  dettaglio: {
    ...pesiNB.bold,
    fontSize: 12.5,
    color: coloriNB.soft,
    marginTop: 5,
  },
  azione: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  testoAzione: {
    ...pesiNB.extraBold,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: coloriNB.scuro,
  },
});
