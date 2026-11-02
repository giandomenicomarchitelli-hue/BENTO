import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Gruppo } from '@/api/gruppi';
import { iconaPerTipoGruppo } from '@/components/GroupPreviewCard';
import { useFontFumetto } from '@/hooks/useFontFumetto';
import { useMieiGruppi } from '@/hooks/useMieiGruppi';
import { useGruppoAttivoStore } from '@/store/gruppoAttivoStore';

// Prototipo isolato per "I Tuoi Gruppi", stesso stile fumetto retrò di
// prototipo-ui.tsx e prototipo-casa.tsx. Dati reali (useMieiGruppi), non
// sostituisce app/(app)/gruppi/index.tsx. Il gruppo "Principale" è quello
// attivo nello store (gruppoAttivoStore), non un campo finto: non c'è un
// concetto di membri/indirizzo per gruppo nel modello dati, quindi qui si
// mostra solo nome, tipo e data di creazione (stessa info di GroupPreviewCard).

const palette = {
  crema: '#FAF5EC',
  inchiostro: '#1E1B18',
  corallo: '#F05D48',
  giallo: '#F9C846',
  teal: '#6BBBAE',
};

const ombretta = {
  shadowColor: palette.inchiostro,
  shadowOffset: { width: 3, height: 3 },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: 4,
};

function RigaGruppo({ gruppo, attivo, onPress }: { gruppo: Gruppo; attivo: boolean; onPress: () => void }) {
  const stile = iconaPerTipoGruppo(gruppo.tipo);
  const dal = format(new Date(gruppo.creato_il), 'd MMM yyyy', { locale: it });

  return (
    <Pressable style={styles.gruppoCard} onPress={onPress}>
      <View style={styles.gruppoCardSinistra}>
        <View style={[styles.gruppoIcona, { backgroundColor: '#E8F6F4' }]}>
          <Feather name={stile.icona} size={22} color={palette.inchiostro} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.gruppoTitoloRiga}>
            <Text style={styles.gruppoTitolo} numberOfLines={1}>
              {gruppo.nome.toUpperCase()}
            </Text>
            {attivo && (
              <View style={styles.pillolaPrincipale}>
                <Text style={styles.pillolaPrincipaleTesto}>Attivo</Text>
              </View>
            )}
          </View>
          <Text style={styles.gruppoDettaglio}>Dal {dal}</Text>
        </View>
      </View>
      <View style={styles.freccia}>
        <Feather name="arrow-right" size={16} color={palette.inchiostro} />
      </View>
    </Pressable>
  );
}

export default function PrototipoGruppi() {
  const inset = useSafeAreaInsets();
  const router = useRouter();
  const { gruppi, isLoading } = useMieiGruppi();
  const gruppoAttivoId = useGruppoAttivoStore((stato) => stato.gruppoAttivoId);
  const impostaGruppoAttivo = useGruppoAttivoStore((stato) => stato.impostaGruppoAttivo);
  const [fontPronti] = useFontFumetto();

  function apriGruppo(gruppo: Gruppo) {
    impostaGruppoAttivo(gruppo.id);
    router.push('/prototipo-casa');
  }

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
            <Feather name="user" size={18} color={palette.inchiostro} />
          </Pressable>
        </View>

        <View style={styles.titoloRiga}>
          <View style={{ flex: 1 }}>
            <Text style={styles.titolo}>I TUOI GRUPPI</Text>
            <Text style={styles.sottotitolo}>I tuoi spazi condivisi nel bento</Text>
          </View>
          <Pressable
            style={styles.bottoneNuovo}
            onPress={() => router.push('/onboarding/crea-gruppo')}
            hitSlop={6}
            accessibilityRole="button"
          >
            <Feather name="plus" size={14} color="#FFFFFF" />
            <Text style={styles.bottoneNuovoTesto}>NUOVO</Text>
          </Pressable>
        </View>

        <View style={styles.box}>
          <View style={styles.boxBadgeRiga}>
            <View style={styles.boxBadge}>
              <Feather name="box" size={11} color="#FFFFFF" />
              <Text style={styles.boxBadgeTesto}>BENTO BOX · I TUOI SPAZI</Text>
            </View>
            <View style={styles.puntiniRiga}>
              <View style={[styles.puntino, { backgroundColor: palette.teal }]} />
              <View style={[styles.puntino, { backgroundColor: palette.corallo }]} />
              <View style={[styles.puntino, { backgroundColor: palette.giallo }]} />
            </View>
          </View>

          {isLoading ? (
            <ActivityIndicator color={palette.inchiostro} style={{ paddingVertical: 20 }} />
          ) : gruppi.length === 0 ? (
            <Text style={styles.vuoto}>Non fai ancora parte di nessun gruppo.</Text>
          ) : (
            <View style={{ gap: 10 }}>
              {gruppi.map((g) => (
                <RigaGruppo key={g.id} gruppo={g} attivo={g.id === gruppoAttivoId} onPress={() => apriGruppo(g)} />
              ))}
            </View>
          )}

          <Pressable style={styles.invitoRiga} onPress={() => router.push('/onboarding/unisciti-a-gruppo')}>
            <View style={styles.invitoSinistra}>
              <View style={styles.invitoIcona}>
                <Feather name="key" size={14} color={palette.inchiostro} />
              </View>
              <View>
                <Text style={styles.invitoTitolo}>Hai un codice invito?</Text>
                <Text style={styles.invitoDettaglio}>Unisciti a un bento box esistente</Text>
              </View>
            </View>
            <View style={styles.bottoneEntra}>
              <Text style={styles.bottoneEntraTesto}>ENTRA</Text>
            </View>
          </Pressable>
        </View>
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
        <View style={styles.navItem}>
          <View style={[styles.navIconBox, { backgroundColor: palette.giallo }]}>
            <Feather name="users" size={16} color={palette.inchiostro} />
          </View>
          <Text style={styles.navEtichettaAttiva}>GRUPPI</Text>
        </View>
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
  titoloRiga: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 4 },
  titolo: { fontSize: 24, fontWeight: '900', fontFamily: 'Fredoka_700Bold', color: palette.inchiostro, textTransform: 'uppercase' },
  sottotitolo: { fontSize: 12, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold', color: `${palette.inchiostro}CC`, marginTop: 2 },
  bottoneNuovo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: palette.corallo,
    borderWidth: 2.5,
    borderColor: palette.inchiostro,
    ...ombretta,
  },
  bottoneNuovoTesto: { fontSize: 11, fontWeight: '900', fontFamily: 'Fredoka_700Bold', color: '#FFFFFF' },
  box: {
    backgroundColor: '#F4EDE2',
    borderRadius: 28,
    borderWidth: 3.5,
    borderColor: palette.inchiostro,
    padding: 12,
    gap: 10,
    marginTop: 4,
    ...ombretta,
  },
  boxBadgeRiga: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  boxBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: palette.corallo,
    borderWidth: 2,
    borderColor: palette.inchiostro,
  },
  boxBadgeTesto: { fontSize: 9, fontWeight: '900', fontFamily: 'Fredoka_700Bold', color: '#FFFFFF', letterSpacing: 0.5 },
  puntiniRiga: { flexDirection: 'row', gap: 4 },
  puntino: { width: 6, height: 6, borderRadius: 3 },
  vuoto: { fontSize: 12, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold', color: `${palette.inchiostro}99`, textAlign: 'center', paddingVertical: 20 },
  gruppoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: palette.inchiostro,
    padding: 10,
    ...ombretta,
  },
  gruppoCardSinistra: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  gruppoIcona: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: palette.inchiostro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gruppoTitoloRiga: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  gruppoTitolo: { fontSize: 15, fontWeight: '900', fontFamily: 'Fredoka_700Bold', color: palette.inchiostro, flexShrink: 1 },
  pillolaPrincipale: {
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 999,
    backgroundColor: palette.giallo,
    borderWidth: 1.5,
    borderColor: palette.inchiostro,
  },
  pillolaPrincipaleTesto: { fontSize: 8, fontWeight: '900', fontFamily: 'Fredoka_700Bold', color: palette.inchiostro, textTransform: 'uppercase' },
  gruppoDettaglio: { fontSize: 11, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold', color: `${palette.inchiostro}B3`, marginTop: 2 },
  freccia: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: palette.crema,
    borderWidth: 1.5,
    borderColor: palette.inchiostro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invitoRiga: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: `${palette.inchiostro}99`,
    borderStyle: 'dashed',
    padding: 10,
  },
  invitoSinistra: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  invitoIcona: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EAE2D1',
    borderWidth: 1.5,
    borderColor: palette.inchiostro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invitoTitolo: { fontSize: 11, fontWeight: '900', fontFamily: 'Fredoka_700Bold', color: palette.inchiostro, textTransform: 'uppercase' },
  invitoDettaglio: { fontSize: 10, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold', color: `${palette.inchiostro}B3` },
  bottoneEntra: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: palette.inchiostro,
  },
  bottoneEntraTesto: { fontSize: 10, fontWeight: '900', fontFamily: 'Fredoka_700Bold', color: palette.inchiostro },
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
