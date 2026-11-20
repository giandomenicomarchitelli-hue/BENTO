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
            <Text style={styles.titolo}>Supermercati da mostrare</Text>

            <View style={styles.rigaAzioniRapide}>
              <Pressable onPress={() => setScelta(new Set(catene))} hitSlop={6}>
                <Text style={styles.azioneRapida}>Tutti</Text>
              </Pressable>
              <Pressable onPress={() => setScelta(new Set())} hitSlop={6}>
                <Text style={styles.azioneRapida}>Nessuno</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.elenco} contentContainerStyle={styles.elencoContenuto}>
              {catene.map((catena) => {
                const selezionata = scelta.has(catena);
                return (
                  <Pressable key={catena} onPress={() => alterna(catena)} style={styles.riga} hitSlop={4}>
                    <View style={[styles.casella, selezionata && styles.casellaSelezionata]}>
                      {selezionata && <Feather name="check" size={14} color={colori.crema} />}
                    </View>
                    <Text style={styles.nomeCatena}>{catena}</Text>
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
    width: 300,
    maxHeight: '75%',
    gap: 14,
  },
  titolo: {
    ...pesi.extraBold,
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: colori.soft,
    textAlign: 'center',
  },
  rigaAzioniRapide: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  azioneRapida: {
    ...pesi.bold,
    fontSize: 12.5,
    color: colori.scuro,
    textDecorationLine: 'underline',
  },
  elenco: {
    flexGrow: 0,
  },
  elencoContenuto: {
    gap: 2,
  },
  riga: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  casella: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colori.scuro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  casellaSelezionata: {
    backgroundColor: colori.scuro,
  },
  nomeCatena: {
    ...pesi.semiBold,
    fontSize: 14.5,
    color: colori.scuro,
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
