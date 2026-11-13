import { Feather } from '@expo/vector-icons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

import { BloccoDuro } from '@/components/BloccoDuro';
import { RiepilogoTimbrato } from '@/components/RiepilogoTimbrato';
import { useGruppoAttivo } from '@/hooks/useGruppoAttivo';
import { useSaldi } from '@/hooks/useSaldi';
import { useSpese } from '@/hooks/useSpese';
import { euroInCentesimi, formattaEuro } from '@/lib/formato';
import { useGruppoAttivoStore } from '@/store/gruppoAttivoStore';
import { coloriNB as colori, pesiNB as pesi, soldiNB } from '@/theme/neoBrutalista';

const schema = z.object({
  importoCentesimi: z.number().int().positive('Inserisci un importo valido'),
  chiPagaId: z.string().min(1, 'Scegli chi paga'),
  aChiId: z.string().min(1, 'Scegli a chi'),
});

export default function SaldaDebito() {
  const gruppoAttivoId = useGruppoAttivoStore((stato) => stato.gruppoAttivoId);

  if (gruppoAttivoId === null) {
    return <Redirect href="/gruppi" />;
  }

  return <SaldaDebitoDelGruppo gruppoAttivoId={gruppoAttivoId} />;
}

function SaldaDebitoDelGruppo({ gruppoAttivoId }: { gruppoAttivoId: string }) {
  const insets = useSafeAreaInsets();
  const { membriAttivi } = useGruppoAttivo();
  const { transazioni } = useSaldi(gruppoAttivoId);
  const { crea } = useSpese(gruppoAttivoId);

  // Presenti solo se si arriva toccando "Salda" su un debito gia' mostrato
  // in Saldi: precompilano chi/a chi/importo con quel debito esatto.
  const params = useLocalSearchParams<{
    da?: string;
    a?: string;
    importoCentesimi?: string;
  }>();

  const [chiPaga, setChiPaga] = useState<string | null>(params.da ?? null);
  const [aChi, setAChi] = useState<string | null>(params.a ?? null);
  const [importoEuro, setImportoEuro] = useState(() =>
    params.importoCentesimi !== undefined
      ? (Number(params.importoCentesimi) / 100).toFixed(2).replace('.', ',')
      : ''
  );
  const [errore, setErrore] = useState<string | null>(null);
  const [inviando, setInviando] = useState(false);
  const [timbrato, setTimbrato] = useState(false);

  function tornaIndietro() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/saldi');
    }
  }

  // Se chi paga e a chi corrispondono a un debito esistente, suggerisce
  // l'importo esatto rimasto da saldare (senza sovrascrivere una modifica
  // manuale dell'utente: solo quando il campo importo e' ancora vuoto).
  function selezionaChiPaga(id: string) {
    setChiPaga(id);
    aggiornaSuggerimento(id, aChi);
  }
  function selezionaAChi(id: string) {
    setAChi(id);
    aggiornaSuggerimento(chiPaga, id);
  }
  function aggiornaSuggerimento(daId: string | null, aId: string | null) {
    if (importoEuro.trim() !== '' || daId === null || aId === null) {
      return;
    }
    const debito = transazioni.find((t) => t.da === daId && t.a === aId);
    if (debito !== undefined) {
      setImportoEuro((debito.importoCentesimi / 100).toFixed(2).replace('.', ','));
    }
  }

  async function inviaForm() {
    const importoCentesimi = euroInCentesimi(importoEuro);
    const risultato = schema.safeParse({
      importoCentesimi: importoCentesimi ?? -1,
      chiPagaId: chiPaga ?? '',
      aChiId: aChi ?? '',
    });
    if (!risultato.success) {
      setErrore(risultato.error.issues[0].message);
      return;
    }
    if (risultato.data.chiPagaId === risultato.data.aChiId) {
      setErrore('Chi paga e a chi devono essere due persone diverse');
      return;
    }

    setErrore(null);
    setInviando(true);
    try {
      const nomeCreditore =
        membriAttivi.find((m) => m.id === risultato.data.aChiId)?.nome ?? '';
      await crea.mutateAsync({
        pagatoDa: risultato.data.chiPagaId,
        importoCentesimi: risultato.data.importoCentesimi,
        descrizione: `Pagamento a ${nomeCreditore}`,
        quote: [{ membroId: risultato.data.aChiId, quotaCentesimi: risultato.data.importoCentesimi }],
      });
      setTimbrato(true);
    } catch {
      setErrore('Qualcosa è andato storto. Riprova.');
      setInviando(false);
    }
  }

  const nomeChiPaga = membriAttivi.find((m) => m.id === chiPaga)?.nome ?? null;
  const nomeAChi = membriAttivi.find((m) => m.id === aChi)?.nome ?? null;
  const titoloRiepilogo =
    nomeChiPaga !== null && nomeAChi !== null ? `${nomeChiPaga} paga ${nomeAChi}` : 'Scegli chi paga e a chi';
  const importoCentesimiRiepilogo = euroInCentesimi(importoEuro);
  const cifraRiepilogo =
    importoCentesimiRiepilogo !== null ? formattaEuro(importoCentesimiRiepilogo) : '—';

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
          <Text style={styles.titolo}>Salda un debito</Text>
        </View>

        <View>
          <Text style={styles.etichettaCampo}>Chi paga</Text>
          <View style={styles.rigaChip}>
            {membriAttivi
              // Filtrata anche questa lista, non solo "A chi": senza,
              // scegliendo prima "A chi" si poteva poi scegliere la stessa
              // persona come "Chi paga", bloccato solo al submit con un
              // errore invece che reso impossibile da selezionare.
              .filter((m) => m.id !== aChi)
              .map((membro) => (
                <Pressable
                  key={membro.id}
                  style={[styles.chip, chiPaga === membro.id && styles.chipAttivo]}
                  onPress={() => selezionaChiPaga(membro.id)}
                >
                  <Text style={styles.testoChip}>{membro.nome}</Text>
                </Pressable>
              ))}
          </View>
        </View>

        <View>
          <Text style={styles.etichettaCampo}>A chi</Text>
          <View style={styles.rigaChip}>
            {membriAttivi
              .filter((m) => m.id !== chiPaga)
              .map((membro) => (
                <Pressable
                  key={membro.id}
                  style={[styles.chip, aChi === membro.id && styles.chipAttivo]}
                  onPress={() => selezionaAChi(membro.id)}
                >
                  <Text style={styles.testoChip}>{membro.nome}</Text>
                </Pressable>
              ))}
          </View>
        </View>

        <View>
          <Text style={styles.etichettaCampo}>Importo</Text>
          <View style={styles.campoImporto}>
            <Text style={styles.valuta}>€</Text>
            <TextInput
              style={styles.valoreImporto}
              placeholder="0,00"
              placeholderTextColor={colori.soft}
              keyboardType="decimal-pad"
              value={importoEuro}
              onChangeText={setImportoEuro}
              editable={!timbrato}
            />
          </View>
          {chiPaga !== null && aChi !== null && (
            <Text style={styles.suggerimento}>
              {(() => {
                const debito = transazioni.find((t) => t.da === chiPaga && t.a === aChi);
                return debito !== undefined
                  ? `Debito totale: ${formattaEuro(debito.importoCentesimi)} — puoi saldarlo tutto o in parte`
                  : 'Nessun debito registrato in questa direzione al momento, ma puoi comunque registrare il pagamento';
              })()}
            </Text>
          )}
        </View>

        <RiepilogoTimbrato
          titolo={titoloRiepilogo}
          cifra={cifraRiepilogo}
          coloreCifra={soldiNB.debito}
          timbrato={timbrato}
          onFineTimbro={tornaIndietro}
        />

        {errore !== null && <Text style={styles.errore}>{errore}</Text>}

        <BloccoDuro
          style={(inviando || timbrato) && styles.bottoneDisabilitato}
          offset={2.5}
          colore={colori.corallo}
          raggio={12}
          contenutoStyle={styles.bottoneSalva}
          onPress={inviando || timbrato ? undefined : inviaForm}
        >
          {inviando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.testoBottoneSalva}>Registra pagamento</Text>
          )}
        </BloccoDuro>
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
  etichettaCampo: {
    ...pesi.extraBold,
    fontSize: 9,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colori.soft,
    marginBottom: 5,
  },
  rigaChip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  chip: {
    borderWidth: 2,
    borderColor: colori.scuro,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  chipAttivo: {
    backgroundColor: colori.viola,
  },
  testoChip: {
    ...pesi.extraBold,
    fontSize: 11,
    color: colori.scuro,
  },
  campoImporto: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    borderWidth: 2.5,
    borderColor: colori.scuro,
    borderRadius: 13,
    backgroundColor: colori.panna,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  valuta: {
    ...pesi.extraBold,
    fontSize: 15,
    color: colori.soft,
  },
  valoreImporto: {
    ...pesi.extraBold,
    flex: 1,
    fontSize: 22,
    fontVariant: ['tabular-nums'],
    color: colori.scuro,
    padding: 0,
  },
  suggerimento: {
    fontSize: 10.5,
    fontWeight: '600',
    color: colori.soft,
    marginTop: 6,
    lineHeight: 14,
  },
  errore: {
    color: colori.corallo,
    fontSize: 13,
    textAlign: 'center',
  },
  bottoneSalva: {
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottoneDisabilitato: {
    opacity: 0.6,
  },
  testoBottoneSalva: {
    ...pesi.extraBold,
    fontSize: 13,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: '#fff',
  },
});
