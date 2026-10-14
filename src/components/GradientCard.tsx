import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { gradienteHero, raggio } from '@/theme/tokens';

type Props = {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

/** Card con gradiente viola-magenta per contenuti in evidenza (es. saldo aggregato). */
export function GradientCard({ children, onPress, style }: Props) {
  return (
    <Pressable onPress={onPress} disabled={onPress === undefined}>
      {({ pressed }) => (
        <LinearGradient
          colors={gradienteHero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.card, pressed && styles.cardPremuta, style]}
        >
          {children}
        </LinearGradient>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: raggio.lg,
    padding: 24,
  },
  cardPremuta: {
    opacity: 0.9,
  },
});
