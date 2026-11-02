import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Redirect, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { esci } from '@/api/auth';
import { calcolaPosizionePersonale } from '@/components/GroupBalanceCard';
import { iconaPerTipoGruppo } from '@/components/GroupPreviewCard';
import { useArticoliSpesa } from '@/hooks/useArticoliSpesa';
import { useFontFumetto } from '@/hooks/useFontFumetto';
import { useGruppoAttivo } from '@/hooks/useGruppoAttivo';
import { useImpegni } from '@/hooks/useImpegni';
import { useListe } from '@/hooks/useListe';
import { useNotifiche } from '@/hooks/useNotifiche';
import { useSaldi } from '@/hooks/useSaldi';
import { useSfide } from '@/hooks/useSfide';
import { formattaEuro } from '@/lib/formato';
import { useAuthStore } from '@/store/authStore';
import { useGruppoAttivoStore } from '@/store/gruppoAttivoStore';

// Prototipo isolato per la Home di un gruppo, stesso stile fumetto retrò di
// prototipo-ui.tsx e prototipo-gruppi.tsx - ma a differenza di quei due,
// questo ricalca quasi 1:1 dashboard.tsx (stessi hook, stessa logica di
// calcolo), solo restyling. Non sostituisce dashboard.tsx.

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

export default function PrototipoCasa() {
  const router = useRouter();
  const inset = useSafeAreaInsets();
  const utenteId = useAuthStore((stato) => stato.session?.user.id);
  const gruppoAttivoId = useGruppoAttivoStore((stato) => stato.gruppoAttivoId);
  const { gruppo, membriAttivi, isLoading } = useGruppoAttivo();
  const { liste, isLoading: listeInCaricamento } = useListe(gruppoAttivoId);
  const { articoli, isLoading: articoliInCaricamento, error: erroreArticoli } =
    useArticoliSpesa(gruppoAttivoId);
  const { transazioni, isLoading: saldiInCaricamento } = useSaldi(gruppoAttivoId);
  const { sfide, isLoading: sfideInCaricamento } = useSfide(gruppoAttivoId);
  const { impegni, occorrenze, isLoading: impegniInCaricamento } = useImpegni(gruppoAttivoId);
  const { nonLette: notificheNonLette } = useNotifiche();
  const [fontPronti] = useFontFumetto();

  const ilMioMembro = membriAttivi.find((m) => m.utente_id === utenteId);
  const mioNettoCentesimi = useMemo(() => {
    if (ilMioMembro === undefined) {
      return null;
    }
    return calcolaPosizionePersonale(transazioni, ilMioMembro.id);
  }, [transazioni, ilMioMembro]);

  const impegniPerId = useMemo(() => new Map(impegni.map((i) => [i.id, i])), [impegni]);
  const prossimaOccorrenza = useMemo(
    () => occorrenze.find((o) => impegniPerId.has(o.impegno_id) && new Date(o.data_ora) > new Date()),
    [occorrenze, impegniPerId]
  );

  if (gruppoAttivoId === null) {
    return <Redirect href="/prototipo-gruppi" />;
  }

  if (!fontPronti || isLoading || gruppo === null) {
    return (
      <View style={styles.centrato}>
        <ActivityIndicator color={palette.inchiostro} />
      </View>
    );
  }

  const listeInHome = liste.filter((l) => l.mostra_in_home);
  const pendenti = articoli.filter((a) => a.stato === 'da_comprare').length;
  const erroreArticoliBool = erroreArticoli !== null && erroreArticoli !== undefined;
  const sottotitoloSpesa = articoliInCaricamento || erroreArticoliBool
    ? undefined
    : articoli.length === 0
      ? 'Lista vuota'
      : pendenti === 0
        ? 'Tutto comprato'
        : `${pendenti} ${pendenti === 1 ? 'articolo da comprare' : 'articoli da comprare'}`;
  const sottotitoloGruppo = `${membriAttivi.length} ${membriAttivi.length === 1 ? 'membro' : 'membri'}`;
  const sottotitoloListe = listeInCaricamento
    ? undefined
    : liste.length === 0
      ? 'Nessuna lista'
      : `${liste.length} ${liste.length === 1 ? 'lista' : 'liste'}`;
  const sfideAttive = sfide.filter((s) => s.sfida.stato === 'in_corso').length;
  const sottotitoloSfide = sfideInCaricamento
    ? undefined
    : sfideAttive === 0
      ? 'Nessuna sfida attiva'
      : `${sfideAttive} ${sfideAttive === 1 ? 'attiva' : 'attive'}`;
  const sottotitoloCalendario = impegniInCaricamento
    ? undefined
    : prossimaOccorrenza === undefined
      ? 'Nessun impegno in programma'
      : impegniPerId.get(prossimaOccorrenza.impegno_id)?.titolo ?? 'Impegno';

  const stileTipo = iconaPerTipoGruppo(gruppo.tipo);

  const saldo =
    mioNettoCentesimi === null
      ? { testo: '···', colore: palette.inchiostro }
      : mioNettoCentesimi > 0
        ? { testo: `TI DEVONO ${formattaEuro(mioNettoCentesimi)}`, colore: palette.verdeScuro }
        : mioNettoCentesimi < 0
          ? { testo: `DEVI ${formattaEuro(-mioNettoCentesimi)}`, colore: palette.corallo }
          : { testo: 'SEI IN PARI', colore: palette.inchiostro };

  const funzionalita: {
    icona: keyof typeof Feather.glyphMap;
    tinta: string;
    titolo: string;
    dettaglio: string | undefined;
    dettaglioColore?: string;
    onPress: () => void;
  }[] = [
    { icona: 'shopping-cart', tinta: '#FDE4E0', titolo: 'LISTA SPESA', dettaglio: sottotitoloSpesa, onPress: () => router.push('/lista-spesa') },
    { icona: 'users', tinta: '#DCF5EB', titolo: 'GRUPPO', dettaglio: sottotitoloGruppo, onPress: () => router.push('/gruppo') },
    { icona: 'check-square', tinta: '#FDECB8', titolo: 'FACCENDE', dettaglio: 'Punti e classifica', dettaglioColore: palette.verdeScuro, onPress: () => router.push('/faccende') },
    { icona: 'list', tinta: '#E8E5FD', titolo: 'LISTE', dettaglio: sottotitoloListe, onPress: () => router.push('/liste') },
    { icona: 'award', tinta: '#FFE6BA', titolo: 'SFIDE', dettaglio: sottotitoloSfide, onPress: () => router.push('/sfide') },
    { icona: 'calendar', tinta: '#E0F2FE', titolo: 'CALENDARIO', dettaglio: sottotitoloCalendario, onPress: () => router.push('/calendario') },
  ];

  function tornaIndietro() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/prototipo-gruppi');
    }
  }

  return (
    <View style={styles.schermo}>
      <View style={[styles.header, { paddingTop: inset.top + 8 }]}>
        <View style={styles.headerSinistra}>
          <Pressable
            style={styles.bottoneTondo}
            onPress={tornaIndietro}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Indietro"
          >
            <Feather name="arrow-left" size={16} color={palette.inchiostro} />
          </Pressable>
          <View style={[styles.iconaCasa, { backgroundColor: '#DCF5EB' }]}>
            <Feather name={stileTipo.icona} size={18} color={palette.verdeScuro} />
          </View>
          <Text style={styles.titoloGruppo} numberOfLines={1}>
            {gruppo.nome.toUpperCase()}
          </Text>
        </View>
        <View style={styles.headerDestra}>
          <View style={styles.pilaAvatar}>
            {membriAttivi.slice(0, 3).map((m, i) => (
              <View
                key={m.id}
                style={[
                  styles.avatarPiccolo,
                  { backgroundColor: i % 2 === 0 ? '#FFD7D0' : '#C6F1E0', zIndex: 10 - i },
                ]}
              >
                <Text style={styles.avatarPiccoloTesto}>{m.nome.charAt(0).toUpperCase()}</Text>
              </View>
            ))}
          </View>
          <Pressable
            style={styles.bottoneTondoPiccolo}
            onPress={() => router.push('/notifiche')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={notificheNonLette > 0 ? `Notifiche, ${notificheNonLette} non lette` : 'Notifiche'}
          >
            <Feather name="bell" size={14} color={palette.inchiostro} />
            {notificheNonLette > 0 && <View style={styles.puntinoNotifica} />}
          </Pressable>
          <Pressable
            style={styles.bottoneTondoPiccolo}
            onPress={() => router.push('/gruppo')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Impostazioni del gruppo"
          >
            <Feather name="settings" size={14} color={palette.inchiostro} />
          </Pressable>
          <Pressable
            style={styles.bottoneTondoPiccolo}
            onPress={() => esci()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Esci"
          >
            <Feather name="log-out" size={14} color={palette.inchiostro} />
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.contenuto}>
        <Pressable style={styles.saldoCard} onPress={() => router.push('/saldi')}>
          <View style={styles.saldoRiga}>
            <Text style={styles.saldoEtichetta}>IL TUO SALDO IN QUESTO GRUPPO</Text>
            <Text style={styles.saldoLink}>VEDI SALDI E SPESE →</Text>
          </View>
          <View style={[styles.saldoPillola, { backgroundColor: saldo.colore === palette.inchiostro ? '#EDE6DB' : saldo.colore }]}>
            <Feather
              name="credit-card"
              size={16}
              color={saldo.colore === palette.inchiostro ? palette.inchiostro : '#A6ECCF'}
            />
            <Text
              style={[
                styles.saldoPillolaTesto,
                { color: saldo.colore === palette.inchiostro ? palette.inchiostro : '#FFFFFF' },
              ]}
            >
              {saldiInCaricamento ? '···' : saldo.testo}
            </Text>
          </View>
        </Pressable>

        <View style={styles.sezioneHeader}>
          <View style={styles.sezioneHeaderSinistra}>
            <Feather name="grid" size={16} color={palette.corallo} />
            <Text style={styles.sezioneTitolo}>BENTO BOX COMPARTI</Text>
          </View>
          <View style={styles.pillolaMembri}>
            <Text style={styles.pillolaMembriTesto}>{sottotitoloGruppo.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.griglia}>
          {funzionalita.map((f) => (
            <Pressable key={f.titolo} style={styles.tile} onPress={f.onPress}>
              <View style={styles.tileHeader}>
                <View style={[styles.tileIcona, { backgroundColor: f.tinta }]}>
                  <Feather name={f.icona} size={18} color={palette.inchiostro} />
                </View>
                <Feather name="chevron-right" size={16} color={`${palette.inchiostro}80`} />
              </View>
              <View style={{ marginTop: 8 }}>
                <Text style={styles.tileTitolo}>{f.titolo}</Text>
                <Text
                  style={[
                    styles.tileDettaglio,
                    f.dettaglioColore ? { color: f.dettaglioColore, fontWeight: '800' } : null,
                  ]}
                >
                  {f.dettaglio ?? '···'}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.scriviRiga} onPress={() => router.push('/assistente')}>
          <View style={styles.scriviSinistra}>
            <View style={styles.scriviIcona}>
              <Feather name="edit-3" size={20} color={palette.corallo} />
            </View>
            <View>
              <Text style={styles.scriviTitolo}>SCRIVI</Text>
              <Text style={styles.scriviDettaglio}>Chiedi all&apos;assistente di casa</Text>
            </View>
          </View>
          <View style={styles.freccia}>
            <Feather name="arrow-right" size={16} color={palette.inchiostro} />
          </View>
        </Pressable>

        {listeInHome.length > 0 && (
          <>
            <View style={styles.evidenzaHeader}>
              <Feather name="map-pin" size={15} color="#A25A00" />
              <Text style={styles.sezioneTitolo}>IN EVIDENZA</Text>
            </View>
            {listeInHome.map((lista) => (
              <Pressable
                key={lista.id}
                style={styles.evidenzaCard}
                onPress={() =>
                  router.push({
                    pathname: '/liste/[id]',
                    params: { id: lista.id, nome: lista.nome, conPrezzi: lista.con_prezzi ? '1' : '0' },
                  })
                }
              >
                <View style={styles.scriviSinistra}>
                  <View style={[styles.scriviIcona, { backgroundColor: '#FDE29A' }]}>
                    <Feather name="file-text" size={20} color="#8C5200" />
                  </View>
                  <Text style={styles.scriviTitolo}>{lista.nome.toUpperCase()}</Text>
                </View>
                <View style={styles.freccia}>
                  <Feather name="arrow-right" size={16} color={palette.inchiostro} />
                </View>
              </Pressable>
            ))}
          </>
        )}

        <Text style={styles.dalTesto}>
          Gruppo creato il {format(new Date(gruppo.creato_il), 'd MMMM yyyy', { locale: it })}
        </Text>
      </ScrollView>

      <View style={[styles.nav, { paddingBottom: inset.bottom + 8 }]}>
        <Pressable style={styles.navItem} onPress={() => router.push('/prototipo-ui')}>
          <Feather name="home" size={20} color={`${palette.inchiostro}B3`} />
          <Text style={styles.navEtichetta}>HOME</Text>
        </Pressable>
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
        <Pressable style={styles.navItem} onPress={() => router.push('/saldi')}>
          <Feather name="credit-card" size={20} color={`${palette.inchiostro}B3`} />
          <Text style={styles.navEtichetta}>SALDI</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  schermo: { flex: 1, backgroundColor: palette.crema },
  centrato: { flex: 1, backgroundColor: palette.crema, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: `${palette.inchiostro}1A`,
    backgroundColor: palette.crema,
  },
  headerSinistra: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  headerDestra: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bottoneTondo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: `${palette.inchiostro}40`,
    alignItems: 'center',
    justifyContent: 'center',
    ...ombretta,
    shadowOffset: { width: 2, height: 2 },
  },
  iconaCasa: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: `${palette.inchiostro}40`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titoloGruppo: { fontSize: 19, fontWeight: '900', fontFamily: 'Fredoka_700Bold', color: palette.inchiostro, textTransform: 'uppercase', flexShrink: 1 },
  pilaAvatar: { flexDirection: 'row', marginRight: 2 },
  avatarPiccolo: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  avatarPiccoloTesto: { fontSize: 10, fontWeight: '900', fontFamily: 'Fredoka_700Bold', color: palette.inchiostro },
  bottoneTondoPiccolo: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: `${palette.inchiostro}26`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  puntinoNotifica: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.corallo,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  scroll: { flex: 1 },
  contenuto: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, gap: 14 },
  saldoCard: {
    backgroundColor: '#FFF8F3',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: palette.inchiostro,
    padding: 14,
    gap: 10,
    ...ombretta,
  },
  saldoRiga: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  saldoEtichetta: { fontSize: 10, fontWeight: '800', fontFamily: 'Fredoka_600SemiBold', color: `${palette.inchiostro}99`, textTransform: 'uppercase', letterSpacing: 0.4 },
  saldoLink: { fontSize: 10, fontWeight: '900', fontFamily: 'Fredoka_700Bold', color: palette.corallo, textTransform: 'uppercase' },
  saldoPillola: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#0D382B',
  },
  saldoPillolaTesto: { fontSize: 15, fontWeight: '900', fontFamily: 'Fredoka_700Bold', textTransform: 'uppercase' },
  sezioneHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sezioneHeaderSinistra: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sezioneTitolo: { fontSize: 15, fontWeight: '900', fontFamily: 'Fredoka_700Bold', color: palette.inchiostro, textTransform: 'uppercase' },
  pillolaMembri: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#EDE6DB',
    borderWidth: 1,
    borderColor: `${palette.inchiostro}26`,
  },
  pillolaMembriTesto: { fontSize: 9, fontWeight: '900', fontFamily: 'Fredoka_700Bold', color: `${palette.inchiostro}99`, textTransform: 'uppercase' },
  griglia: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    width: '47.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: palette.inchiostro,
    padding: 12,
    minHeight: 100,
    justifyContent: 'space-between',
    ...ombretta,
  },
  tileHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tileIcona: {
    width: 34,
    height: 34,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: `${palette.inchiostro}33`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileTitolo: { fontSize: 14, fontWeight: '900', fontFamily: 'Fredoka_700Bold', color: palette.inchiostro, textTransform: 'uppercase' },
  tileDettaglio: { fontSize: 10.5, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold', color: `${palette.inchiostro}99`, marginTop: 2 },
  scriviRiga: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: palette.inchiostro,
    padding: 12,
    ...ombretta,
  },
  scriviSinistra: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  scriviIcona: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFE2DC',
    borderWidth: 1.5,
    borderColor: `${palette.inchiostro}33`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scriviTitolo: { fontSize: 15, fontWeight: '900', fontFamily: 'Fredoka_700Bold', color: palette.inchiostro, textTransform: 'uppercase' },
  scriviDettaglio: { fontSize: 11, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold', color: `${palette.inchiostro}99`, marginTop: 1 },
  freccia: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: palette.crema,
    borderWidth: 1.5,
    borderColor: `${palette.inchiostro}40`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  evidenzaHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  evidenzaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF5DE',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: palette.inchiostro,
    padding: 12,
    marginTop: 8,
    ...ombretta,
  },
  dalTesto: { fontSize: 10, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold', color: `${palette.inchiostro}66`, textAlign: 'center', marginTop: 4 },
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
});
