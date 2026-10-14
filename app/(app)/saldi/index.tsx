import { Feather } from '@expo/vector-icons';
import { Link, Redirect, useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, Pressable, StyleSheet, Text, View } from 'react-native';

import type { SpesaConQuote } from '@/api/spese';
import { Avatar } from '@/components/Avatar';
import { useGruppoAttivo } from '@/hooks/useGruppoAttivo';
import { useSaldi } from '@/hooks/useSaldi';
import { useSpese } from '@/hooks/useSpese';
import { formattaEuro } from '@/lib/formato';
import { useGruppoAttivoStore } from '@/store/gruppoAttivoStore';
import { colori, raggio, spaziatura, tipografia } from '@/theme/tokens';

export default function Saldi() {
  const gruppoAttivoId = useGruppoAttivoStore((stato) => stato.gruppoAttivoId);

  if (gruppoAttivoId === null) {
    return <Redirect href="/gruppi" />;
  }

  return <SaldiDelGruppo gruppoAttivoId={gruppoAttivoId} />;
}

function SaldiDelGruppo({ gruppoAttivoId }: { gruppoAttivoId: string }) {
  const router = useRouter();
  const { membri } = useGruppoAttivo();
  const { transazioni, isLoading: saldiInCaricamento } = useSaldi(gruppoAttivoId);
  const { spese, isLoading: speseInCaricamento, annulla } = useSpese(gruppoAttivoId);

  const nomeMembro = (membroId: string) =>
    membri.find((m) => m.id === membroId)?.nome ?? 'Qualcuno';

  function RigaSpesa({ spesa }: { spesa: SpesaConQuote }) {
    return (
      <View style={styles.riga}>
        <Avatar nome={nomeMembro(spesa.pagato_da)} />
        <View style={styles.rigaTesto}>
          <Text style={styles.descrizione}>
            {spesa.descrizione !== '' ? spesa.descrizione : 'Spesa'}
          </Text>
          <Text style={styles.dettaglio}>
            {nomeMembro(spesa.pagato_da)} · {spesa.data}
          </Text>
        </View>
        <Text style={styles.importoSpesa}>{formattaEuro(spesa.importo_centesimi)}</Text>
        <Pressable onPress={() => annulla.mutate(spesa.id)} hitSlop={8}>
          <Feather name="x" size={16} color={colori.inchiostro300} />
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.contenitore} contentContainerStyle={styles.contenuto}>
      <View style={styles.rigaBottoni}>
        <Pressable style={styles.bottoneNuova} onPress={() => router.push('/spese/nuova')}>
          <Feather name="plus" size={16} color="#fff" />
          <Text style={styles.testoBottoneNuova}>Nuova spesa</Text>
        </Pressable>
        <Link href="/saldi/salda" style={styles.bottoneSalda}>
          Salda un debito
        </Link>
      </View>

      <Text style={styles.titoloSezione}>Saldi</Text>
      {saldiInCaricamento ? (
        <ActivityIndicator style={styles.caricamento} />
      ) : transazioni.length === 0 ? (
        <Text style={styles.vuoto}>Siete in pari! 🎉</Text>
      ) : (
        <View style={styles.carta}>
          {transazioni.map((t, indice) => (
            <View
              key={`${t.da}-${t.a}-${indice}`}
              style={[styles.riga, indice > 0 && styles.rigaDivisa]}
            >
              <Avatar nome={nomeMembro(t.da)} />
              <Text style={styles.testo}>
                <Text style={styles.nome}>{nomeMembro(t.da)}</Text> deve a{' '}
                <Text style={styles.nome}>{nomeMembro(t.a)}</Text>
              </Text>
              <Text style={styles.importoDebito}>{formattaEuro(t.importoCentesimi)}</Text>
              <Link
                href={{
                  pathname: '/saldi/salda',
                  params: { da: t.da, a: t.a, importoCentesimi: String(t.importoCentesimi) },
                }}
                style={styles.linkSalda}
              >
                Salda
              </Link>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.titoloSezione}>Spese</Text>
      {speseInCaricamento ? (
        <ActivityIndicator style={styles.caricamento} />
      ) : spese.length === 0 ? (
        <Text style={styles.vuoto}>Nessuna spesa registrata.</Text>
      ) : (
        <View style={styles.carta}>
          {spese.map((spesa, indice) => (
            <View key={spesa.id} style={indice > 0 ? styles.rigaDivisa : undefined}>
              <RigaSpesa spesa={spesa} />
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenitore: {
    flex: 1,
    backgroundColor: colori.sfondoApp,
  },
  contenuto: {
    padding: spaziatura.lg,
    gap: spaziatura.sm,
  },
  rigaBottoni: {
    flexDirection: 'row',
    gap: spaziatura.sm,
    marginBottom: spaziatura.sm,
  },
  bottoneNuova: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colori.blu600,
    borderRadius: raggio.sm,
    paddingVertical: 12,
  },
  testoBottoneNuova: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  bottoneSalda: {
    flex: 1,
    borderWidth: 1,
    borderColor: colori.blu600,
    color: colori.blu600,
    fontSize: 15,
    fontWeight: '600',
    borderRadius: raggio.sm,
    paddingVertical: 12,
    textAlign: 'center',
    overflow: 'hidden',
  },
  linkSalda: {
    color: colori.blu600,
    fontSize: 13,
    fontWeight: '700',
  },
  titoloSezione: {
    ...tipografia.etichetta,
    color: colori.inchiostro500,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: spaziatura.lg,
    marginBottom: 2,
  },
  caricamento: {
    marginTop: 12,
  },
  vuoto: {
    textAlign: 'center',
    color: colori.inchiostro500,
    marginTop: 12,
  },
  carta: {
    backgroundColor: colori.superficie,
    borderRadius: raggio.md,
    borderWidth: 1,
    borderColor: colori.inchiostro150,
    overflow: 'hidden',
  },
  riga: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spaziatura.md,
    paddingVertical: 12,
    paddingHorizontal: spaziatura.md,
  },
  rigaDivisa: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colori.inchiostro150,
  },
  rigaTesto: {
    flex: 1,
  },
  descrizione: {
    fontSize: 15,
    fontWeight: '600',
    color: colori.inchiostro900,
  },
  dettaglio: {
    fontSize: 13,
    color: colori.inchiostro500,
    marginTop: 2,
  },
  testo: {
    fontSize: 15,
    flex: 1,
    color: colori.inchiostro900,
  },
  nome: {
    fontWeight: '700',
  },
  importoSpesa: {
    fontSize: 15,
    fontWeight: '700',
    color: colori.inchiostro900,
  },
  importoDebito: {
    fontSize: 15,
    fontWeight: '700',
    color: colori.rosso600,
  },
});
