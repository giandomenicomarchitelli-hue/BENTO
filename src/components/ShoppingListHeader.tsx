import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IconBadge } from '@/components/IconBadge';
import { accenti, bento, raggio, spaziatura } from '@/theme/tokens';

type Props = {
  /** Nome del gruppo, null finché non ancora caricato - non si inventa un placeholder. */
  nomeGruppo: string | null;
  totale: number;
  comprati: number;
  onIndietro: () => void;
};

/**
 * Intestazione della lista della spesa: va dentro un BentoScreen con
 * `senzaIntestazione`, che copre già la safe area superiore - questo
 * componente non deve applicare di nuovo `inset.top` (stesso bug già
 * corretto in GroupHeader.tsx nella Fase 2.1).
 */
export function ShoppingListHeader({ nomeGruppo, totale, comprati, onIndietro }: Props) {
  const percentuale = totale > 0 ? comprati / totale : 0;
  const completata = totale > 0 && comprati === totale;

  return (
    <View style={styles.contenitore}>
      <Pressable onPress={onIndietro} hitSlop={8} style={styles.bottoneIndietro}>
        <Feather name="chevron-left" size={22} color={bento.testoPrimario} />
      </Pressable>

      <View style={styles.rigaTitolo}>
        <IconBadge icona="shopping-cart" colore={accenti.ciano} dimensione={44} />
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
                {
                  width: `${Math.round(percentuale * 100)}%`,
                  backgroundColor: completata ? accenti.menta : accenti.ciano,
                },
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
    gap: spaziatura.md,
  },
  bottoneIndietro: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  rigaTitolo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spaziatura.md,
  },
  testiTitolo: {
    flex: 1,
  },
  titolo: {
    fontSize: 24,
    fontWeight: '800',
    color: bento.testoPrimario,
  },
  sottotitolo: {
    fontSize: 13,
    fontWeight: '600',
    color: bento.testoSecondario,
    marginTop: 1,
  },
  blocchProgresso: {
    gap: 6,
  },
  rigaProgresso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  testoProgresso: {
    fontSize: 13,
    fontWeight: '600',
    color: bento.testoSecondario,
  },
  emojiCompletata: {
    fontSize: 13,
  },
  binarioProgresso: {
    height: 8,
    borderRadius: raggio.pillola,
    backgroundColor: bento.sfondoAlt,
    overflow: 'hidden',
  },
  riempimentoProgresso: {
    height: '100%',
    borderRadius: raggio.pillola,
  },
});
