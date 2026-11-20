import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BloccoDuro } from '@/components/BloccoDuro';
import { coloriNB as colori, pesiNB as pesi } from '@/theme/neoBrutalista';

type Props = {
  visibile: boolean;
  /** Tutte le catene presenti tra le offerte attive, in ordine alfabetico. */
  catene: string[];
  /** null/vuoto = nessun filtro: tutte le catene sono considerate selezionate. */
  selezionate: string[] | null;
  onSalva: (selezione: string[] | null) => void;
  onChiudi: () => void;
};

/**
 * Scelta di gruppo di quali catene di supermercato mostrare tra le offerte.
 * Se alla chiusura risultano selezionate tutte le catene disponibili, si
 * salva null (nessun filtro) invece dell'elenco esplicito: così una nuova
 * catena coperta in futuro da volantini-platform appare subito, senza che
 * il gruppo debba riaprire questa schermata per includerla.
 *
 * Nota: il chiamante deve passare `key={visibile}` (o equivalente) perché
 * lo stato locale della selezione si reinizializzi da `selezionate` ad ogni
 * apertura - invece di un useEffect che richiamerebbe setState al mount.
 */
export function SelettoreSupermercati({ visibile, catene, selezionate, onSalva, onChiudi }: Props) {
  const [scelta, setScelta] = useState<Set<string>>(
    () => new Set(selezionate === null || selezionate.length === 0 ? catene : selezionate)
  );

  function alterna(catena: string) {
    setScelta((precedente) => {
      const nuova = new Set(precedente);
      if (nuova.has(catena)) {
        nuova.delete(catena);
      } else {
        nuova.add(catena);
      }
      return nuova;
    });
  }

  function salva() {
    onSalva(scelta.size === catene.length ? null : [...scelta]);
    onChiudi();
  }

  return (
    <Modal visible={visibile} transparent animationType="fade" onRequestClose={onChiudi}>
      <Pressable style={styles.sfondo} onPress={onChiudi}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <BloccoDuro offset={3} colore={colori.panna} raggio={18} contenutoStyle={styles.pannello}>
            <View style={styles.intestazione}>
              <Text style={styles.titolo}>Supermercati da mostrare</Text>
              <Text style={styles.conteggio}>
                {scelta.size} di {catene.length} selezionati
              </Text>
            </View>

            <View style={styles.rigaAzioniRapide}>
              <Pressable onPress={() => setScelta(new Set(catene))} hitSlop={4} style={styles.azioneRapida}>
                <Text style={styles.testoAzioneRapida}>Tutti</Text>
              </Pressable>
              <Pressable onPress={() => setScelta(new Set())} hitSlop={4} style={styles.azioneRapida}>
                <Text style={styles.testoAzioneRapida}>Nessuno</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.elenco} contentContainerStyle={styles.griglia}>
              {catene.map((catena) => {
                const selezionata = scelta.has(catena);
                return (
                  <Pressable
                    key={catena}
                    onPress={() => alterna(catena)}
                    style={[styles.chip, selezionata && styles.chipSelezionato]}
                    hitSlop={2}
                  >
                    {selezionata && <Feather name="check" size={13} color={colori.panna} />}
                    <Text style={[styles.testoChip, selezionata && styles.testoChipSelezionato]}>{catena}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Pressable onPress={salva}>
              <BloccoDuro offset={2.5} colore={colori.corallo} raggio={12} contenutoStyle={styles.bottoneSalva}>
                <Text style={styles.testoBottoneSalva}>Salva</Text>
              </BloccoDuro>
            </Pressable>
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
    width: 320,
    maxHeight: '78%',
    gap: 14,
  },
  intestazione: {
    gap: 3,
  },
  titolo: {
    ...pesi.extraBold,
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: colori.soft,
    textAlign: 'center',
  },
  conteggio: {
    ...pesi.bold,
    fontSize: 12.5,
    color: colori.scuro,
    textAlign: 'center',
  },
  rigaAzioniRapide: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  azioneRapida: {
    borderWidth: 2,
    borderColor: colori.scuro,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  testoAzioneRapida: {
    ...pesi.extraBold,
    fontSize: 11.5,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colori.scuro,
  },
  elenco: {
    flexGrow: 0,
  },
  griglia: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    borderColor: colori.scuro,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 8,
    backgroundColor: colori.crema,
  },
  chipSelezionato: {
    backgroundColor: colori.viola,
  },
  testoChip: {
    ...pesi.bold,
    fontSize: 13,
    color: colori.scuro,
  },
  testoChipSelezionato: {
    ...pesi.extraBold,
    color: colori.panna,
  },
  bottoneSalva: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testoBottoneSalva: {
    ...pesi.extraBold,
    fontSize: 12,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: '#fff',
  },
});
