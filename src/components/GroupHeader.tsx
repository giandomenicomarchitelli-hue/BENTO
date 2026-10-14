import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Gruppo } from '@/api/gruppi';
import { iconaPerTipoGruppo } from '@/components/GroupPreviewCard';
import { IconBadge } from '@/components/IconBadge';
import { bento, spaziatura } from '@/theme/tokens';

type Props = {
  gruppo: Pick<Gruppo, 'nome' | 'tipo'>;
  onIndietro: () => void;
  onImpostazioni: () => void;
  onEsci: () => void;
};

/**
 * Intestazione personalizzata di un gruppo: sostituisce l'intestazione
 * nativa di Stack (nascosta per questa schermata, vedi dashboard.tsx),
 * quindi copre da sé la safe area superiore.
 */
export function GroupHeader({ gruppo, onIndietro, onImpostazioni, onEsci }: Props) {
  const inset = useSafeAreaInsets();
  const stile = iconaPerTipoGruppo(gruppo.tipo);

  return (
    <View style={[styles.contenitore, { paddingTop: inset.top + spaziatura.sm }]}>
      <View style={styles.rigaAlta}>
        <Pressable onPress={onIndietro} hitSlop={8} style={styles.bottoneIcona}>
          <Feather name="chevron-left" size={22} color={bento.testoPrimario} />
        </Pressable>
        <View style={styles.azioniDestra}>
          <Pressable onPress={onImpostazioni} hitSlop={8} style={styles.bottoneIcona}>
            <Feather name="settings" size={18} color={bento.testoSecondario} />
          </Pressable>
          <Pressable onPress={onEsci} hitSlop={8} style={styles.bottoneIcona}>
            <Feather name="log-out" size={18} color={bento.testoMuto} />
          </Pressable>
        </View>
      </View>

      <View style={styles.rigaGruppo}>
        <IconBadge icona={stile.icona} colore={stile.colore} dimensione={44} />
        <Text style={styles.nome} numberOfLines={1}>
          {gruppo.nome}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenitore: {
    paddingHorizontal: spaziatura.xl,
    paddingBottom: spaziatura.md,
    gap: spaziatura.md,
  },
  rigaAlta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottoneIcona: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  azioniDestra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spaziatura.xs,
  },
  rigaGruppo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spaziatura.md,
  },
  nome: {
    flex: 1,
    fontSize: 24,
    fontWeight: '800',
    color: bento.testoPrimario,
  },
});
