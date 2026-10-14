import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { accenti, elevazione, gradienti, raggio, spaziatura } from '@/theme/tokens';

type Azione = {
  etichetta: string;
  onPress: () => void;
  /** 'primaria' = pillola bianca piena, 'secondaria' = contorno translucido. Pensate per stare sul gradiente. */
  variante?: 'primaria' | 'secondaria';
};

type Props = {
  etichetta: string;
  valore: number | string;
  caricandoValore?: boolean;
  descrizione: string;
  azioni?: Azione[];
};

/**
 * Card in evidenza col gradiente di marchio, per una panoramica ad alto
 * livello in home (es. numero di gruppi). Mostra solo dati reali già
 * disponibili - niente cifre finanziarie inventate: se serve un punto
 * d'ingresso ai saldi personali, va in `azioni` come CTA ("Vedi saldi"),
 * non come numero su questa card.
 */
export function HeroBalanceCard({ etichetta, valore, caricandoValore, descrizione, azioni }: Props) {
  return (
    <View style={styles.ombra}>
      <LinearGradient colors={gradienti.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
        <Text style={styles.etichetta}>{etichetta.toUpperCase()}</Text>
        {caricandoValore ? (
          <ActivityIndicator color="#fff" style={styles.caricamento} />
        ) : (
          <Text style={styles.valore}>{valore}</Text>
        )}
        <Text style={styles.descrizione}>{descrizione}</Text>

        {azioni !== undefined && azioni.length > 0 && (
          <View style={styles.righeAzioni}>
            {azioni.map((azione) => (
              <Pressable
                key={azione.etichetta}
                onPress={azione.onPress}
                style={({ pressed }) => [
                  styles.pillola,
                  azione.variante === 'secondaria' ? styles.pillolaSecondaria : styles.pillolaPrimaria,
                  pressed && styles.premuta,
                ]}
              >
                <Text
                  style={
                    azione.variante === 'secondaria' ? styles.testoPillolaSecondaria : styles.testoPillolaPrimaria
                  }
                >
                  {azione.etichetta}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  ombra: {
    borderRadius: raggio.xl,
    ...elevazione.media,
  },
  card: {
    borderRadius: raggio.xl,
    padding: 20,
  },
  etichetta: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: 'rgba(255,255,255,0.8)',
  },
  valore: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginTop: 2,
  },
  caricamento: {
    alignSelf: 'flex-start',
    marginTop: spaziatura.xs,
  },
  descrizione: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  righeAzioni: {
    flexDirection: 'row',
    gap: spaziatura.sm,
    marginTop: spaziatura.md,
  },
  pillola: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: raggio.pillola,
  },
  pillolaPrimaria: {
    backgroundColor: '#fff',
  },
  pillolaSecondaria: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  premuta: {
    opacity: 0.85,
  },
  testoPillolaPrimaria: {
    fontSize: 14,
    fontWeight: '700',
    color: accenti.indaco,
  },
  testoPillolaSecondaria: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});
