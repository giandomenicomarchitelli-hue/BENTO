import { Feather } from '@expo/vector-icons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { aggiornaArticolo } from '@/api/articoliSpesa';
import { aggiornaVoce } from '@/api/vociLista';
import { dividiEqualmente } from '@/calcolo/divisioni';
import { BloccoDuro } from '@/components/BloccoDuro';
import { useGruppoAttivo } from '@/hooks/useGruppoAttivo';
import { useSpese } from '@/hooks/useSpese';
import { euroInCentesimi } from '@/lib/formato';
import { useAuthStore } from '@/store/authStore';
import { useGruppoAttivoStore } from '@/store/gruppoAttivoStore';
import { coloriNB as colori, pesiNB as pesi } from '@/theme/neoBrutalista';

const schema = z.object({
  importoCentesimi: z.number().int().positive('Inserisci un importo valido'),
  pagatoDa: z.string().min(1, 'Scegli chi ha pagato'),
  membriSelezionati: z.array(z.string()).min(1, 'Scegli chi divide la spesa'),
});

type DatiAcquisto = {
  compratoDa: string | null;
  prezzoCentesimi: number | null;
  note: string | null;
};

export default function NuovaSpesa() {
  const gruppoAttivoId = useGruppoAttivoStore((stato) => stato.gruppoAttivoId);

  if (gruppoAttivoId === null) {
    return <Redirect href="/gruppi" />;
  }

  return <NuovaSpesaDelGruppo gruppoAttivoId={gruppoAttivoId} />;
}

function NuovaSpesaDelGruppo({ gruppoAttivoId }: { gruppoAttivoId: string }) {
  const insets = useSafeAreaInsets();
  const { membriAttivi } = useGruppoAttivo();
  const { crea } = useSpese(gruppoAttivoId);
  const utenteId = useAuthStore((stato) => stato.session?.user.id);
  const queryClient = useQueryClient();

  // Presenti solo quando si arriva dalla lista della spesa (tap su
  // "comprato" di un articolo) o da una voce di una lista "con prezzi":
  // precompilano la descrizione e permettono di segnare l'elemento fatto
  // insieme alla spesa, o anche senza spesa.
  const { articoloId, nomeArticolo, voceListaId, listaId, nomeVoce, notaEsistente } =
    useLocalSearchParams<{
      articoloId?: string;
      nomeArticolo?: string;
      voceListaId?: string;
      listaId?: string;
      nomeVoce?: string;
      notaEsistente?: string;
    }>();

  // Normalizza le due provenienze possibili in un'unica forma, cosi' il
  // resto del componente non deve ramificare su articolo vs voce di lista.
  // Prezzo e note sono solo un promemoria sull'articolo/voce, non toccano
  // la spesa registrata - anche se non coincide con quanto segnato qui.
  const collegamento =
    articoloId !== undefined
      ? {
          testo: nomeArticolo,
          segnaFatto: (dati: DatiAcquisto) =>
            aggiornaArticolo(articoloId, {
              stato: 'comprato',
              compratoDa: dati.compratoDa,
              prezzoCentesimi: dati.prezzoCentesimi,
              note: dati.note,
            }),
          chiaveInvalidazione: ['articoli-spesa', gruppoAttivoId],
        }
      : voceListaId !== undefined
        ? {
            testo: nomeVoce,
            segnaFatto: (dati: DatiAcquisto) =>
              aggiornaVoce(voceListaId, {
                fatto: true,
                prezzoCentesimi: dati.prezzoCentesimi,
                note: dati.note,
              }),
            chiaveInvalidazione: ['voci-lista', listaId],
          }
        : null;

  const [importoEuro, setImportoEuro] = useState('');
  const [descrizione, setDescrizione] = useState(collegamento?.testo ?? '');
  const [note, setNote] = useState(notaEsistente ?? '');
  // null = l'utente non ha ancora scelto esplicitamente: si usa il default
  // derivato da membri (appena caricato). Evita di sincronizzare stato
  // asincrono con un useEffect.
  const [pagatoDa, setPagatoDa] = useState<string | null>(null);
  const [membriSelezionati, setMembriSelezionati] = useState<string[] | null>(null);

  const ilMioMembro = membriAttivi.find((m) => m.utente_id === utenteId);
  const pagatoDaEffettivo = pagatoDa ?? ilMioMembro?.id ?? membriAttivi[0]?.id ?? '';
  const membriSelezionatiEffettivo = membriSelezionati ?? membriAttivi.map((m) => m.id);

  const [errore, setErrore] = useState<string | null>(null);
  const [inviando, setInviando] = useState(false);

  function tornaIndietro() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/lista-spesa');
    }
  }

  function alternaMembro(membroId: string) {
    setMembriSelezionati(
      membriSelezionatiEffettivo.includes(membroId)
        ? membriSelezionatiEffettivo.filter((id) => id !== membroId)
        : [...membriSelezionatiEffettivo, membroId]
    );
  }

  async function inviaForm() {
    const importoCentesimi = euroInCentesimi(importoEuro);
    const risultato = schema.safeParse({
      importoCentesimi: importoCentesimi ?? -1,
      pagatoDa: pagatoDaEffettivo,
      membriSelezionati: membriSelezionatiEffettivo,
    });
    if (!risultato.success) {
      setErrore(risultato.error.issues[0].message);
      return;
    }

    setErrore(null);
    setInviando(true);
    try {
      const quoteCentesimi = dividiEqualmente(
        risultato.data.importoCentesimi,
        risultato.data.membriSelezionati.length
      );
      await crea.mutateAsync({
        pagatoDa: risultato.data.pagatoDa,
        importoCentesimi: risultato.data.importoCentesimi,
        descrizione,
        quote: risultato.data.membriSelezionati.map((membroId, indice) => ({
          membroId,
          quotaCentesimi: quoteCentesimi[indice],
        })),
      });
      if (collegamento !== null) {
        // "Chi l'ha comprato" è chi ha pagato la spesa appena registrata,
        // non per forza chi sta compilando il form.
        await collegamento.segnaFatto({
          compratoDa: risultato.data.pagatoDa,
          prezzoCentesimi: risultato.data.importoCentesimi,
          note: note.trim() === '' ? null : note.trim(),
        });
        await queryClient.invalidateQueries({ queryKey: collegamento.chiaveInvalidazione });
      }
      router.back();
    } catch {
      setErrore('Qualcosa è andato storto. Riprova.');
    } finally {
      setInviando(false);
    }
  }

  async function segnaFattoSenzaSpesa() {
    if (collegamento === null) {
      return;
    }
    setInviando(true);
    try {
      // Nessuna spesa registrata quindi nessun "pagato da": si segna chi sta
      // completando l'azione.
      await collegamento.segnaFatto({
        compratoDa: ilMioMembro?.id ?? null,
        prezzoCentesimi: euroInCentesimi(importoEuro),
        note: note.trim() === '' ? null : note.trim(),
      });
      await queryClient.invalidateQueries({ queryKey: collegamento.chiaveInvalidazione });
      router.back();
    } catch {
      setErrore('Qualcosa è andato storto. Riprova.');
    } finally {
      setInviando(false);
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
          <Pressable onPress={tornaIndietro} hitSlop={8}>
            <BloccoDuro offset={2} colore={colori.panna} raggio={10} contenutoStyle={styles.quadrato}>
              <Feather name="arrow-left" size={17} color={colori.scuro} />
            </BloccoDuro>
          </Pressable>
          <Text style={styles.titolo}>Nuova spesa</Text>
        </View>

        {collegamento?.testo !== undefined && (
          <Text style={styles.hintArticolo}>
            Hai segnato «{collegamento.testo}»: quanto hai pagato?
          </Text>
        )}

        <TextInput
          style={styles.input}
          placeholder="Importo (es. 12,50)"
          placeholderTextColor={colori.soft}
          keyboardType="decimal-pad"
          value={importoEuro}
          onChangeText={setImportoEuro}
        />
        <TextInput
          style={styles.input}
          placeholder="Descrizione (opzionale)"
          placeholderTextColor={colori.soft}
          value={descrizione}
          onChangeText={setDescrizione}
        />
        {collegamento !== null && (
          <TextInput
            style={styles.input}
            placeholder="Note (opzionale, es. marca)"
            placeholderTextColor={colori.soft}
            value={note}
            onChangeText={setNote}
          />
        )}

        <Text style={styles.etichetta}>Pagato da</Text>
        <View style={styles.righeChip}>
          {membriAttivi.map((membro) => (
            <Pressable
              key={membro.id}
              style={[styles.chip, pagatoDaEffettivo === membro.id && styles.chipAttivo]}
              onPress={() => setPagatoDa(membro.id)}
            >
              <Text style={styles.testoChip}>{membro.nome}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.etichetta}>Diviso tra</Text>
        <View style={styles.righeChip}>
          {membriAttivi.map((membro) => {
            const selezionato = membriSelezionatiEffettivo.includes(membro.id);
            return (
              <Pressable
                key={membro.id}
                style={[styles.chip, selezionato && styles.chipAttivo]}
                onPress={() => alternaMembro(membro.id)}
              >
                <Text style={styles.testoChip}>{membro.nome}</Text>
              </Pressable>
            );
          })}
        </View>

        {errore !== null && <Text style={styles.testoErrore}>{errore}</Text>}

        <BloccoDuro
          style={inviando && styles.bottoneDisabilitato}
          offset={2.5}
          colore={colori.menta}
          raggio={12}
          contenutoStyle={styles.bottonePieno}
          onPress={inviando ? undefined : inviaForm}
        >
          {inviando ? (
            <ActivityIndicator color={colori.scuro} />
          ) : (
            <Text style={styles.testoBottonePieno}>Registra spesa</Text>
          )}
        </BloccoDuro>

        {collegamento !== null && (
          <Pressable onPress={segnaFattoSenzaSpesa} disabled={inviando} hitSlop={8}>
            <Text style={styles.linkSecondario}>Segna fatto senza registrare la spesa</Text>
          </Pressable>
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
    gap: 12,
  },
  rigaTitolo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginBottom: 6,
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
  hintArticolo: {
    ...pesi.bold,
    fontSize: 14,
    color: colori.soft,
    textAlign: 'center',
    marginBottom: 4,
  },
  input: {
    borderWidth: 2,
    borderColor: colori.scuro,
    borderRadius: 11,
    backgroundColor: colori.panna,
    paddingHorizontal: 13,
    paddingVertical: 12,
    ...pesi.semiBold,
    fontSize: 15,
    color: colori.scuro,
  },
  etichetta: {
    ...pesi.extraBold,
    fontSize: 12.5,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: colori.soft,
    marginTop: 4,
  },
  righeChip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    borderWidth: 2,
    borderColor: colori.scuro,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 7,
    backgroundColor: colori.panna,
  },
  chipAttivo: {
    backgroundColor: colori.menta,
  },
  testoChip: {
    ...pesi.extraBold,
    fontSize: 12.5,
    color: colori.scuro,
  },
  testoErrore: {
    ...pesi.bold,
    fontSize: 12.5,
    color: colori.corallo,
    textAlign: 'center',
  },
  bottoneDisabilitato: {
    opacity: 0.5,
  },
  bottonePieno: {
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  testoBottonePieno: {
    ...pesi.extraBold,
    fontSize: 12,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: colori.scuro,
  },
  linkSecondario: {
    textAlign: 'center',
    ...pesi.bold,
    fontSize: 12.5,
    color: colori.soft,
    marginTop: 6,
  },
});
