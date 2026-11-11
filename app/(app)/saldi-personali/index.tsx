import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BloccoDuro } from '@/components/BloccoDuro';
import { PARETE } from '@/components/Vassoio';
import { useSaldiAggregati, type SaldoPersona } from '@/hooks/useSaldiAggregati';
import { formattaEuro } from '@/lib/formato';
import { coloreCiclico, coloriNB as colori, pesiNB as pesi, soldiNB } from '@/theme/neoBrutalista';

export default function SaldiPersonali() {
  const insets = useSafeAreaInsets();
  const { persone, isLoading } = useSaldiAggregati();

  function tornaIndietro() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/personale');
    }
  }

  function apriPersona(persona: SaldoPersona) {
    router.push({
      pathname: '/saldi-personali/[utenteId]',
      params: { utenteId: persona.utenteId, nome: persona.nome },
    });
  }

  return (
    <View style={styles.schermo}>
      <ScrollView
        contentContainerStyle={[
          styles.contenuto,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
        ]}
      >
        <View style={styles.rigaTitolo}>
          <Pressable onPress={tornaIndietro} hitSlop={8}>
            <BloccoDuro offset={2} colore={colori.panna} raggio={10} contenutoStyle={styles.quadrato}>
              <Feather name="arrow-left" size={17} color={colori.scuro} />
            </BloccoDuro>
          </Pressable>
          <Text style={styles.titolo}>Saldi personali</Text>
        </View>

        <Text style={styles.sottotitolo}>
          Saldo netto con ogni persona, sommato su tutti i gruppi in comune.
        </Text>

        {isLoading ? (
          <ActivityIndicator color={colori.scuro} style={styles.caricamento} />
        ) : persone.length === 0 ? (
          <View style={styles.statoVuoto}>
            <Text style={styles.inPari}>Sei in pari con tutti! 🎉</Text>
          </View>
        ) : (
          <BloccoDuro offset={4} colore={colori.scuro} raggio={16} contenutoStyle={styles.elenco}>
            <View style={styles.righe}>
              {persone.map((persona) => {
                const miDeve = persona.nettoCentesimi > 0;
                return (
                  <Pressable key={persona.utenteId} style={styles.riga} onPress={() => apriPersona(persona)}>
                    <View style={[styles.cerchietto, { backgroundColor: coloreCiclico(persona.utenteId) }]}>
                      <Text style={styles.inizialeCerchietto}>{persona.nome.charAt(0).toUpperCase()}</Text>
                    </View>
                    <Text style={styles.testo} numberOfLines={1}>
                      {miDeve ? (
                        <>
                          <Text style={pesi.extraBold}>{persona.nome}</Text> ti deve
                        </>
                      ) : (
                        <>
                          Devi a <Text style={pesi.extraBold}>{persona.nome}</Text>
                        </>
                      )}
                    </Text>
                    <Text style={[styles.importo, { color: miDeve ? soldiNB.credito : soldiNB.debito }]}>
                      {formattaEuro(Math.abs(persona.nettoCentesimi))}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </BloccoDuro>
        )}
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
  sottotitolo: {
    fontSize: 12,
    fontWeight: '600',
    color: colori.soft,
  },
  caricamento: {
    marginTop: 20,
  },
  statoVuoto: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  inPari: {
    ...pesi.extraBold,
    fontSize: 16,
    color: colori.scuro,
  },
  elenco: {
    borderRadius: 16 - 2.5,
    overflow: 'hidden',
    backgroundColor: colori.scuro,
  },
  righe: {
    gap: PARETE,
    backgroundColor: colori.scuro,
  },
  riga: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colori.panna,
    paddingVertical: 11,
    paddingHorizontal: 12,
    gap: 10,
  },
  cerchietto: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colori.scuro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inizialeCerchietto: {
    ...pesi.extraBold,
    fontSize: 10,
    color: colori.scuro,
  },
  testo: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colori.scuro,
  },
  importo: {
    ...pesi.extraBold,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
});
