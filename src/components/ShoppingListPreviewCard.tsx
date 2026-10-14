import { Feather } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import type { ArticoloSpesa } from '@/api/articoliSpesa';
import { Badge } from '@/components/Badge';
import { GlassCard } from '@/components/GlassCard';
import { accenti, bento, spaziatura } from '@/theme/tokens';

type Props = {
  articoli: ArticoloSpesa[];
  caricando: boolean;
  errore: boolean;
  onPress: () => void;
};

const ANTEPRIMA_MASSIMA = 3;

/**
 * Anteprima sola lettura della lista della spesa: nessun tocco sui singoli
 * articoli (niente spunta/acquisto da qui) per non scavalcare il flusso di
 * conferma spesa già presente in /lista-spesa.
 */
export function ShoppingListPreviewCard({ articoli, caricando, errore, onPress }: Props) {
  const daComprare = articoli.filter((a) => a.stato === 'da_comprare');
  const comprati = articoli.filter((a) => a.stato === 'comprato');
  const anteprima = [...daComprare, ...comprati].slice(0, ANTEPRIMA_MASSIMA);

  return (
    <GlassCard onPress={onPress}>
      <View style={styles.intestazione}>
        <View style={styles.titoliIntestazione}>
          <View style={[styles.iconaContenitore, { backgroundColor: `${accenti.ciano}1F` }]}>
            <Feather name="shopping-cart" size={18} color={accenti.ciano} />
          </View>
          <Text style={styles.titolo}>Lista della spesa</Text>
        </View>
        {!caricando && !errore && articoli.length > 0 && (
          <Badge testo={`${comprati.length}/${articoli.length}`} tono="blu" />
        )}
        <Feather name="chevron-right" size={18} color={bento.testoMuto} />
      </View>

      {caricando ? (
        <ActivityIndicator style={styles.stato} color={bento.testoPrimario} />
      ) : errore ? (
        <Text style={styles.testoStato}>Non riesco a caricare la lista al momento.</Text>
      ) : articoli.length === 0 ? (
        <Text style={styles.testoStato}>Lista della spesa vuota.</Text>
      ) : (
        <View style={styles.elenco}>
          {anteprima.map((articolo) => (
            <View key={articolo.id} style={styles.riga}>
              <Feather
                name={articolo.stato === 'comprato' ? 'check-circle' : 'circle'}
                size={16}
                color={articolo.stato === 'comprato' ? accenti.menta : bento.testoMuto}
              />
              <Text
                style={[styles.testoArticolo, articolo.stato === 'comprato' && styles.testoComprato]}
                numberOfLines={1}
              >
                {articolo.nome}
              </Text>
            </View>
          ))}
          {articoli.length > ANTEPRIMA_MASSIMA && (
            <Text style={styles.altriArticoli}>+{articoli.length - ANTEPRIMA_MASSIMA} altri</Text>
          )}
        </View>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  intestazione: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spaziatura.sm,
  },
  titoliIntestazione: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spaziatura.sm,
  },
  iconaContenitore: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titolo: {
    fontSize: 16,
    fontWeight: '700',
    color: bento.testoPrimario,
  },
  stato: {
    alignSelf: 'flex-start',
    marginTop: spaziatura.md,
  },
  testoStato: {
    fontSize: 14,
    color: bento.testoSecondario,
    marginTop: spaziatura.md,
  },
  elenco: {
    marginTop: spaziatura.md,
    gap: spaziatura.sm,
  },
  riga: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spaziatura.sm,
  },
  testoArticolo: {
    flex: 1,
    fontSize: 14,
    color: bento.testoPrimario,
  },
  testoComprato: {
    textDecorationLine: 'line-through',
    color: bento.testoMuto,
  },
  altriArticoli: {
    fontSize: 12,
    color: bento.testoMuto,
    marginTop: 2,
  },
});
