import { Feather } from '@expo/vector-icons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { EsercizioAllenamento, VoceEsercizio } from '@/api/sessioniAllenamento';
import { BloccoDuro } from '@/components/BloccoDuro';
import { useSessioneAllenamento } from '@/hooks/useSessioneAllenamento';
import { useAuthStore } from '@/store/authStore';
import { coloriNB as colori, pesiNB as pesi } from '@/theme/neoBrutalista';

interface RigaEsercizio {
  nome: string;
  serie: string;
  ripetizioni: string;
  peso: string;
}

function rigaVuota(): RigaEsercizio {
  return { nome: '', serie: '', ripetizioni: '', peso: '' };
}

function numeroONull(testo: string): number | null {
  const pulito = testo.trim().replace(',', '.');
  if (pulito === '') {
    return null;
  }
  const numero = Number(pulito);
  return Number.isNaN(numero) ? null : numero;
}

export default function SessioneAllenamento() {
  const { allenamentoId, data, titolo } = useLocalSearchParams<{
    allenamentoId: string;
    data: string;
    titolo?: string;
  }>();
  const insets = useSafeAreaInsets();
  const utenteId = useAuthStore((stato) => stato.session?.user.id) ?? null;
  const { esercizi, eserciziUltimaVolta, isLoading, salva } = useSessioneAllenamento(
    allenamentoId ?? null,
    data ?? null,
    utenteId
  );

  if (allenamentoId === undefined || data === undefined) {
    return <Redirect href="/personale/allenamenti" />;
  }

  function tornaIndietro() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/personale/allenamenti');
    }
  }

  return (
    <KeyboardAvoidingView style={styles.schermo} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
          <View style={styles.testiTitolo}>
            <Text style={styles.titolo} numberOfLines={1}>
              {titolo ?? 'Allenamento'}
            </Text>
            <Text style={styles.sottotitolo}>{data}</Text>
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator color={colori.scuro} style={styles.caricamento} />
        ) : (
          // Monta una volta sola, quando i dati sono già pronti: lo stato
          // locale delle righe parte da un useState lazy (non da un effect
          // che chiamerebbe setState dopo il mount).
          <FormEsercizi
            eserciziSalvati={esercizi}
            eserciziUltimaVolta={eserciziUltimaVolta}
            salvando={salva.isPending}
            onSalva={(voci) => salva.mutate(voci, { onSuccess: tornaIndietro })}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function righeIniziali(
  eserciziSalvati: EsercizioAllenamento[],
  eserciziUltimaVolta: EsercizioAllenamento[]
): RigaEsercizio[] {
  if (eserciziSalvati.length > 0) {
    return eserciziSalvati.map((e) => ({
      nome: e.nome,
      serie: e.serie !== null ? String(e.serie) : '',
      ripetizioni: e.ripetizioni ?? '',
      peso: e.peso_kg !== null ? String(e.peso_kg) : '',
    }));
  }
  if (eserciziUltimaVolta.length > 0) {
    // Comodità: propone gli stessi esercizi dell'ultima volta (solo il
    // nome), pronti da compilare con i numeri di oggi - vedi il
    // riferimento mostrato sotto ogni riga.
    return eserciziUltimaVolta.map((e) => ({ ...rigaVuota(), nome: e.nome }));
  }
  return [];
}

function FormEsercizi({
  eserciziSalvati,
  eserciziUltimaVolta,
  salvando,
  onSalva,
}: {
  eserciziSalvati: EsercizioAllenamento[];
  eserciziUltimaVolta: EsercizioAllenamento[];
  salvando: boolean;
  onSalva: (voci: VoceEsercizio[]) => void;
}) {
  const [righe, setRighe] = useState<RigaEsercizio[]>(() => righeIniziali(eserciziSalvati, eserciziUltimaVolta));

  function aggiungiRiga() {
    setRighe((precedente) => [...precedente, rigaVuota()]);
  }

  function rimuoviRiga(indice: number) {
    setRighe((precedente) => precedente.filter((_, i) => i !== indice));
  }

  function aggiornaRiga(indice: number, campo: keyof RigaEsercizio, valore: string) {
    setRighe((precedente) => precedente.map((riga, i) => (i === indice ? { ...riga, [campo]: valore } : riga)));
  }

  function riferimentoUltimaVolta(nome: string): string | null {
    const trovato = eserciziUltimaVolta.find((e) => e.nome.trim().toLowerCase() === nome.trim().toLowerCase());
    if (trovato === undefined) {
      return null;
    }
    const parti: string[] = [];
    if (trovato.serie !== null) {
      parti.push(`${trovato.serie} serie`);
    }
    if (trovato.ripetizioni !== null && trovato.ripetizioni !== '') {
      parti.push(`${trovato.ripetizioni} rip.`);
    }
    if (trovato.peso_kg !== null) {
      parti.push(`${trovato.peso_kg} kg`);
    }
    return parti.length > 0 ? parti.join(' · ') : null;
  }

  function salva() {
    const vociValide: VoceEsercizio[] = righe
      .filter((riga) => riga.nome.trim() !== '')
      .map((riga) => {
        const serie = numeroONull(riga.serie);
        return {
          nome: riga.nome.trim(),
          serie: serie !== null ? Math.round(serie) : null,
          ripetizioni: riga.ripetizioni.trim() === '' ? null : riga.ripetizioni.trim(),
          pesoKg: numeroONull(riga.peso),
        };
      });
    onSalva(vociValide);
  }

  return (
    <>
      <View style={styles.listaEsercizi}>
        {righe.map((riga, indice) => {
          const riferimento = riferimentoUltimaVolta(riga.nome);
          return (
            <View key={indice} style={styles.cardEsercizio}>
              <View style={styles.rigaNomeEsercizio}>
                <TextInput
                  style={styles.inputNome}
                  placeholder="Nome esercizio"
                  placeholderTextColor={colori.soft}
                  value={riga.nome}
                  onChangeText={(v) => aggiornaRiga(indice, 'nome', v)}
                />
                <Pressable onPress={() => rimuoviRiga(indice)} hitSlop={8}>
                  <Feather name="x" size={16} color={colori.soft} />
                </Pressable>
              </View>
              {riferimento !== null && <Text style={styles.riferimento}>Ultima volta: {riferimento}</Text>}
              <View style={styles.rigaCampi}>
                <View style={styles.campo}>
                  <Text style={styles.etichettaCampo}>Serie</Text>
                  <TextInput
                    style={styles.inputCampo}
                    keyboardType="number-pad"
                    placeholder="—"
                    placeholderTextColor={colori.soft}
                    value={riga.serie}
                    onChangeText={(v) => aggiornaRiga(indice, 'serie', v)}
                  />
                </View>
                <View style={styles.campo}>
                  <Text style={styles.etichettaCampo}>Ripetizioni</Text>
                  <TextInput
                    style={styles.inputCampo}
                    placeholder="Es. 10 o 10,10,8"
                    placeholderTextColor={colori.soft}
                    value={riga.ripetizioni}
                    onChangeText={(v) => aggiornaRiga(indice, 'ripetizioni', v)}
                  />
                </View>
                <View style={styles.campo}>
                  <Text style={styles.etichettaCampo}>Kg</Text>
                  <TextInput
                    style={styles.inputCampo}
                    keyboardType="decimal-pad"
                    placeholder="—"
                    placeholderTextColor={colori.soft}
                    value={riga.peso}
                    onChangeText={(v) => aggiornaRiga(indice, 'peso', v)}
                  />
                </View>
              </View>
            </View>
          );
        })}

        <Pressable onPress={aggiungiRiga} hitSlop={8}>
          <Text style={styles.linkAggiungiEsercizio}>+ Aggiungi esercizio</Text>
        </Pressable>
      </View>

      <Pressable onPress={salva} disabled={salvando}>
        <BloccoDuro
          style={salvando && styles.bottoneDisabilitato}
          offset={2.5}
          colore={colori.corallo}
          raggio={12}
          contenutoStyle={styles.bottoneSalva}
        >
          {salvando ? <ActivityIndicator color="#fff" /> : <Text style={styles.testoBottoneSalva}>Salva sessione</Text>}
        </BloccoDuro>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  schermo: {
    flex: 1,
    backgroundColor: colori.crema,
  },
  contenuto: {
    paddingHorizontal: 16,
    gap: 18,
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
  testiTitolo: {
    flex: 1,
    minWidth: 0,
  },
  titolo: {
    ...pesi.extraBold,
    fontSize: 18,
    letterSpacing: -0.3,
    color: colori.scuro,
  },
  sottotitolo: {
    ...pesi.bold,
    fontSize: 10.5,
    color: colori.soft,
    marginTop: 1,
  },
  caricamento: {
    marginTop: 24,
  },
  listaEsercizi: {
    gap: 12,
  },
  cardEsercizio: {
    borderWidth: 2,
    borderColor: colori.scuro,
    borderRadius: 14,
    padding: 12,
    gap: 10,
    backgroundColor: colori.panna,
  },
  rigaNomeEsercizio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inputNome: {
    flex: 1,
    ...pesi.bold,
    fontSize: 14,
    color: colori.scuro,
    paddingVertical: 4,
    borderBottomWidth: 1.5,
    borderBottomColor: colori.scuro,
  },
  riferimento: {
    ...pesi.semiBold,
    fontSize: 11,
    color: colori.soft,
  },
  rigaCampi: {
    flexDirection: 'row',
    gap: 8,
  },
  campo: {
    flex: 1,
  },
  etichettaCampo: {
    ...pesi.extraBold,
    fontSize: 9,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colori.soft,
    marginBottom: 4,
  },
  inputCampo: {
    borderWidth: 1.5,
    borderColor: colori.scuro,
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 7,
    fontSize: 12.5,
    fontWeight: '700',
    color: colori.scuro,
    backgroundColor: '#fff',
  },
  linkAggiungiEsercizio: {
    ...pesi.extraBold,
    fontSize: 13,
    color: colori.corallo,
    textAlign: 'center',
  },
  bottoneDisabilitato: {
    opacity: 0.5,
  },
  bottoneSalva: {
    paddingVertical: 13,
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
