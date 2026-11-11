import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BloccoDuro } from '@/components/BloccoDuro';
import { coloriNB as colori, pesiNB as pesi } from '@/theme/neoBrutalista';

type Props = {
  /** Nome del gruppo, null finché non ancora caricato - non si inventa un placeholder. */
  nomeGruppo: string | null;
  totale: number;
  comprati: number;
  onIndietro: () => void;
};

/**
 * Intestazione della lista della spesa: va dentro un involucro che copre
 * già la safe area superiore - questo componente non deve applicare di
 * nuovo l'inset (stesso bug corretto altrove nella Fase 2.1).
 */
export function ShoppingListHeader({ nomeGruppo, totale, comprati, onIndietro }: Props) {
  const percentuale = totale > 0 ? comprati / totale : 0;
  const completata = totale > 0 && comprati === totale;

  return (
    <View style={styles.contenitore}>
      <View style={styles.rigaTitolo}>
        <Pressable onPress={onIndietro} hitSlop={8}>
          <BloccoDuro offset={2} colore={colori.panna} raggio={10} contenutoStyle={styles.quadrato}>
            <Feather name="arrow-left" size={17} color={colori.scuro} />
          </BloccoDuro>
        </Pressable>
        <View style={styles.testiTitolo}>
          <Text style={styles.titolo}>Lista della spesa</Text>
          {nomeGruppo !== null && (
            <Text style={styles.sottotitolo} numberOfLines={1}>
              {nomeGruppo}
            </Text>
          )}
        </View>
      </View>

      {totale > 0 && (
        <View style={styles.blocchProgresso}>
          <View style={styles.rigaProgresso}>
            <Text style={styles.testoProgresso}>
              {completata ? 'Tutto comprato' : `${comprati} di ${totale} comprati`}
            </Text>
            {completata && <Text style={styles.emojiCompletata}>🎉</Text>}
          </View>
          <View style={styles.binarioProgresso}>
            <View
              style={[
                styles.riempimentoProgresso,
                { width: `${Math.round(percentuale * 100)}%` },
              ]}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenitore: {
    gap: 11,
  },
  rigaTitolo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  quadrato: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testiTitolo: {
    flex: 1,
    minWidth: 0,
  },
  titolo: {
    ...pesi.extraBold,
    fontSize: 18,
    letterSpacing: -0.3,
    color: colori.scuro,
  },
  sottotitolo: {
    ...pesi.bold,
    fontSize: 10.5,
    color: colori.soft,
    marginTop: 1,
  },
  blocchProgresso: {
    gap: 5,
  },
  rigaProgresso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  testoProgresso: {
    ...pesi.extraBold,
    fontSize: 11,
    color: colori.scuro,
  },
  emojiCompletata: {
    fontSize: 13,
  },
  binarioProgresso: {
    height: 8,
    borderWidth: 1.5,
    borderColor: colori.scuro,
    borderRadius: 999,
    backgroundColor: colori.panna,
    overflow: 'hidden',
  },
  riempimentoProgresso: {
    height: '100%',
    backgroundColor: colori.menta,
  },
});
