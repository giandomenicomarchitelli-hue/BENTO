import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { StyleSheet, Text, View } from 'react-native';

import type { Gruppo } from '@/api/gruppi';
import { GlassCard } from '@/components/GlassCard';
import { IconBadge } from '@/components/IconBadge';
import { accenti, bento, tipografia } from '@/theme/tokens';

type Props = {
  gruppo: Pick<Gruppo, 'nome' | 'tipo' | 'creato_il'>;
  onPress: () => void;
};

const perTipo: Record<Gruppo['tipo'], { icona: keyof typeof Feather.glyphMap; colore: string }> = {
  casa: { icona: 'home', colore: accenti.menta },
  viaggio: { icona: 'map-pin', colore: accenti.ciano },
  ufficio: { icona: 'briefcase', colore: accenti.indaco },
  altro: { icona: 'grid', colore: accenti.viola },
};

/** Icona e colore d'accento per il tipo di un gruppo - condivisa con GroupHeader. */
export function iconaPerTipoGruppo(tipo: Gruppo['tipo']) {
  return perTipo[tipo];
}

/**
 * Anteprima di un gruppo reale: il tipo resta leggibile dall'icona/colore,
 * mentre il testo secondario mostra da quando esiste il gruppo (dato già
 * nella riga caricata da useMieiGruppi, nessuna query in più) invece di
 * ripetere il tipo a parole.
 */
export function GroupPreviewCard({ gruppo, onPress }: Props) {
  const stile = iconaPerTipoGruppo(gruppo.tipo);
  const dal = format(new Date(gruppo.creato_il), 'd MMM yyyy', { locale: it });

  return (
    <GlassCard onPress={onPress} style={styles.card}>
      <View style={styles.riga}>
        <IconBadge icona={stile.icona} colore={stile.colore} dimensione={44} />
        <View style={styles.testi}>
          <Text style={styles.nome} numberOfLines={1}>
            {gruppo.nome}
          </Text>
          <Text style={styles.tipo}>Dal {dal}</Text>
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
