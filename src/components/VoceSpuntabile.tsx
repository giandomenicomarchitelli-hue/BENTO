import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formattaEuro } from '@/lib/formato';
import { coloreCiclico, coloriNB, pesiNB } from '@/theme/neoBrutalista';

type Props = {
  testo: string;
  fatto: boolean;
  nota?: string | null;
  /** Solo lista-spesa: chi e quanto, quando comprato. */
  acquirente?: { nome: string | null; prezzoCentesimi: number | null } | null;
  /** Voce "con prezzi" già fatta (solo liste del gruppo): tocco diretto
   *  disabilitato, resta solo il menu per modificare/riaprire. */
  bloccata?: boolean;
  onTocca: () => void;
  onApriModifica: () => void;
  onElimina: () => void;
};

/**
 * Una voce spuntabile, condivisa da lista della spesa, liste del gruppo e
 * liste personali (vedi HANDOFF 9.1): un solo componente, tre varianti
 * dello stesso corpo. Vive sempre dentro un BloccoDuro scuro con gap:2 -
 * è una parete, mai da sola (vedi lista-spesa.tsx/liste/[id].tsx).
 */
export function VoceSpuntabile({ testo, fatto, nota, acquirente, bloccata, onTocca, onApriModifica }: Props) {
  const corpo = (
    <>
      <View style={[styles.casella, fatto && styles.casellaFatta]}>
        {fatto && <Feather name="check" size={13} color={coloriNB.scuro} />}
      </View>
      <View style={styles.testi}>
        <Text style={[styles.testo, fatto && styles.testoFatto]} numberOfLines={2}>
          {testo}
        </Text>
        {!fatto && nota !== null && nota !== undefined && nota !== '' && (
          <Text style={styles.nota} numberOfLines={1}>
            {nota}
          </Text>
        )}
        {fatto && acquirente !== null && acquirente !== undefined && (
          <View style={styles.rigaMeta}>
            {bloccata ? (
              <Feather name="lock" size={11} color={coloriNB.soft} />
            ) : (
              <View style={[styles.cerchietto, { backgroundColor: coloreCiclico(acquirente.nome ?? testo) }]} />
            )}
            <Text style={styles.meta} numberOfLines={1}>
              {acquirente.nome !== null ? `${acquirente.nome} · ` : ''}
              {acquirente.prezzoCentesimi !== null && (
                <Text style={styles.prezzo}>{formattaEuro(acquirente.prezzoCentesimi)}</Text>
              )}
            </Text>
          </View>
        )}
      </View>
    </>
  );

  return (
    <View style={styles.riga}>
      {bloccata ? (
        <View style={styles.contenuto}>{corpo}</View>
      ) : (
        <Pressable onPress={onTocca} style={styles.contenuto}>
          {corpo}
        </Pressable>
      )}
      <Pressable onPress={onApriModifica} hitSlop={10} style={styles.bottoneMenu}>
        <Feather name="more-vertical" size={15} color={coloriNB.soft} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  riga: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: coloriNB.panna,
    paddingVertical: 10,
    paddingHorizontal: 11,
    gap: 10,
  },
  contenuto: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  casella: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: coloriNB.scuro,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  casellaFatta: {
    backgroundColor: coloriNB.menta,
  },
  testi: {
    flex: 1,
    minWidth: 0,
  },
  testo: {
    ...pesiNB.bold,
    fontSize: 13.5,
    color: coloriNB.scuro,
  },
  testoFatto: {
    ...pesiNB.semiBold,
    textDecorationLine: 'line-through',
    color: coloriNB.soft,
  },
  nota: {
    fontSize: 11,
    color: coloriNB.soft,
    marginTop: 2,
  },
  rigaMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  cerchietto: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: coloriNB.scuro,
  },
  meta: {
    ...pesiNB.semiBold,
    fontSize: 10.5,
    color: coloriNB.soft,
  },
  prezzo: {
    ...pesiNB.extraBold,
    color: coloriNB.scuro,
  },
  bottoneMenu: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
