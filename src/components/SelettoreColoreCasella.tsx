import { Feather } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { BloccoDuro } from '@/components/BloccoDuro';
import { useColoriCaselleStore } from '@/store/coloriCaselleStore';
import { CASELLE_PERSONALIZZABILI, PALETTE_CASELLE } from '@/theme/caselle';
import { coloriNB as colori, pesiNB as pesi } from '@/theme/neoBrutalista';

/**
 * Selettore colore aperto con un tocco lungo sulla casella stessa (vedi
 * Scomparto.onLongPress) invece di una schermata di impostazioni a parte:
 * un tocco su un colore sceglie e chiude, non serve altro.
 */
export function SelettoreColoreCasella({ chiave, onChiudi }: { chiave: string | null; onChiudi: () => void }) {
  const coloriCaselle = useColoriCaselleStore((stato) => stato.coloriCaselle);
  const impostaColoreCasella = useColoriCaselleStore((stato) => stato.impostaColoreCasella);
  const resetColoreCasella = useColoriCaselleStore((stato) => stato.resetColoreCasella);

  const casella = CASELLE_PERSONALIZZABILI.find((c) => c.chiave === chiave);
  const coloreAttuale = casella === undefined ? null : (coloriCaselle[casella.chiave] ?? casella.coloreDefault);
  const personalizzata = casella !== undefined && coloriCaselle[casella.chiave] !== undefined;

  return (
    <Modal visible={casella !== undefined} transparent animationType="fade" onRequestClose={onChiudi}>
      <Pressable style={styles.sfondo} onPress={onChiudi}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <BloccoDuro offset={3} colore={colori.panna} raggio={18} contenutoStyle={styles.pannello}>
            <Text style={styles.titolo}>{casella?.etichetta}</Text>
            <View style={styles.griglia}>
              {PALETTE_CASELLE.map((coloreOpzione) => (
                <Pressable
                  key={coloreOpzione}
                  onPress={() => {
                    if (casella !== undefined) {
                      impostaColoreCasella(casella.chiave, coloreOpzione);
                    }
                    onChiudi();
                  }}
                  hitSlop={6}
                  style={[
                    styles.pallino,
                    { backgroundColor: coloreOpzione },
                    coloreAttuale === coloreOpzione && styles.pallinoSelezionato,
                  ]}
                >
                  {coloreAttuale === coloreOpzione && <Feather name="check" size={16} color={colori.scuro} />}
                </Pressable>
              ))}
            </View>
            {personalizzata && (
              <Pressable
                onPress={() => {
                  if (casella !== undefined) {
                    resetColoreCasella(casella.chiave);
                  }
                  onChiudi();
                }}
                hitSlop={8}
                style={styles.ripristinaContenitore}
              >
                <Text style={styles.ripristina}>Ripristina il colore originale</Text>
              </Pressable>
            )}
          </BloccoDuro>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sfondo: {
    flex: 1,
    backgroundColor: 'rgba(22,20,18,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  pannello: {
    width: 280,
    gap: 16,
  },
  titolo: {
    ...pesi.extraBold,
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: colori.soft,
    textAlign: 'center',
  },
  griglia: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  pallino: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colori.scuro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pallinoSelezionato: {
    borderWidth: 3,
  },
  ripristinaContenitore: {
    alignItems: 'center',
  },
  ripristina: {
    ...pesi.bold,
    fontSize: 12.5,
    color: colori.soft,
  },
});
