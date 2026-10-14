import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import type { Gruppo } from '@/api/gruppi';
import { GlassCard } from '@/components/GlassCard';
import { IconBadge } from '@/components/IconBadge';
import { accenti, bento, tipografia } from '@/theme/tokens';

type Props = {
  gruppo: Pick<Gruppo, 'nome' | 'tipo'>;
  onPress: () => void;
};

const perTipo: Record<Gruppo['tipo'], { icona: keyof typeof Feather.glyphMap; colore: string; etichetta: string }> = {
  casa: { icona: 'home', colore: accenti.menta, etichetta: 'Casa' },
  viaggio: { icona: 'map-pin', colore: accenti.ciano, etichetta: 'Viaggio' },
  ufficio: { icona: 'briefcase', colore: accenti.indaco, etichetta: 'Ufficio' },
  altro: { icona: 'grid', colore: accenti.viola, etichetta: 'Altro' },
};

/** Anteprima di un gruppo reale (nome + tipo), un tocco per entrarci. */
export function GroupPreviewCard({ gruppo, onPress }: Props) {
  const stile = perTipo[gruppo.tipo];

  return (
    <GlassCard onPress={onPress} style={styles.card}>
      <View style={styles.riga}>
        <IconBadge icona={stile.icona} colore={stile.colore} dimensione={44} />
        <View style={styles.testi}>
          <Text style={styles.nome} numberOfLines={1}>
            {gruppo.nome}
          </Text>
          <Text style={styles.tipo}>{stile.etichetta}</Text>
        </View>
        <Feather name="chevron-right" size={18} color={bento.testoMuto} />
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
    gap: 14,
  },
  testi: {
    flex: 1,
  },
  nome: {
    ...tipografia.corpo,
    fontSize: 16,
    color: bento.testoPrimario,
  },
  tipo: {
    ...tipografia.corpoSecondario,
    color: bento.testoSecondario,
    marginTop: 2,
  },
});
