import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function SceltaOnboarding() {
  return (
    <View style={styles.contenitore}>
      <Text style={styles.titolo}>Benvenuto</Text>
      <Text style={styles.sottotitolo}>
        Per iniziare, crea un gruppo nuovo oppure unisciti a uno esistente con un codice invito.
      </Text>

      <Link href="/onboarding/crea-gruppo" style={styles.bottone}>
        Crea un gruppo
      </Link>

      <Link href="/onboarding/unisciti-a-gruppo" style={styles.bottoneSecondario}>
        Ho un codice invito
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  contenitore: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  titolo: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
  },
  sottotitolo: {
    fontSize: 15,
    textAlign: 'center',
    color: '#555',
    marginBottom: 12,
  },
  bottone: {
    backgroundColor: '#2d6cdf',
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    borderRadius: 8,
    paddingVertical: 14,
    textAlign: 'center',
    overflow: 'hidden',
  },
  bottoneSecondario: {
    textAlign: 'center',
    marginTop: 8,
    color: '#2d6cdf',
    fontSize: 15,
  },
});
