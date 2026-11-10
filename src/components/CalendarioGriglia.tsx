import { StyleSheet, Text, View } from 'react-native';

import { celleGrigliaMese } from '@/calcolo/griglioMensile';
import { dataLocaleISO } from '@/calcolo/ricorrenzaFaccende';
import { CellaVassoio } from '@/components/CellaVassoio';
import { PARETE, Vassoio } from '@/components/Vassoio';
import { coloriNB, pesiNB } from '@/theme/neoBrutalista';

type Props = {
  annoMeseISO: string;
  occorrenzePerGiorno: Record<string, number>;
  giornoSelezionato: string | null;
  onSelezionaGiorno: (dataISO: string) => void;
};

const INIZIALI_GIORNI = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];

/**
 * Griglia mensile: intestazione lun-dom fuori dalle pareti (è
 * un'etichetta di colonna, non un dato), poi un `Vassoio` di 42
 * `CellaVassoio` - stessa tecnica a gap-parete del feed di Home, non il
 * mosaico a scomparti.
 *
 * "Oggi" si calcola qui, nel fuso orario del dispositivo: è un dato
 * sempre vero per la griglia indipendentemente da quale fuso usino le
 * occorrenze mostrate sopra, quindi non serve passarlo da fuori - le due
 * schermate chiamanti restano invariate.
 */
export function CalendarioGriglia({
  annoMeseISO,
  occorrenzePerGiorno,
  giornoSelezionato,
  onSelezionaGiorno,
}: Props) {
  const celle = celleGrigliaMese(annoMeseISO);
  const oggiISO = dataLocaleISO(new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone);

  return (
    <View>
      <View style={styles.intestazione}>
        {INIZIALI_GIORNI.map((iniziale, indice) => (
          // indice in key: L/M/M/G/V/S/D ha due lettere ripetute.
          <View key={`${iniziale}-${indice}`} style={styles.celaIntestazione}>
            <Text style={styles.testoIntestazione}>{iniziale}</Text>
          </View>
        ))}
      </View>

      <Vassoio>
        <View style={styles.griglia}>
          {Array.from({ length: celle.length / 7 }, (_, indiceSettimana) => (
            <View key={indiceSettimana} style={styles.riga}>
              {celle.slice(indiceSettimana * 7, indiceSettimana * 7 + 7).map((cella) => (
                <CellaVassoio
                  key={cella.dataISO}
                  dataISO={cella.dataISO}
                  giorno={Number(cella.dataISO.slice(8, 10))}
                  delMeseCorrente={cella.delMeseCorrente}
                  oggi={cella.dataISO === oggiISO}
                  selezionata={cella.dataISO === giornoSelezionato}
                  haOccorrenze={(occorrenzePerGiorno[cella.dataISO] ?? 0) > 0}
                  onPress={() => onSelezionaGiorno(cella.dataISO)}
                />
              ))}
            </View>
          ))}
        </View>
      </Vassoio>
    </View>
  );
}

const styles = StyleSheet.create({
  intestazione: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  celaIntestazione: {
    flex: 1,
    alignItems: 'center',
  },
  testoIntestazione: {
    ...pesiNB.extraBold,
    fontSize: 8.5,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: coloriNB.soft,
  },
  griglia: {
    gap: PARETE,
    backgroundColor: coloriNB.scuro,
  },
  riga: {
    flexDirection: 'row',
    gap: PARETE,
  },
});
