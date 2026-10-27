import { Pressable, StyleSheet, Text, View } from 'react-native';

import { celleGrigliaMese } from '@/calcolo/griglioMensile';
import { accenti, bento, raggio, spaziatura, tipografia } from '@/theme/tokens';

type Props = {
  annoMeseISO: string;
  occorrenzePerGiorno: Record<string, number>;
  giornoSelezionato: string | null;
  onSelezionaGiorno: (dataISO: string) => void;
};

const INIZIALI_GIORNI = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

/**
 * Griglia mensile del calendario: intestazione lun-dom + righe di 7 celle
 * da `celleGrigliaMese`. Il tocco su una cella (anche fuori mese, per
 * scorrere al mese adiacente) è sempre riportato allo schermo chiamante:
 * questo componente non decide da solo di cambiare `annoMeseISO`.
 */
export function CalendarioGriglia({
  annoMeseISO,
  occorrenzePerGiorno,
  giornoSelezionato,
  onSelezionaGiorno,
}: Props) {
  const celle = celleGrigliaMese(annoMeseISO);

  return (
    <View>
      <View style={styles.riga}>
        {INIZIALI_GIORNI.map((iniziale) => (
          <View key={iniziale} style={styles.cella}>
            <Text style={styles.testoIntestazione}>{iniziale}</Text>
          </View>
        ))}
      </View>

      {Array.from({ length: celle.length / 7 }, (_, indiceSettimana) => (
        <View key={indiceSettimana} style={styles.riga}>
          {celle.slice(indiceSettimana * 7, indiceSettimana * 7 + 7).map((cella) => {
            const selezionata = cella.dataISO === giornoSelezionato;
            const haOccorrenze = (occorrenzePerGiorno[cella.dataISO] ?? 0) > 0;
            const giorno = Number(cella.dataISO.slice(8, 10));

            return (
              <Pressable
                key={cella.dataISO}
                onPress={() => onSelezionaGiorno(cella.dataISO)}
                style={[styles.cella, styles.giorno, selezionata && styles.giornoSelezionato]}
              >
                <Text
                  style={[
                    styles.testoGiorno,
                    !cella.delMeseCorrente && styles.testoFuoriMese,
                    selezionata && styles.testoSelezionato,
                  ]}
                >
                  {giorno}
                </Text>
                {haOccorrenze && <View style={styles.puntino} />}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  riga: {
    flexDirection: 'row',
  },
  cella: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testoIntestazione: {
    ...tipografia.didascalia,
    color: bento.testoMuto,
    paddingVertical: spaziatura.sm,
  },
  giorno: {
    aspectRatio: 1,
    borderRadius: raggio.md,
    marginVertical: 2,
  },
  giornoSelezionato: {
    backgroundColor: bento.superficieTranslucida,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: accenti.indaco,
  },
  testoGiorno: {
    ...tipografia.corpo,
    color: bento.testoPrimario,
  },
  testoFuoriMese: {
    color: bento.testoMuto,
    opacity: 0.6,
  },
  testoSelezionato: {
    color: accenti.indaco,
    fontWeight: '700',
  },
  puntino: {
    position: 'absolute',
    bottom: 6,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: accenti.indaco,
  },
});
