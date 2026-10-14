import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { bento, spaziatura } from '@/theme/tokens';

type Props = {
  children: React.ReactNode;
  /** false per un contenuto che gestisce da sé lo scroll (es. una FlatList). */
  scroll?: boolean;
  /**
   * true se la schermata non ha l'intestazione nativa di Stack (es.
   * `headerShown: false`): in quel caso il padding superiore deve coprire
   * da sé la safe area (status bar/notch), altrimenti ci pensa già
   * l'intestazione e non va duplicato.
   */
  senzaIntestazione?: boolean;
};

/**
 * Involucro di base per una schermata del tema Bento: sfondo off-white
 * pieno (anche sotto la safe area, cosi' non c'e' mai una striscia
 * diversa ai bordi) e padding inferiore pari alla safe area, per non far
 * finire il contenuto a ridosso dell'home indicator su iOS. Il padding
 * superiore segue `senzaIntestazione` - vedi sopra.
 */
export function BentoScreen({ children, scroll = true, senzaIntestazione = false }: Props) {
  const inset = useSafeAreaInsets();
  // Con l'intestazione nativa di Stack il padding superiore resta quello
  // base (vedi `contenuto` qui sotto): ci pensa già l'intestazione a
  // coprire la safe area. Senza, bisogna aggiungere `inset.top` a mano.
  const paddingTop = spaziatura.lg + (senzaIntestazione ? inset.top : 0);
  const paddingBottom = inset.bottom + spaziatura.lg;

  if (!scroll) {
    return (
      <View style={[styles.contenitore, { paddingTop, paddingBottom }]}>{children}</View>
    );
  }

  return (
    <View style={styles.contenitore}>
      <ScrollView contentContainerStyle={[styles.contenuto, { paddingTop, paddingBottom }]}>
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
    paddingHorizontal: spaziatura.xl,
    paddingTop: spaziatura.lg,
    gap: spaziatura.lg,
  },
});
