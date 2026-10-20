import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ArticoloSpesa } from '@/api/articoliSpesa';
import { Avatar } from '@/components/Avatar';
import { GlassCard } from '@/components/GlassCard';
import { confermaAzione } from '@/lib/conferma';
import { formattaEuro } from '@/lib/formato';
import { accenti, bento, raggio, spaziatura } from '@/theme/tokens';

type Props = {
  articolo: ArticoloSpesa;
  /** Nome di chi ha segnato l'articolo comprato, null se non derivabile (es. membro uscito). */
  nomeCompratore: string | null;
  /**
   * Tocco sulla riga quando NON ancora comprato: apre la schermata di
   * registrazione spesa esistente, non segna comprato da sé (vedi
   * lista-spesa.tsx) - questo componente non decide né anticipa quella
   * logica, si limita a inoltrare il tocco.
   */
  onTocca: () => void;
  onApriModifica: () => void;
  onElimina: () => void;
};

/**
 * Riga di un articolo della lista della spesa, in stile Hybrid Liquid
 * Glass. Puramente presentazionale: non decide se/quando un articolo
 * diventa "comprato" né tocca spese - si limita a inoltrare i tocchi ai
 * callback passati dal chiamante (vedi lista-spesa.tsx per il significato
 * di ciascuna azione).
 */
export function ShoppingListRow({
  articolo,
  nomeCompratore,
  onTocca,
  onApriModifica,
  onElimina,
}: Props) {
  const comprato = articolo.stato === 'comprato';

  async function chiediEliminazione() {
    const conferma = comprato
      ? await confermaAzione(
          'Eliminare l’articolo comprato?',
          `"${articolo.nome}" verrà rimosso dalla lista. Se hai registrato una spesa per questo acquisto, eliminare l'articolo non la annulla: resterà comunque nei saldi del gruppo.`,
          'Elimina comunque'
        )
      : await confermaAzione(
          'Eliminare l’articolo?',
          `"${articolo.nome}" verrà rimosso dalla lista della spesa.`,
          'Elimina'
        );
    if (conferma) {
      onElimina();
    }
  }

  const testiCentrali = (
    <View style={styles.testi}>
      <Text style={[styles.nome, comprato && styles.nomeComprato]} numberOfLines={2}>
        {articolo.nome}
      </Text>
      {comprato ? (
        <View style={styles.rigaSottotitolo}>
          <Avatar nome={nomeCompratore ?? '?'} dimensione={18} />
          <Text style={styles.sottotitolo} numberOfLines={1}>
            {nomeCompratore !== null ? `Comprato da ${nomeCompratore}` : 'Comprato'}
            {articolo.prezzo_centesimi !== null
              ? ` · ${formattaEuro(articolo.prezzo_centesimi)}`
              : ''}
          </Text>
        </View>
      ) : (
        articolo.note !== null &&
        articolo.note !== '' && (
          <Text style={styles.sottotitolo} numberOfLines={2}>
            {articolo.note}
          </Text>
        )
      )}
    </View>
  );

  return (
    <GlassCard elevazione="bassa" style={styles.card}>
      <View style={styles.riga}>
        {comprato ? (
          <View style={styles.contenutoRiga}>
            <View style={[styles.casella, styles.caselladComprata]}>
              <Feather name="check" size={16} color="#fff" />
            </View>
            {testiCentrali}
          </View>
        ) : (
          <Pressable
            onPress={onTocca}
            style={({ pressed }) => [styles.contenutoRiga, pressed && styles.premuto]}
            hitSlop={4}
          >
            <View style={styles.casella}>{null}</View>
            {testiCentrali}
          </Pressable>
        )}

        <View style={styles.azioni}>
          <Pressable onPress={onApriModifica} hitSlop={10} style={styles.bottoneAzione}>
            <Feather name="more-vertical" size={20} color={bento.testoMuto} />
          </Pressable>
          <Pressable onPress={chiediEliminazione} hitSlop={10} style={styles.bottoneAzione}>
            <Feather name="trash-2" size={18} color={bento.testoMuto} />
          </Pressable>
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
  },
  riga: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spaziatura.sm,
  },
  contenutoRiga: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spaziatura.md,
    minHeight: 44,
  },
  premuto: {
    opacity: 0.6,
  },
  casella: {
    width: 28,
    height: 28,
    borderRadius: raggio.sm,
    borderWidth: 2,
    borderColor: accenti.ciano,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caselladComprata: {
    backgroundColor: accenti.menta,
    borderColor: accenti.menta,
  },
  testi: {
    flex: 1,
    gap: 2,
  },
  nome: {
    fontSize: 16,
    fontWeight: '600',
    color: bento.testoPrimario,
  },
  nomeComprato: {
    textDecorationLine: 'line-through',
    color: bento.testoMuto,
  },
  rigaSottotitolo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  sottotitolo: {
    fontSize: 12.5,
    color: bento.testoSecondario,
    flexShrink: 1,
  },
  azioni: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  bottoneAzione: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
