import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Redirect, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { esci } from '@/api/auth';
import type { Gruppo } from '@/api/gruppi';
import { altezzaBarraConSafeArea, BarraInferiore } from '@/components/BarraInferiore';
import { BloccoDuro } from '@/components/BloccoDuro';
import { iconaPerTipoGruppo } from '@/components/GroupPreviewCard';
import { CifraScomparto, Scomparto, stileValoreScomparto } from '@/components/Scomparto';
import { PARETE, Vassoio } from '@/components/Vassoio';
import { useFontBento } from '@/hooks/useFontBento';
import { useMieiGruppi } from '@/hooks/useMieiGruppi';
import { useProfilo } from '@/hooks/useProfilo';
import { useGruppoAttivoStore } from '@/store/gruppoAttivoStore';
import { coloriNB as colori, pesiNB as pesi } from '@/theme/neoBrutalista';

/** Il tipo del gruppo e' l'etichetta in alto allo scomparto, e decide il colore. */
const perTipo: Record<Gruppo['tipo'], { nome: string; colore: string }> = {
  casa: { nome: 'Casa', colore: colori.oro },
  viaggio: { nome: 'Viaggio', colore: colori.menta },
  ufficio: { nome: 'Ufficio', colore: colori.viola },
  altro: { nome: 'Altro', colore: colori.panna },
};

export default function GruppiHome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [fontPronti] = useFontBento();
  const { profilo, isLoading: profiloInCaricamento } = useProfilo();
  const { gruppi, isLoading: gruppiInCaricamento, error: erroreGruppi } = useMieiGruppi();
  const impostaGruppoAttivo = useGruppoAttivoStore((stato) => stato.impostaGruppoAttivo);

  if (profiloInCaricamento || !fontPronti) {
    return (
      <View style={[styles.schermo, styles.centrato]}>
        <ActivityIndicator color={colori.scuro} />
      </View>
    );
  }
  if (profilo === null) {
    return <Redirect href="/crea-profilo" />;
  }

  const inizialeNome = profilo.nome_utente.charAt(0).toUpperCase();

  function apriGruppo(gruppo: Gruppo) {
    impostaGruppoAttivo(gruppo.id);
    router.push('/dashboard');
  }

  // shortcut: griglia a scomparti fino a 6 gruppi; oltre, righe piatte come il feed di Home
  // Due colonne, righe libere: con N dispari l'ultimo scomparto resta da
  // solo nella sua riga e occupa tutta la larghezza.
  const righe: Gruppo[][] = [];
  for (let i = 0; i < gruppi.length; i += 2) {
    righe.push(gruppi.slice(i, i + 2));
  }

  return (
    <View style={styles.schermo}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.contenuto,
          { paddingTop: insets.top + 16, paddingBottom: altezzaBarraConSafeArea(insets.bottom) },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.marchioRiga}>
            <BloccoDuro
              offset={2}
              colore={colori.scuro}
              raggio={9}
              contenutoStyle={styles.logoVassoio}
            >
              <View style={styles.logoRiga}>
                <View style={[styles.logoCella, { backgroundColor: colori.oro }]} />
                <View style={[styles.logoCella, { backgroundColor: colori.menta }]} />
              </View>
              <View style={styles.logoRiga}>
                <View style={[styles.logoCella, { backgroundColor: colori.viola }]} />
                <View style={[styles.logoCella, { backgroundColor: colori.corallo }]} />
              </View>
            </BloccoDuro>
            <Text style={styles.marchio}>
              BENTO<Text style={styles.puntoMarchio}>.</Text>
            </Text>
          </View>
          <View style={styles.azioniHeader}>
            <Pressable onPress={() => esci()} hitSlop={8} style={styles.bottoneEsci}>
              <Feather name="log-out" size={21} color={colori.scuro} />
            </Pressable>
            <Pressable onPress={() => router.push('/profilo')}>
              <BloccoDuro
                offset={2}
                colore={colori.panna}
                raggio={999}
                contenutoStyle={styles.avatarCerchio}
              >
                <Text style={styles.avatarTesto}>{inizialeNome}</Text>
              </BloccoDuro>
            </Pressable>
          </View>
        </View>

        <Text style={styles.titolo}>Gruppi</Text>

        <Vassoio>
          {erroreGruppi ? (
            // useMieiGruppi non espone un refetch: senza azione possibile lo
            // scomparto resta non premibile invece di promettere un "Riprova".
            <Scomparto colore={colori.panna}>
              <CifraScomparto unita="Non riesco a caricare i tuoi gruppi al momento" />
            </Scomparto>
          ) : gruppiInCaricamento ? (
            <Scomparto colore={colori.panna}>
              <ActivityIndicator color={colori.scuro} />
            </Scomparto>
          ) : gruppi.length === 0 ? (
            <Scomparto
              colore={colori.panna}
              nome="Gruppi"
              icona="users"
              azione="Crea il primo"
              onPress={() => router.push('/onboarding/crea-gruppo')}
            >
              <CifraScomparto unita="Nessun gruppo ancora" />
            </Scomparto>
          ) : (
            <View style={styles.mosaico}>
              {righe.map((riga) => (
                <View key={riga[0].id} style={styles.riga}>
                  {riga.map((gruppo) => {
                    const tipo = perTipo[gruppo.tipo];
                    return (
                      <Scomparto
                        key={gruppo.id}
                        style={styles.cella}
                        nome={tipo.nome}
                        icona={iconaPerTipoGruppo(gruppo.tipo).icona}
                        colore={tipo.colore}
                        azione="Entra"
                        onPress={() => apriGruppo(gruppo)}
                      >
                        <Text style={styles.nomeGruppo} numberOfLines={2}>
                          {gruppo.nome}
                        </Text>
                        <Text style={styles.dalGiorno}>
                          Dal {format(new Date(gruppo.creato_il), 'd MMM yyyy', { locale: it })}
                        </Text>
                      </Scomparto>
                    );
                  })}
                </View>
              ))}
            </View>
          )}
        </Vassoio>

        <Vassoio>
          <View style={styles.mosaico}>
            <View style={styles.riga}>
              <Scomparto
                style={styles.cella}
                nome="Crea"
                icona="plus-circle"
                colore={colori.menta}
                azione="Crea"
                onPress={() => router.push('/onboarding/crea-gruppo')}
              >
                <CifraScomparto unita="Un gruppo nuovo" />
              </Scomparto>
              <Scomparto
                style={styles.cella}
                nome="Unisciti"
                icona="user-plus"
                colore={colori.viola}
                azione="Entra"
                onPress={() => router.push('/onboarding/unisciti-a-gruppo')}
              >
                <CifraScomparto unita="Con un codice" />
              </Scomparto>
            </View>
            <Scomparto
              colore={colori.panna}
              azione="Vedi"
              orizzontale
              onPress={() => router.push('/saldi-personali')}
            >
              <View style={styles.rigaFascia}>
                <View style={styles.badgeFascia}>
                  <Feather name="repeat" size={20} color={colori.scuro} />
                </View>
                <View style={styles.testiFascia}>
                  <Text style={styles.nomeFascia}>I miei saldi</Text>
                  <Text style={styles.dettaglioFascia}>Su tutti i gruppi</Text>
                </View>
              </View>
            </Scomparto>
          </View>
        </Vassoio>
      </ScrollView>

      <BarraInferiore attiva="gruppi" />
    </View>
  );
}

const styles = StyleSheet.create({
  schermo: {
    flex: 1,
    backgroundColor: colori.crema,
  },
  centrato: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  contenuto: {
    flexGrow: 1,
    paddingHorizontal: 16,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  marchioRiga: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoVassoio: {
    width: 36,
    height: 36,
    gap: 2,
    overflow: 'hidden',
  },
  logoRiga: {
    flex: 1,
    flexDirection: 'row',
    gap: 2,
  },
  logoCella: {
    flex: 1,
  },
  marchio: {
    ...pesi.extraBold,
    fontSize: 25,
    letterSpacing: -0.5,
    color: colori.scuro,
  },
  puntoMarchio: {
    color: colori.corallo,
  },
  azioniHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  bottoneEsci: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCerchio: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTesto: {
    ...pesi.extraBold,
    fontSize: 15,
    color: colori.scuro,
  },
  titolo: {
    ...pesi.extraBold,
    fontSize: 33,
    lineHeight: 32,
    letterSpacing: -1.15,
    textTransform: 'uppercase',
    color: colori.scuro,
  },
  mosaico: {
    gap: PARETE,
  },
  riga: {
    flexDirection: 'row',
    gap: PARETE,
  },
  cella: {
    flex: 1,
  },
  /** Il nome del gruppo e' il contenuto grande, ma e' testo: non passa da CifraScomparto. */
  nomeGruppo: {
    ...stileValoreScomparto,
    fontSize: 24,
    lineHeight: 26,
  },
  dalGiorno: {
    ...pesi.bold,
    fontSize: 12.5,
    color: colori.soft,
    marginTop: 5,
  },
  rigaFascia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    flexShrink: 1,
  },
  badgeFascia: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colori.scuro,
    backgroundColor: colori.panna,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testiFascia: {
    flexShrink: 1,
  },
  nomeFascia: {
    ...pesi.extraBold,
    fontSize: 11.5,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colori.scuro,
  },
  dettaglioFascia: {
    ...pesi.bold,
    fontSize: 12.5,
    color: colori.soft,
    marginTop: 5,
  },
});
