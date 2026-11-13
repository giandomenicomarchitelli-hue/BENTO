import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { rinominaGruppo } from '@/api/gruppi';
import { esciDalGruppo, impostaNotificheSilenziate } from '@/api/membri';
import { pushSupportata } from '@/lib/pushNotifiche';
import { BloccoDuro } from '@/components/BloccoDuro';
import { useGruppoAttivo } from '@/hooks/useGruppoAttivo';
import { useInvalidaMieiGruppi } from '@/hooks/useMieiGruppi';
import { useSaldi } from '@/hooks/useSaldi';
import { confermaAzione } from '@/lib/conferma';
import { useAuthStore } from '@/store/authStore';
import { useGruppoAttivoStore } from '@/store/gruppoAttivoStore';
import { coloreCiclico, coloriNB as colori, pesiNB as pesi } from '@/theme/neoBrutalista';

function Cerchietto({ nome }: { nome: string }) {
  return (
    <View style={[styles.cerchietto, { backgroundColor: coloreCiclico(nome) }]}>
      <Text style={styles.inizialeCerchietto}>{nome.charAt(0).toUpperCase()}</Text>
    </View>
  );
}

export default function Gruppo() {
  const gruppoAttivoId = useGruppoAttivoStore((stato) => stato.gruppoAttivoId);
  const { gruppo, membri, membriAttivi, isLoading, ricarica } = useGruppoAttivo();
  const { transazioni, isLoading: saldiInCaricamento } = useSaldi(gruppoAttivoId);
  const utenteId = useAuthStore((stato) => stato.session?.user.id);
  const impostaGruppoAttivo = useGruppoAttivoStore((stato) => stato.impostaGruppoAttivo);
  const invalidaMieiGruppi = useInvalidaMieiGruppi();
  const insets = useSafeAreaInsets();
  const [copiato, setCopiato] = useState(false);
  const [uscendo, setUscendo] = useState(false);
  const [cambiandoNotifiche, setCambiandoNotifiche] = useState(false);

  const [modificandoNomeGruppo, setModificandoNomeGruppo] = useState(false);
  const [bozzaNomeGruppo, setBozzaNomeGruppo] = useState('');
  const [salvandoNomeGruppo, setSalvandoNomeGruppo] = useState(false);

  // Si arriva qui solo dalla dashboard di un gruppo scelto; senza un
  // gruppo attivo (es. link diretto, o store resettato da un refresh)
  // si torna all'elenco gruppi invece di restare bloccati in caricamento.
  if (gruppoAttivoId === null) {
    return <Redirect href="/gruppi" />;
  }

  if (isLoading || gruppo === null) {
    return (
      <View style={styles.centrato}>
        <ActivityIndicator color={colori.scuro} />
      </View>
    );
  }

  const ilMioMembro = membri.find((m) => m.utente_id === utenteId);
  const hoUnSaldoAperto = transazioni.some(
    (t) => t.da === ilMioMembro?.id || t.a === ilMioMembro?.id
  );

  const alternaNotifiche = async (silenziate: boolean) => {
    if (ilMioMembro === undefined) {
      return;
    }
    setCambiandoNotifiche(true);
    try {
      await impostaNotificheSilenziate(ilMioMembro.id, silenziate);
      await ricarica();
    } catch {
      await confermaAzione('Qualcosa è andato storto', 'Riprova.', 'OK');
    } finally {
      setCambiandoNotifiche(false);
    }
  };

  const confermaUscita = async () => {
    if (ilMioMembro === undefined) {
      return;
    }

    if (hoUnSaldoAperto) {
      await confermaAzione(
        'Non puoi uscire dal gruppo',
        'Hai un saldo aperto con uno o più membri. Saldalo da "Saldi e spese" prima di uscire.',
        'OK'
      );
      return;
    }

    const conferma = await confermaAzione(
      'Uscire dal gruppo?',
      `Non farai più parte di "${gruppo.nome}" e non vedrai più le sue spese e la sua lista della spesa.`,
      'Esci dal gruppo'
    );
    if (!conferma) {
      return;
    }

    setUscendo(true);
    try {
      await esciDalGruppo(ilMioMembro.id);
      impostaGruppoAttivo(null);
      await invalidaMieiGruppi();
      router.replace('/gruppi');
    } catch {
      await confermaAzione('Qualcosa è andato storto', 'Riprova.', 'OK');
      setUscendo(false);
    }
  };

  const copiaCodice = async () => {
    await Clipboard.setStringAsync(gruppo.codice_invito);
    setCopiato(true);
    setTimeout(() => setCopiato(false), 2000);
  };

  const condividiCodice = () => {
    Share.share({
      message: `Unisciti al mio gruppo "${gruppo.nome}" su Bento! Codice invito: ${gruppo.codice_invito}`,
    });
  };

  const apriModificaNomeGruppo = () => {
    setBozzaNomeGruppo(gruppo.nome);
    setModificandoNomeGruppo(true);
  };

  const salvaNomeGruppo = async () => {
    const nome = bozzaNomeGruppo.trim();
    if (nome === '' || nome === gruppo.nome) {
      setModificandoNomeGruppo(false);
      return;
    }
    setSalvandoNomeGruppo(true);
    try {
      await rinominaGruppo(gruppo.id, nome);
      await Promise.all([ricarica(), invalidaMieiGruppi()]);
      setModificandoNomeGruppo(false);
    } catch {
      await confermaAzione('Qualcosa è andato storto', 'Riprova.', 'OK');
    } finally {
      setSalvandoNomeGruppo(false);
    }
  };

  function tornaIndietro() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/gruppi');
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
          <Text style={styles.titolo}>Gruppo</Text>
        </View>

        {modificandoNomeGruppo ? (
          <View style={styles.rigaModifica}>
            <TextInput
              style={styles.inputTitolo}
              value={bozzaNomeGruppo}
              onChangeText={setBozzaNomeGruppo}
              autoFocus
            />
            {salvandoNomeGruppo ? (
              <ActivityIndicator color={colori.scuro} />
            ) : (
              <>
                <Pressable onPress={salvaNomeGruppo} hitSlop={8}>
                  <Text style={styles.linkSalva}>Salva</Text>
                </Pressable>
                <Pressable onPress={() => setModificandoNomeGruppo(false)} hitSlop={8}>
                  <Text style={styles.linkAnnulla}>Annulla</Text>
                </Pressable>
              </>
            )}
          </View>
        ) : (
          <Pressable style={styles.rigaNomeGruppo} onPress={apriModificaNomeGruppo}>
            <Text style={styles.nomeGruppo} numberOfLines={1}>
              {gruppo.nome}
            </Text>
            <Text style={styles.linkModifica}>Modifica</Text>
          </Pressable>
        )}

        <Text style={styles.etichetta}>Codice invito</Text>
        <Pressable onPress={copiaCodice}>
          <BloccoDuro offset={3} colore={colori.scuro} raggio={14} contenutoStyle={styles.riquadroCodice}>
            <Text style={styles.codice}>{gruppo.codice_invito}</Text>
          </BloccoDuro>
        </Pressable>
        <Text style={styles.suggerimento}>
          {copiato ? 'Copiato!' : 'Tocca il codice per copiarlo'}
        </Text>

        <Pressable style={styles.bottoneCondividi} onPress={condividiCodice}>
          <Feather name="share-2" size={15} color={colori.crema} />
          <Text style={styles.testoBottoneCondividi}>Condividi invito</Text>
        </Pressable>

        {pushSupportata() && ilMioMembro !== undefined && (
          <View style={styles.rigaNotifiche}>
            <View style={styles.testiRigaNotifiche}>
              <Text style={styles.etichettaNotifiche}>Notifiche per questo gruppo</Text>
              <Text style={styles.suggerimento}>
                Le notifiche push vanno attivate una volta sola da Impostazioni profilo.
              </Text>
            </View>
            {cambiandoNotifiche ? (
              <ActivityIndicator color={colori.scuro} />
            ) : (
              <Switch
                value={!ilMioMembro.notifiche_silenziate}
                onValueChange={(attiva) => alternaNotifiche(!attiva)}
                trackColor={{ false: colori.panna, true: colori.menta }}
                thumbColor={colori.crema}
              />
            )}
          </View>
        )}

        <View style={styles.rigaEtichettaMembri}>
          <Text style={styles.etichetta}>Membri</Text>
          <Text style={styles.contatoreMembri}>{membriAttivi.length}</Text>
        </View>
        <BloccoDuro offset={4} colore={colori.scuro} raggio={16} contenutoStyle={styles.pareteMembri}>
          <View style={styles.righeMembri}>
            {membriAttivi.map((membro) => (
              <View key={membro.id} style={styles.rigaMembro}>
                <Cerchietto nome={membro.nome} />
                <Text style={styles.nomeMembro}>
                  {membro.nome}
                  {membro.id === ilMioMembro?.id ? ' (tu)' : ''}
                </Text>
              </View>
            ))}
          </View>
        </BloccoDuro>

        <Pressable
          style={styles.bottoneEsci}
          onPress={confermaUscita}
          disabled={uscendo || saldiInCaricamento}
        >
          {uscendo ? (
            <ActivityIndicator color={colori.corallo} />
          ) : (
            <Text style={styles.testoBottoneEsci}>Esci dal gruppo</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centrato: {
    flex: 1,
    backgroundColor: colori.crema,
    alignItems: 'center',
    justifyContent: 'center',
  },
  schermo: {
    flex: 1,
    backgroundColor: colori.crema,
  },
  contenuto: {
    paddingHorizontal: 16,
  },
  rigaTitolo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginBottom: 18,
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
  rigaNomeGruppo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  nomeGruppo: {
    ...pesi.extraBold,
    fontSize: 24,
    letterSpacing: -0.4,
    color: colori.scuro,
    flexShrink: 1,
  },
  rigaModifica: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },
  inputTitolo: {
    flex: 1,
    ...pesi.bold,
    fontSize: 18,
    borderWidth: 2,
    borderColor: colori.scuro,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: colori.scuro,
    backgroundColor: colori.panna,
  },
  linkModifica: {
    ...pesi.extraBold,
    fontSize: 12.5,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: colori.soft,
  },
  linkSalva: {
    ...pesi.extraBold,
    fontSize: 14,
    color: colori.menta,
  },
  linkAnnulla: {
    ...pesi.bold,
    fontSize: 14,
    color: colori.soft,
  },
  etichetta: {
    ...pesi.extraBold,
    fontSize: 12.5,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: colori.soft,
    marginBottom: 8,
  },
  riquadroCodice: {
    paddingVertical: 18,
    alignItems: 'center',
    backgroundColor: colori.panna,
  },
  codice: {
    ...pesi.extraBold,
    fontSize: 28,
    letterSpacing: 2,
    color: colori.scuro,
  },
  suggerimento: {
    ...pesi.bold,
    fontSize: 12.5,
    color: colori.soft,
    textAlign: 'center',
    marginTop: 8,
  },
  bottoneCondividi: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colori.scuro,
    borderRadius: 12,
    paddingVertical: 13,
    marginTop: 18,
  },
  testoBottoneCondividi: {
    ...pesi.extraBold,
    fontSize: 13,
    letterSpacing: 0.3,
    color: colori.crema,
  },
  rigaNotifiche: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 24,
  },
  testiRigaNotifiche: {
    flex: 1,
  },
  etichettaNotifiche: {
    ...pesi.bold,
    fontSize: 14.5,
    color: colori.scuro,
    marginBottom: 2,
  },
  rigaEtichettaMembri: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  contatoreMembri: {
    ...pesi.extraBold,
    fontSize: 12.5,
    color: colori.soft,
  },
  pareteMembri: {
    borderRadius: 16 - 2.5,
    overflow: 'hidden',
    backgroundColor: colori.scuro,
  },
  righeMembri: {
    gap: 2,
    backgroundColor: colori.scuro,
  },
  rigaMembro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colori.panna,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  cerchietto: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inizialeCerchietto: {
    ...pesi.extraBold,
    fontSize: 13,
    color: colori.scuro,
  },
  nomeMembro: {
    ...pesi.bold,
    fontSize: 14.5,
    color: colori.scuro,
  },
  bottoneEsci: {
    marginTop: 28,
    alignSelf: 'center',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: colori.corallo,
  },
  testoBottoneEsci: {
    ...pesi.extraBold,
    fontSize: 13.5,
    color: colori.corallo,
  },
});
