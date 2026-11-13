import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { creaSpesa } from '@/api/spese';
import { BloccoDuro } from '@/components/BloccoDuro';
import { PARETE } from '@/components/Vassoio';
import { RiepilogoTimbrato } from '@/components/RiepilogoTimbrato';
import { useInvalidaMieiGruppi } from '@/hooks/useMieiGruppi';
import { useInvalidaSaldiAggregati, useSaldiAggregati } from '@/hooks/useSaldiAggregati';
import { confermaAzione } from '@/lib/conferma';
import { formattaEuro } from '@/lib/formato';
import { coloriNB as colori, pesiNB as pesi, soldiNB } from '@/theme/neoBrutalista';

export default function SaldoConPersona() {
  const insets = useSafeAreaInsets();
  const { utenteId, nome } = useLocalSearchParams<{ utenteId: string; nome?: string }>();
  const { persone, isLoading } = useSaldiAggregati();
  const invalidaSaldiAggregati = useInvalidaSaldiAggregati();
  const invalidaMieiGruppi = useInvalidaMieiGruppi();
  const queryClient = useQueryClient();
  const [saldando, setSaldando] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [timbrato, setTimbrato] = useState(false);
  // Gruppi già saldati con successo in questo tentativo: se un gruppo
  // successivo fallisce a metà ciclo, un nuovo tocco su "Salda tutto" non
  // deve ripagare quelli già registrati (persona.gruppi resta quello di
  // prima finché invalidaSaldiAggregati() non gira, cosa che succede solo
  // a fine ciclo completo).
  const [gruppiSaldati, setGruppiSaldati] = useState<Set<string>>(new Set());

  const persona = persone.find((p) => p.utenteId === utenteId);

  function tornaIndietro() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/saldi-personali');
    }
  }

  async function saldaTutto() {
    if (persona === undefined) {
      return;
    }
    const daFare = persona.gruppi.filter(
      (riga) => riga.importoCentesimi !== 0 && !gruppiSaldati.has(riga.gruppoId)
    );
    if (daFare.length === 0) {
      setTimbrato(true);
      return;
    }

    const conferma = await confermaAzione(
      `Saldare tutto con ${persona.nome}?`,
      `Registra un pagamento in ciascuno dei ${daFare.length} gruppi ${
        gruppiSaldati.size > 0 ? 'rimanenti' : 'in comune'
      }, così da azzerare il saldo - il totale che cambia mano è ${formattaEuro(
        daFare.reduce((somma, riga) => somma + Math.abs(riga.importoCentesimi), 0)
      )}.`,
      'Salda tutto'
    );
    if (!conferma) {
      return;
    }

    setErrore(null);
    setSaldando(true);
    try {
      for (const riga of daFare) {
        const ioSonoCreditore = riga.importoCentesimi > 0;
        await creaSpesa({
          gruppoId: riga.gruppoId,
          pagatoDa: ioSonoCreditore ? riga.altroMembroId : riga.ilMioMembroId,
          importoCentesimi: Math.abs(riga.importoCentesimi),
          descrizione: `Saldo con ${ioSonoCreditore ? 'te' : persona.nome}`,
          quote: [
            {
              membroId: ioSonoCreditore ? riga.ilMioMembroId : riga.altroMembroId,
              quotaCentesimi: Math.abs(riga.importoCentesimi),
            },
          ],
        });
        // Segnato subito dopo ogni spesa riuscita, non solo a fine ciclo: se
        // un gruppo successivo fallisce, un nuovo tocco su "Salda tutto" non
        // deve ripagare questo, già registrato.
        setGruppiSaldati((prev) => new Set(prev).add(riga.gruppoId));
      }
      await Promise.all([
        invalidaSaldiAggregati(),
        invalidaMieiGruppi(),
        ...daFare.map((riga) =>
          queryClient.invalidateQueries({ queryKey: ['spese', riga.gruppoId], refetchType: 'all' })
        ),
      ]);
      setTimbrato(true);
    } catch {
      setErrore(
        'Qualcosa è andato storto. I gruppi già saldati restano tali: tocca di nuovo "Salda tutto" per i rimanenti.'
      );
      setSaldando(false);
    }
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
          <Pressable onPress={tornaIndietro} hitSlop={8} disabled={timbrato}>
            <BloccoDuro offset={2} colore={colori.panna} raggio={10} contenutoStyle={styles.quadrato}>
              <Feather name="arrow-left" size={17} color={colori.scuro} />
            </BloccoDuro>
          </Pressable>
          <Text style={styles.titolo} numberOfLines={1}>
            {persona?.nome ?? nome ?? 'Saldo'}
          </Text>
        </View>

        {isLoading ? (
          <ActivityIndicator color={colori.scuro} style={styles.caricamento} />
        ) : persona === undefined ? (
          <View style={styles.statoVuoto}>
            <Text style={styles.inPari}>Sei in pari con {nome ?? 'questa persona'}.</Text>
          </View>
        ) : (
          <>
            {(() => {
              const miDeve = persona.nettoCentesimi > 0;
              return (
                <BloccoDuro offset={3.5} colore={colori.panna} raggio={17} contenutoStyle={styles.fasciaHero}>
                  <Text style={styles.etichettaHero}>
                    {miDeve ? `${persona.nome} ti deve` : `Devi a ${persona.nome}`}
                  </Text>
                  <Text style={[styles.cifraHero, { color: miDeve ? soldiNB.credito : soldiNB.debito }]}>
                    {formattaEuro(Math.abs(persona.nettoCentesimi))}
                  </Text>
                </BloccoDuro>
              );
            })()}

            <View>
              <Text style={styles.etichettaFeed}>Nei singoli gruppi</Text>
              <BloccoDuro offset={3.5} colore={colori.scuro} raggio={17} contenutoStyle={styles.elenco}>
                <View style={styles.righe}>
                  {persona.gruppi.map((riga) => {
                    const ioSonoCreditore = riga.importoCentesimi > 0;
                    return (
                      <View key={riga.gruppoId} style={styles.riga}>
                        <Text style={styles.nomeGruppo} numberOfLines={1}>{riga.gruppoNome}</Text>
                        <Text style={[styles.importoGruppo, { color: ioSonoCreditore ? soldiNB.credito : soldiNB.debito }]}>
                          {ioSonoCreditore
                            ? `ti deve ${formattaEuro(riga.importoCentesimi)}`
                            : `devi ${formattaEuro(-riga.importoCentesimi)}`}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </BloccoDuro>
            </View>

            <RiepilogoTimbrato
              titolo={`Saldo con ${persona.nome}, tutti i gruppi`}
              cifra={formattaEuro(Math.abs(persona.nettoCentesimi))}
              coloreCifra={persona.nettoCentesimi > 0 ? soldiNB.credito : soldiNB.debito}
              timbrato={timbrato}
              onFineTimbro={tornaIndietro}
              contoChiuso
            />

            {errore !== null && <Text style={styles.errore}>{errore}</Text>}

            <BloccoDuro
              style={(saldando || timbrato) && styles.bottoneDisabilitato}
              offset={2.5}
              colore={colori.oro}
              raggio={12}
              contenutoStyle={styles.bottoneSalda}
              onPress={saldando || timbrato ? undefined : saldaTutto}
            >
              {saldando ? (
                <ActivityIndicator color={colori.scuro} />
              ) : (
                <Text style={styles.testoBottoneSalda}>Salda tutto</Text>
              )}
            </BloccoDuro>
            <Text style={styles.suggerimento}>
              Azzera il saldo in ogni gruppo in comune. Per saldare solo in parte, o solo un
              gruppo specifico, usa «Salda un debito» dentro al singolo gruppo.
            </Text>
          </>
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
    flexShrink: 1,
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
    fontSize: 15,
    color: colori.scuro,
    textAlign: 'center',
  },
  fasciaHero: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  etichettaHero: {
    ...pesi.extraBold,
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: colori.soft,
  },
  cifraHero: {
    ...pesi.extraBold,
    fontSize: 34,
    fontVariant: ['tabular-nums'],
    marginTop: 6,
  },
  etichettaFeed: {
    ...pesi.extraBold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colori.soft,
    marginBottom: 7,
  },
  elenco: {
    borderRadius: 17 - 2.5,
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
    justifyContent: 'space-between',
    backgroundColor: colori.panna,
    paddingVertical: 11,
    paddingHorizontal: 12,
    gap: 10,
  },
  nomeGruppo: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '700',
    color: colori.scuro,
  },
  importoGruppo: {
    ...pesi.extraBold,
    fontSize: 12.5,
    fontVariant: ['tabular-nums'],
  },
  errore: {
    color: colori.corallo,
    fontSize: 13,
    textAlign: 'center',
  },
  bottoneSalda: {
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottoneDisabilitato: {
    opacity: 0.6,
  },
  testoBottoneSalda: {
    ...pesi.extraBold,
    fontSize: 13,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: colori.scuro,
  },
  suggerimento: {
    fontSize: 10.5,
    fontWeight: '600',
    color: colori.soft,
    textAlign: 'center',
    marginTop: -6,
  },
});
