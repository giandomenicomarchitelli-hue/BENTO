import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Fragment } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BloccoDuro } from '@/components/BloccoDuro';
import { useColoriCaselleStore } from '@/store/coloriCaselleStore';
import { CASELLE_PERSONALIZZABILI, PALETTE_CASELLE } from '@/theme/caselle';
import { coloriNB as colori, pesiNB as pesi } from '@/theme/neoBrutalista';

/**
 * Preferenza personale (vedi coloriCaselleStore.ts): niente da salvare o
 * annullare, ogni tocco su un colore si applica subito - come un
 * selettore di tema, non un form.
 */
export default function PersonalizzaColori() {
  const insets = useSafeAreaInsets();
  const coloriCaselle = useColoriCaselleStore((stato) => stato.coloriCaselle);
  const impostaColoreCasella = useColoriCaselleStore((stato) => stato.impostaColoreCasella);
  const resetColoreCasella = useColoriCaselleStore((stato) => stato.resetColoreCasella);

  function tornaIndietro() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/profilo');
    }
  }

  const sezioni = Array.from(new Set(CASELLE_PERSONALIZZABILI.map((c) => c.sezione)));

  return (
    <View style={styles.schermo}>
      <ScrollView
        contentContainerStyle={[styles.contenuto, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
      >
        <View style={styles.rigaTitolo}>
          <Pressable onPress={tornaIndietro} hitSlop={8}>
            <BloccoDuro offset={2} colore={colori.panna} raggio={10} contenutoStyle={styles.quadrato}>
              <Feather name="arrow-left" size={17} color={colori.scuro} />
            </BloccoDuro>
          </Pressable>
          <Text style={styles.titolo}>Personalizza i colori</Text>
        </View>
        <Text style={styles.suggerimento}>
          Vale solo per te, su questo dispositivo: gli altri membri dei tuoi gruppi continuano a vedere i colori di
          sempre.
        </Text>

        {sezioni.map((sezione) => (
          <Fragment key={sezione}>
            <Text style={styles.etichettaSezione}>{sezione}</Text>
            <BloccoDuro offset={3} colore={colori.panna} raggio={16} contenutoStyle={styles.pannello}>
              {CASELLE_PERSONALIZZABILI.filter((c) => c.sezione === sezione).map((casella) => {
                const coloreAttuale = coloriCaselle[casella.chiave] ?? casella.coloreDefault;
                return (
                  <View key={casella.chiave} style={styles.riga}>
                    <Text style={styles.nomeCasella}>{casella.etichetta}</Text>
                    <View style={styles.palette}>
                      {PALETTE_CASELLE.map((coloreOpzione) => (
                        <Pressable
                          key={coloreOpzione}
                          onPress={() => impostaColoreCasella(casella.chiave, coloreOpzione)}
                          hitSlop={6}
                          style={[
                            styles.pallino,
                            { backgroundColor: coloreOpzione },
                            coloreAttuale === coloreOpzione && styles.pallinoSelezionato,
                          ]}
                        >
                          {coloreAttuale === coloreOpzione && (
                            <Feather name="check" size={14} color={colori.scuro} />
                          )}
                        </Pressable>
                      ))}
                      {coloriCaselle[casella.chiave] !== undefined && (
                        <Pressable onPress={() => resetColoreCasella(casella.chiave)} hitSlop={8}>
                          <Text style={styles.ripristina}>Ripristina</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                );
              })}
            </BloccoDuro>
          </Fragment>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  schermo: {
    flex: 1,
    backgroundColor: colori.crema,
  },
  contenuto: {
    paddingHorizontal: 16,
    gap: 14,
  },
  rigaTitolo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  quadrato: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titolo: {
    ...pesi.extraBold,
    fontSize: 18,
    letterSpacing: -0.3,
    color: colori.scuro,
  },
  suggerimento: {
    ...pesi.bold,
    fontSize: 12.5,
    color: colori.soft,
  },
  etichettaSezione: {
    ...pesi.extraBold,
    fontSize: 11,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: colori.soft,
    marginTop: 6,
  },
  pannello: {
    gap: 14,
  },
  riga: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  nomeCasella: {
    ...pesi.bold,
    fontSize: 14,
    color: colori.scuro,
  },
  palette: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pallino: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colori.scuro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pallinoSelezionato: {
    borderWidth: 3,
  },
  ripristina: {
    ...pesi.bold,
    fontSize: 11,
    color: colori.soft,
    marginLeft: 2,
  },
});
