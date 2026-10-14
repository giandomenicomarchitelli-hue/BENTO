import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { bento, spaziatura } from '@/theme/tokens';

type Props = {
  children: React.ReactNode;
  /** false per un contenuto che gestisce da sé lo scroll (es. una FlatList). */
  scroll?: boolean;
};

/**
 * Involucro di base per una schermata del tema Bento: sfondo off-white
 * pieno (anche sotto la safe area, cosi' non c'e' mai una striscia
 * diversa ai bordi) e padding inferiore pari alla safe area, per non far
 * finire il contenuto a ridosso dell'home indicator su iOS.
 */
export function BentoScreen({ children, scroll = true }: Props) {
  const inset = useSafeAreaInsets();

  if (!scroll) {
    return (
      <View style={[styles.contenitore, { paddingBottom: inset.bottom + spaziatura.lg }]}>
        {children}
      </View>
    );
  }

  return (
    <View style={styles.contenitore}>
      <ScrollView
        contentContainerStyle={[styles.contenuto, { paddingBottom: inset.bottom + spaziatura.lg }]}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  contenitore: {
    flex: 1,
    backgroundColor: bento.sfondo,
  },
  contenuto: {
    flexGrow: 1,
    padding: spaziatura.xl,
    gap: spaziatura.xl,
  },
});
