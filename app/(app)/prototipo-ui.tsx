import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { calcolaPosizionePersonale } from '@/components/GroupBalanceCard';
import { useFaccende } from '@/hooks/useFaccende';
import { useFontFumetto } from '@/hooks/useFontFumetto';
import { useGruppoAttivo } from '@/hooks/useGruppoAttivo';
import { useImpostazioniFaccende } from '@/hooks/useImpostazioniFaccende';
import { useMieiGruppi } from '@/hooks/useMieiGruppi';
import { useOccorrenzeFaccende } from '@/hooks/useOccorrenzeFaccende';
import { useProfilo } from '@/hooks/useProfilo';
import { useSaldi } from '@/hooks/useSaldi';
import { useStoricoFaccende } from '@/hooks/useStoricoFaccende';
import { formattaEuro } from '@/lib/formato';
import { useAuthStore } from '@/store/authStore';
import { useGruppoAttivoStore } from '@/store/gruppoAttivoStore';

// Prototipo isolato per provare lo stile "fumetto retrò anni '70" come Home
// che aggrega i gruppi dell'utente + un riepilogo del gruppo attivo. Dati
// reali dagli hook esistenti (non collegato a dati finti): dove un dato non
// esiste nel modello (monete, streak, bacheca, salvadanaio) l'elemento è
// stato rimosso invece di essere inventato. Non sostituisce dashboard.tsx.

const palette = {
  crema: '#FAF5EC',
  inchiostro: '#1E1B18',
  corallo: '#F05D48',
  giallo: '#F9C846',
  teal: '#6BBBAE',
  verdeScuro: '#1C6A56',
};

const ombretta = {
  shadowColor: palette.inchiostro,
  shadowOffset: { width: 3, height: 3 },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: 4,
};

export default function PrototipoUI() {
  const inset = useSafeAreaInsets();
  const router = useRouter();
  const [bentoAperto, setBentoAperto] = useState(true);
  const [fontPronti] = useFontFumetto();

  const utenteId = useAuthStore((stato) => stato.session?.user.id);
  const gruppoAttivoId = useGruppoAttivoStore((stato) => stato.gruppoAttivoId);
  const { profilo } = useProfilo();
  const { gruppi, isLoading: gruppiInCaricamento } = useMieiGruppi();
  const { gruppo, membriAttivi } = useGruppoAttivo();
  const { transazioni, isLoading: saldiInCaricamento } = useSaldi(gruppoAttivoId);
  const { impostazioni } = useImpostazioniFaccende(gruppoAttivoId);
  const fusoOrario = impostazioni?.fuso_orario ?? 'Europe/Rome';
  const { faccende } = useFaccende(gruppoAttivoId);
  const { occorrenze, isLoading: occorrenzeInCaricamento } = useOccorrenzeFaccende(gruppoAttivoId, fusoOrario);
  const { storico } = useStoricoFaccende(gruppoAttivoId);

  const ilMioMembroId = membriAttivi.find((m) => m.utente_id === utenteId)?.id ?? null;

  const mioNettoCentesimi = useMemo(() => {
    if (ilMioMembroId === null) {
      return null;
    }
    return calcolaPosizionePersonale(transazioni, ilMioMembroId);
  }, [transazioni, ilMioMembroId]);

  const taskCompletati = useMemo(
    () => storico.filter((s) => s.membro_id === ilMioMembroId && s.tipo_evento === 'completata').length,
    [storico, ilMioMembroId]
  );

  const prossimaFaccenda = useMemo(() => {
    if (ilMioMembroId === null) {
      return null;
    }
    const mieFaccendeId = new Set(faccende.filter((f) => f.assegnata_a === ilMioMembroId).map((f) => f.id));
    const candidate = occorrenze
      .filter((o) => mieFaccendeId.has(o.faccenda_id) && o.stato === 'da_fare')
      .sort((a, b) => new Date(a.scadenza).getTime() - new Date(b.scadenza).getTime())[0];
    if (candidate === undefined) {
      return null;
    }
    const faccenda = faccende.find((f) => f.id === candidate.faccenda_id);
    return faccenda === undefined ? null : { nome: faccenda.nome, punti: candidate.punti_previsti };
  }, [faccende, occorrenze, ilMioMembroId]);

  const altriGruppi = gruppi.filter((g) => g.id !== gruppoAttivoId);
  const sottotitoloGruppi =
    gruppi.length === 0
      ? 'Nessun gruppo ancora'
      : gruppo !== null
        ? `${gruppo.nome}${altriGruppi.length > 0 ? ` +${altriGruppi.length}` : ''}`
        : `${gruppi[0]?.nome ?? ''}${gruppi.length > 1 ? ` +${gruppi.length - 1}` : ''}`;

  const saldo =
    mioNettoCentesimi === null
      ? null
      : mioNettoCentesimi > 0
        ? { testo: `TI DEVONO ${formattaEuro(mioNettoCentesimi)}`, colore: palette.verdeScuro }
        : mioNettoCentesimi < 0
          ? { testo: `DEVI ${formattaEuro(-mioNettoCentesimi)}`, colore: palette.corallo }
          : { testo: 'SEI IN PARI', colore: palette.inchiostro };

  if (!fontPronti) {
    return (
      <View style={[styles.schermo, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={palette.inchiostro} />
      </View>
    );
  }

  return (
    <View style={styles.schermo}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.contenuto, { paddingTop: inset.top + 8 }]}
      >
        <View style={styles.header}>
          <View style={styles.headerSinistra}>
            <View style={styles.logo} />
            <Text style={styles.logoTesto}>
              BENTO<Text style={{ color: palette.corallo }}>.</Text>
            </Text>
          </View>
          <Pressable
            style={styles.avatar}
            onPress={() => router.push('/profilo')}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="Apri il profilo"
          >
            <Text style={styles.avatarTesto}>
              {profilo?.nome_utente ? profilo.nome_utente.charAt(0).toUpperCase() : '?'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.saluto}>
          <View style={styles.salutoRiga}>
            <View style={styles.salutoTesti}>
              <Text style={styles.salutoTitolo}>
                CIAO{profilo?.nome_utente ? `, ${profilo.nome_utente.toUpperCase()}` : ''}!
              </Text>
              <Text style={styles.salutoSottotitolo}>
                {bentoAperto ? 'Scomparti aperti: buon appetito! 🍱' : 'Il tuo Bento box è pronto ✨'}
              </Text>
            </View>
            <Pressable
              style={styles.bottoneToggle}
              onPress={() => setBentoAperto((a) => !a)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={bentoAperto ? 'Chiudi il bento' : 'Apri il bento'}
            >
              <Feather name={bentoAperto ? 'archive' : 'box'} size={13} color={palette.inchiostro} />
              <Text style={styles.bottoneToggleTesto}>{bentoAperto ? 'CHIUDI BENTO' : 'APRI BENTO'}</Text>
            </Pressable>
          </View>
        </View>

        {bentoAperto && (
          <View style={styles.box}>
            <View style={styles.boxBadge}>
              <Text style={styles.boxBadgeTesto}>BENTO COMPARTMENTS</Text>
            </View>

            <View style={styles.righe}>
              <Pressable
                style={[styles.scomparto, { backgroundColor: '#FFFFFF' }]}
                onPress={() => (gruppoAttivoId !== null ? router.push('/saldi') : router.push('/prototipo-gruppi'))}
              >
                <View style={styles.scompartoHeader}>
                  <Text style={styles.scompartoTitolo}>PERSONALE</Text>
                  <View style={[styles.pallino, { backgroundColor: palette.giallo }]} />
                </View>
                {gruppoAttivoId === null ? (
                  <View style={styles.scompartoCorpo}>
                    <Text style={styles.scompartoDettaglio}>Nessun gruppo attivo</Text>
                    <Text style={styles.scompartoValorePiccolo}>Scegline uno per vedere i tuoi dati</Text>
                  </View>
                ) : (
                  <View style={styles.scompartoCorpo}>
                    <View style={[styles.iconaCerchio, { backgroundColor: '#E8F6F4' }]}>
                      <Feather name="check-square" size={20} color={palette.verdeScuro} />
                    </View>
                    <Text style={styles.scompartoDettaglio}>{taskCompletati} Faccende Fatte</Text>
                    <Text
                      style={[
                        styles.scompartoValore,
                        saldo && saldo.colore !== palette.inchiostro ? { color: saldo.colore } : null,
                      ]}
                    >
                      {saldiInCaricamento || saldo === null ? '···' : saldo.testo}
                    </Text>
                  </View>
                )}
                <View style={styles.scompartoFooter}>
                  <Text style={styles.scompartoFooterTesto}>Vedi saldi</Text>
                  <Feather name="arrow-right" size={12} color={`${palette.inchiostro}B3`} />
                </View>
              </Pressable>

              <Pressable
                style={[styles.scomparto, { backgroundColor: '#FFFFFF' }]}
                onPress={() => router.push('/prototipo-gruppi')}
              >
                <View style={styles.scompartoHeader}>
                  <Text style={styles.scompartoTitolo}>GRUPPI</Text>
                  <View style={[styles.pallino, { backgroundColor: palette.corallo }]} />
                </View>
                <View style={styles.scompartoCorpo}>
                  <Text style={styles.numeroGruppi}>{gruppiInCaricamento ? '···' : gruppi.length}</Text>
                  <Text style={[styles.scompartoDettaglio, { color: palette.corallo }]}>Gruppi Attivi</Text>
                  <Text style={styles.scompartoValorePiccolo} numberOfLines={1}>
                    {sottotitoloGruppi}
                  </Text>
                </View>
                <View style={styles.scompartoFooter}>
                  <View style={styles.pilaAvatar}>
                    {membriAttivi.slice(0, 3).map((m, i) => (
                      <View
                        key={m.id}
                        style={[
                          styles.avatarPiccolo,
                          { backgroundColor: [palette.corallo, palette.teal, palette.giallo][i % 3] },
                        ]}
                      >
                        <Text style={styles.avatarPiccoloTesto}>{m.nome.charAt(0).toUpperCase()}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.footerAzione}>
                    <Text style={styles.scompartoFooterTesto}>Apri</Text>
                    <Feather name="arrow-right" size={12} color={`${palette.inchiostro}B3`} />
                  </View>
                </View>
              </Pressable>
            </View>

            <Pressable
              style={styles.rigaFaccenda}
              onPress={() => router.push(gruppoAttivoId !== null ? '/faccende' : '/prototipo-gruppi')}
            >
              <View style={styles.iconaFaccenda}>
                <Feather name="zap" size={18} color="#FFFFFF" />
              </View>
              <View style={styles.faccendaTesto}>
                <Text style={styles.faccendaEtichetta}>Prossima Faccenda</Text>
                <Text style={styles.faccendaTitolo} numberOfLines={1}>
                  {gruppoAttivoId === null
                    ? 'Scegli un gruppo'
                    : occorrenzeInCaricamento
                      ? '···'
                      : prossimaFaccenda?.nome ?? 'Nessuna faccenda in programma'}
                </Text>
              </View>
              {prossimaFaccenda !== null && (
                <View style={styles.badgePunti}>
                  <Text style={styles.badgePuntiTesto}>+{prossimaFaccenda.punti} pt</Text>
                </View>
              )}
            </Pressable>
          </View>
        )}
      </ScrollView>

      <View style={[styles.nav, { paddingBottom: inset.bottom + 8 }]}>
        <View style={styles.navItem}>
          <View style={[styles.navIconBox, { backgroundColor: palette.giallo }]}>
            <Feather name="home" size={16} color={palette.inchiostro} />
          </View>
          <Text style={styles.navEtichettaAttiva}>HOME</Text>
        </View>
        <Pressable style={styles.navItem} onPress={() => router.push('/profilo')}>
          <Feather name="user" size={20} color={`${palette.inchiostro}B3`} />
          <Text style={styles.navEtichetta}>PERSONALE</Text>
        </Pressable>
        <Pressable style={styles.navItemCentrale} onPress={() => router.push('/assistente')}>
          <View style={styles.navBottoneCentrale}>
            <Feather name="plus" size={24} color="#FFFFFF" />
          </View>
          <Text style={[styles.navEtichetta, { marginTop: 24, opacity: 0.4 }]}>CREA</Text>
        </Pressable>
        <Pressable style={styles.navItem} onPress={() => router.push('/prototipo-gruppi')}>
          <Feather name="users" size={20} color={`${palette.inchiostro}B3`} />
          <Text style={styles.navEtichetta}>GRUPPI</Text>
        </Pressable>
        <Pressable style={styles.navItem} onPress={() => router.push('/saldi-personali')}>
          <Feather name="credit-card" size={20} color={`${palette.inchiostro}B3`} />
          <Text style={styles.navEtichetta}>SALDI</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  schermo: { flex: 1, backgroundColor: palette.crema },
  scroll: { flex: 1 },
  contenuto: { paddingHorizontal: 20, paddingBottom: 16, gap: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerSinistra: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: palette.corallo,
    borderWidth: 2.5,
    borderColor: palette.inchiostro,
    transform: [{ rotate: '-3deg' }],
    ...ombretta,
  },
  logoTesto: { fontSize: 26, fontWeight: '900', fontFamily: 'Fredoka_700Bold', color: palette.inchiostro },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.crema,
    borderWidth: 2.5,
    borderColor: palette.inchiostro,
    alignItems: 'center',
    justifyContent: 'center',
    ...ombretta,
  },
  avatarTesto: { fontSize: 15, fontWeight: '900', fontFamily: 'Fredoka_700Bold', color: palette.inchiostro },
  saluto: { marginTop: 4 },
  salutoRiga: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  salutoTesti: { flex: 1 },
  salutoTitolo: {
    fontSize: 22,
    fontWeight: '900', fontFamily: 'Fredoka_700Bold',
    color: palette.inchiostro,
    textTransform: 'uppercase',
  },
  salutoSottotitolo: { fontSize: 12, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold', color: `${palette.inchiostro}CC`, marginTop: 2 },
  bottoneToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: palette.giallo,
    borderWidth: 2,
    borderColor: palette.inchiostro,
    ...ombretta,
  },
  bottoneToggleTesto: { fontSize: 9, fontWeight: '900', fontFamily: 'Fredoka_700Bold', color: palette.inchiostro },
  box: {
    backgroundColor: '#F4EDE2',
    borderRadius: 28,
    borderWidth: 3.5,
    borderColor: palette.inchiostro,
    padding: 12,
    gap: 10,
    marginTop: 8,
    ...ombretta,
  },
  boxBadge: {
    alignSelf: 'center',
    marginTop: -22,
    paddingHorizontal: 16,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: palette.corallo,
    borderWidth: 2.5,
    borderColor: palette.inchiostro,
  },
  boxBadgeTesto: { fontSize: 10, fontWeight: '900', fontFamily: 'Fredoka_700Bold', color: '#FFFFFF', letterSpacing: 1 },
  righe: { flexDirection: 'row', gap: 10 },
  scomparto: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 2.5,
    borderColor: palette.inchiostro,
    padding: 12,
    justifyContent: 'space-between',
    ...ombretta,
  },
  scompartoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: palette.inchiostro,
    paddingBottom: 4,
  },
  scompartoTitolo: { fontSize: 11, fontWeight: '900', fontFamily: 'Fredoka_700Bold', color: palette.inchiostro },
  pallino: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: palette.inchiostro },
  scompartoCorpo: { alignItems: 'center', paddingVertical: 10, gap: 2 },
  iconaCerchio: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: palette.inchiostro,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  scompartoDettaglio: {
    fontSize: 10,
    fontWeight: '800', fontFamily: 'Fredoka_600SemiBold',
    color: `${palette.inchiostro}BF`,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  scompartoValore: { fontSize: 15, fontWeight: '900', fontFamily: 'Fredoka_700Bold', color: palette.inchiostro, textAlign: 'center' },
  scompartoValorePiccolo: { fontSize: 10, fontWeight: '800', fontFamily: 'Fredoka_600SemiBold', color: `${palette.inchiostro}B3`, textAlign: 'center' },
  numeroGruppi: { fontSize: 38, fontWeight: '900', fontFamily: 'Fredoka_700Bold', color: palette.inchiostro },
  scompartoFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 2,
    borderTopColor: `${palette.inchiostro}33`,
    paddingTop: 6,
  },
  scompartoFooterTesto: { fontSize: 11, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold', color: `${palette.inchiostro}B3` },
  footerAzione: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  pilaAvatar: { flexDirection: 'row' },
  avatarPiccolo: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: palette.inchiostro,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -4,
  },
  avatarPiccoloTesto: { fontSize: 8, fontWeight: '900', fontFamily: 'Fredoka_700Bold', color: '#FFFFFF' },
  rigaFaccenda: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2.5,
    borderColor: palette.inchiostro,
    padding: 10,
    ...ombretta,
  },
  iconaFaccenda: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: palette.teal,
    borderWidth: 2,
    borderColor: palette.inchiostro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faccendaTesto: { flex: 1, gap: 1 },
  faccendaEtichetta: { fontSize: 9, fontWeight: '900', fontFamily: 'Fredoka_700Bold', color: palette.corallo, textTransform: 'uppercase' },
  faccendaTitolo: { fontSize: 12, fontWeight: '800', fontFamily: 'Fredoka_600SemiBold', color: palette.inchiostro },
  badgePunti: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: palette.crema,
    borderWidth: 1.5,
    borderColor: palette.inchiostro,
  },
  badgePuntiTesto: { fontSize: 12, fontWeight: '900', fontFamily: 'Fredoka_700Bold', color: palette.corallo },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 3.5,
    borderTopColor: palette.inchiostro,
    paddingTop: 10,
    paddingHorizontal: 8,
  },
  navItem: { alignItems: 'center', justifyContent: 'center', gap: 4, width: 64, minHeight: 44 },
  navItemCentrale: { alignItems: 'center', width: 64 },
  navIconBox: {
    width: 36,
    height: 28,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: palette.inchiostro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBottoneCentrale: {
    position: 'absolute',
    top: -26,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: palette.corallo,
    borderWidth: 3.5,
    borderColor: palette.inchiostro,
    alignItems: 'center',
    justifyContent: 'center',
    ...ombretta,
  },
  navEtichetta: { fontSize: 9, fontWeight: '800', fontFamily: 'Fredoka_600SemiBold', color: `${palette.inchiostro}B3`, textTransform: 'uppercase' },
  navEtichettaAttiva: { fontSize: 9, fontWeight: '900', fontFamily: 'Fredoka_700Bold', color: palette.inchiostro, textTransform: 'uppercase' },
});
