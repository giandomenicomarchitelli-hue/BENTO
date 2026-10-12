import { StyleSheet, Text, View } from 'react-native';

export default function Home() {
  return (
    <View style={styles.contenitore}>
      <Text style={styles.titolo}>Gestione Casa</Text>
      <Text style={styles.sottotitolo}>
        Fase 1 in corso: lista della spesa e spese condivise con saldo.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contenitore: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  titolo: {
    fontSize: 24,
    fontWeight: '600',
  },
  sottotitolo: {
    fontSize: 15,
    textAlign: 'center',
    color: '#555',
  },
});
