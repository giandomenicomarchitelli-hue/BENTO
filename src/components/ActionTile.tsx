import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colori, raggio, spaziatura } from '@/theme/tokens';

type Props = {
  icona: keyof typeof Feather.glyphMap;
  titolo: string;
  sottotitolo?: string;
  variante?: 'primaria' | 'secondaria';
  onPress: () => void;
};

/** Azione principale in evidenza nella dashboard (es. "Lista della spesa", "Saldi e spese"). */
export function ActionTile({ icona, titolo, sottotitolo, variante = 'secondaria', onPress }: Props) {
  const primaria = variante === 'primaria';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        primaria ? styles.tilePrimaria : styles.tileSecondaria,
        pressed && styles.tilePremuta,
      ]}
    >
      <View style={[styles.iconaContenitore, primaria ? styles.iconaPrimaria : styles.iconaSecondaria]}>
        <Feather name={icona} size={18} color={primaria ? '#fff' : colori.blu600} />
      </View>
      <View>
        <Text style={[styles.titolo, primaria && styles.testoChiaro]}>{titolo}</Text>
        {sottotitolo !== undefined && (
          <Text style={[styles.sottotitolo, primaria ? styles.testoChiaro : styles.sottotitoloSecondario]}>
            {sottotitolo}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 14,
    padding: spaziatura.xl - 2,
    borderRadius: raggio.lg,
    minHeight: 128,
  },
  tilePrimaria: {
    backgroundColor: colori.blu600,
  },
  tileSecondaria: {
    backgroundColor: colori.superficie,
    borderWidth: 1,
    borderColor: colori.inchiostro150,
  },
  tilePremuta: {
    opacity: 0.85,
  },
  iconaContenitore: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconaPrimaria: {
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  iconaSecondaria: {
    backgroundColor: colori.blu50,
  },
  titolo: {
    fontSize: 16,
    fontWeight: '600',
    color: colori.inchiostro900,
  },
  sottotitolo: {
    marginTop: 2,
    fontSize: 12.5,
    fontWeight: '500',
  },
  sottotitoloSecondario: {
    color: colori.inchiostro500,
  },
  testoChiaro: {
    color: '#fff',
  },
});
