import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { bento } from '@/theme/tokens';

type Props = {
  membri: { id: string; nome: string }[];
  massimoVisibile?: number;
  onPress?: () => void;
};

/**
 * Riga orizzontale di avatar dei membri attivi di un gruppo (iniziali, nessuna
 * foto profilo nel modello dati). Oltre `massimoVisibile` mostra un pallino
 * "+N" invece di continuare ad aggiungere cerchi.
 */
export function MemberAvatarRow({ membri, massimoVisibile = 6, onPress }: Props) {
  const visibili = membri.slice(0, massimoVisibile);
  const altri = membri.length - visibili.length;

  return (
    <Pressable onPress={onPress} disabled={onPress === undefined} style={styles.riga}>
      {visibili.map((membro, indice) => (
        <View key={membro.id} style={[styles.cerchio, indice > 0 && styles.sovrapposto]}>
          <Avatar nome={membro.nome} dimensione={36} />
        </View>
      ))}
      {altri > 0 && (
        <View style={[styles.cerchio, styles.sovrapposto, styles.extra]}>
          <Text style={styles.testoExtra}>+{altri}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  riga: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cerchio: {
    borderRadius: 999,
    borderWidth: 2,
    borderColor: bento.sfondo,
  },
  sovrapposto: {
    marginLeft: -10,
  },
  extra: {
    width: 36,
    height: 36,
    backgroundColor: bento.superficieForte,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testoExtra: {
    fontSize: 12,
    fontWeight: '700',
    color: bento.testoSecondario,
  },
});
