import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BloccoDuro } from '@/components/BloccoDuro';
import { coloriNB, pesiNB } from '@/theme/neoBrutalista';

/**
 * Altezza del solo contenuto della barra (senza la safe area, aggiunta a
 * parte): serve alle schermate per lo spazio da lasciare in fondo allo
 * ScrollView.
 */
export const ALTEZZA_BARRA = 64;

/**
 * Ingombro vero della barra, safe area inclusa - `paddingTop` della barra
 * (9) + la stessa safe area che applica a se stessa qui sotto
 * (`Math.max(insets.bottom, 16) + 12`), con qualche px in più di margine
 * piuttosto che tagliare per un pixel. Usare questa, non
 * `ALTEZZA_BARRA + un numero fisso`, per il `paddingBottom` dello
 * ScrollView delle tre schermate che la mostrano: un numero fisso non
 * scala con la safe area del device e tagliava l'ultima parte del
 * contenuto sugli schermi con home indicator (dove insets.bottom, 34pt
 * circa, supera il margine fisso che si usava prima).
 */
export function altezzaBarraConSafeArea(insetsBottom: number): number {
  return ALTEZZA_BARRA + Math.max(insetsBottom, 16) + 21;
}

type VoceAttiva = 'home' | 'personale' | 'gruppi';

/**
 * La barra inferiore, unica per tutte le schermate che la mostrano.
 *
 * Era copiata in ogni schermata: in due occasioni la stessa correzione
 * (prima lo spazio per la safe area, poi "PERSONALE" che andava a capo)
 * e' dovuta essere applicata in piu' file. La voce attiva e' l'unica
 * differenza fra una copia e l'altra, quindi e' una prop.
 *
 * SALDI non ha ancora una schermata: resta senza collegamento.
 */
export function BarraInferiore({ attiva }: { attiva: VoceAttiva }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.barra, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
      <View style={styles.voci}>
        <Voce
          attiva={attiva === 'home'}
          icona="home"
          etichetta="HOME"
          colore={coloriNB.menta}
          onPress={() => router.push('/')}
        />
        <Voce
          attiva={attiva === 'personale'}
          icona="user"
          etichetta="PERSONALE"
          colore={coloriNB.viola}
          onPress={() => router.push('/personale')}
        />
        <Pressable
          style={[styles.voce, styles.voceCentrale]}
          onPress={() => router.push('/assistente')}
        >
          <BloccoDuro
            offset={2.5}
            colore={coloriNB.corallo}
            raggio={999}
            contenutoStyle={styles.bottoneScrivi}
          >
            <Feather name="edit-3" size={22} color="#fff" />
          </BloccoDuro>
          <Text style={styles.etichetta} numberOfLines={1}>
            SCRIVI
          </Text>
        </Pressable>
        <Voce
          attiva={attiva === 'gruppi'}
          icona="users"
          etichetta="GRUPPI"
          colore={coloriNB.menta}
          onPress={() => router.push('/gruppi')}
        />
        <View style={styles.voce}>
          <Feather name="credit-card" size={21} color={coloriNB.scuro} />
          <Text style={styles.etichetta} numberOfLines={1}>
            SALDI
          </Text>
        </View>
      </View>
    </View>
  );
}

/** La voce attiva non e' premibile: ci siamo gia'. */
function Voce({
  attiva,
  icona,
  etichetta,
  colore,
  onPress,
}: {
  attiva: boolean;
  icona: React.ComponentProps<typeof Feather>['name'];
  etichetta: string;
  colore: string;
  onPress: () => void;
}) {
  const contenuto = (
    <>
      {attiva ? (
        <BloccoDuro offset={1.5} colore={colore} raggio={9} contenutoStyle={styles.chipAttivo}>
          <Feather name={icona} size={16} color={coloriNB.scuro} />
        </BloccoDuro>
      ) : (
        <Feather name={icona} size={21} color={coloriNB.scuro} />
      )}
      <Text style={styles.etichetta} numberOfLines={1}>
        {etichetta}
      </Text>
    </>
  );

  if (attiva) {
    return <View style={styles.voce}>{contenuto}</View>;
  }
  return (
    <Pressable style={styles.voce} onPress={onPress}>
      {contenuto}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  barra: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: coloriNB.crema,
    borderTopWidth: 2.5,
    borderTopColor: coloriNB.scuro,
    paddingTop: 9,
    paddingHorizontal: 6,
  },
  voci: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  voce: {
    width: 66,
    alignItems: 'center',
    gap: 5,
  },
  etichetta: {
    ...pesiNB.extraBold,
    fontSize: 8.5,
    letterSpacing: 0.4,
    color: coloriNB.scuro,
  },
  chipAttivo: {
    width: 44,
    height: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voceCentrale: {
    marginTop: -18,
  },
  bottoneScrivi: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
