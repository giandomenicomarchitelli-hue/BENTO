import * as Clipboard from 'expo-clipboard';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { rinominaGruppo } from '@/api/gruppi';
import { esciDalGruppo, rinominaMembro } from '@/api/membri';
import { useGruppoAttivo } from '@/hooks/useGruppoAttivo';
import { useInvalidaMieiGruppi } from '@/hooks/useMieiGruppi';
import { confermaAzione } from '@/lib/conferma';
import { useAuthStore } from '@/store/authStore';
import { useGruppoAttivoStore } from '@/store/gruppoAttivoStore';

export default function Gruppo() {
  const gruppoAttivoId = useGruppoAttivoStore((stato) => stato.gruppoAttivoId);
  const { gruppo, membri, membriAttivi, isLoading, ricarica } = useGruppoAttivo();
  const utenteId = useAuthStore((stato) => stato.session?.user.id);
  const impostaGruppoAttivo = useGruppoAttivoStore((stato) => stato.impostaGruppoAttivo);
  const invalidaMieiGruppi = useInvalidaMieiGruppi();
  const [copiato, setCopiato] = useState(false);
  const [uscendo, setUscendo] = useState(false);

  const [modificandoNomeGruppo, setModificandoNomeGruppo] = useState(false);
  const [bozzaNomeGruppo, setBozzaNomeGruppo] = useState('');
  const [salvandoNomeGruppo, setSalvandoNomeGruppo] = useState(false);

  const [modificandoIlMioNome, setModificandoIlMioNome] = useState(false);
  const [bozzaIlMioNome, setBozzaIlMioNome] = useState('');
  const [salvandoIlMioNome, setSalvandoIlMioNome] = useState(false);

  // Si arriva qui solo dalla dashboard di un gruppo scelto in home; senza
  // un gruppo attivo (es. link diretto, o store resettato da un refresh)
  // si torna all'elenco gruppi invece di restare bloccati in caricamento.
  if (gruppoAttivoId === null) {
    return <Redirect href="/" />;
  }

  if (isLoading || gruppo === null) {
    return (
      <View style={styles.centrato}>
        <ActivityIndicator />
      </View>
    );
  }

  const ilMioMembro = membri.find((m) => m.utente_id === utenteId);

  const confermaUscita = async () => {
    if (ilMioMembro === undefined) {
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
      router.replace('/');
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
      message: `Unisciti al mio gruppo "${gruppo.nome}" su Gestione Casa! Codice invito: ${gruppo.codice_invito}`,
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

  const apriModificaIlMioNome = () => {
    if (ilMioMembro === undefined) {
      return;
    }
    setBozzaIlMioNome(ilMioMembro.nome);
    setModificandoIlMioNome(true);
  };

  const salvaIlMioNome = async () => {
    if (ilMioMembro === undefined) {
      return;
    }
    const nome = bozzaIlMioNome.trim();
    if (nome === '' || nome === ilMioMembro.nome) {
      setModificandoIlMioNome(false);
      return;
    }
    setSalvandoIlMioNome(true);
    try {
      await rinominaMembro(ilMioMembro.id, nome);
      await ricarica();
      setModificandoIlMioNome(false);
    } catch {
      await confermaAzione('Qualcosa è andato storto', 'Riprova.', 'OK');
    } finally {
      setSalvandoIlMioNome(false);
    }
  };

  return (
    <View style={styles.contenitore}>
      {modificandoNomeGruppo ? (
        <View style={styles.rigaModifica}>
          <TextInput
            style={styles.inputTitolo}
            value={bozzaNomeGruppo}
            onChangeText={setBozzaNomeGruppo}
            autoFocus
          />
          {salvandoNomeGruppo ? (
            <ActivityIndicator />
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
        <Pressable style={styles.rigaTitolo} onPress={apriModificaNomeGruppo}>
          <Text style={styles.titolo}>{gruppo.nome}</Text>
          <Text style={styles.linkModifica}>Modifica</Text>
        </Pressable>
      )}

      <Text style={styles.etichetta}>Codice invito</Text>
      <Pressable style={styles.riquadroCodice} onPress={copiaCodice}>
        <Text style={styles.codice}>{gruppo.codice_invito}</Text>
      </Pressable>
      <Text style={styles.suggerimento}>
        {copiato ? 'Copiato!' : 'Tocca il codice per copiarlo'}
      </Text>

      <Pressable style={styles.bottone} onPress={condividiCodice}>
        <Text style={styles.testoBottone}>Condividi invito</Text>
      </Pressable>

      <Text style={[styles.etichetta, styles.etichettaMembri]}>
        Membri ({membriAttivi.length})
      </Text>
      {membriAttivi.map((membro) => {
        const sonoIo = membro.id === ilMioMembro?.id;
        if (sonoIo && modificandoIlMioNome) {
          return (
            <View key={membro.id} style={[styles.membro, styles.rigaModifica]}>
              <TextInput
                style={styles.inputNome}
                value={bozzaIlMioNome}
                onChangeText={setBozzaIlMioNome}
                autoFocus
              />
              {salvandoIlMioNome ? (
                <ActivityIndicator />
              ) : (
                <>
                  <Pressable onPress={salvaIlMioNome} hitSlop={8}>
                    <Text style={styles.linkSalva}>Salva</Text>
                  </Pressable>
                  <Pressable onPress={() => setModificandoIlMioNome(false)} hitSlop={8}>
                    <Text style={styles.linkAnnulla}>Annulla</Text>
                  </Pressable>
                </>
              )}
            </View>
          );
        }
        return (
          <View key={membro.id} style={[styles.membro, styles.rigaMembro]}>
            <Text style={styles.testoMembro}>
              {membro.nome}
              {sonoIo ? ' (tu)' : ''}
            </Text>
            {sonoIo && (
              <Pressable onPress={apriModificaIlMioNome} hitSlop={8}>
                <Text style={styles.linkModifica}>Modifica</Text>
              </Pressable>
            )}
          </View>
        );
      })}

      <Pressable style={styles.bottoneEsci} onPress={confermaUscita} disabled={uscendo}>
        {uscendo ? (
          <ActivityIndicator color="#c0392b" />
        ) : (
          <Text style={styles.testoBottoneEsci}>Esci dal gruppo</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  centrato: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contenitore: {
    flex: 1,
    padding: 24,
  },
  rigaTitolo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 24,
  },
  titolo: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
  },
  rigaModifica: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  inputTitolo: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: '#2d6cdf',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  inputNome: {
    flex: 1,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#2d6cdf',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  linkModifica: {
    color: '#2d6cdf',
    fontSize: 13,
    fontWeight: '600',
  },
  linkSalva: {
    color: '#2d6cdf',
    fontSize: 14,
    fontWeight: '700',
  },
  linkAnnulla: {
    color: '#888',
    fontSize: 14,
  },
  etichetta: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
  },
  riquadroCodice: {
    borderWidth: 1,
    borderColor: '#2d6cdf',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  codice: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 2,
    color: '#2d6cdf',
  },
  suggerimento: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
  },
  bottone: {
    backgroundColor: '#2d6cdf',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  testoBottone: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  etichettaMembri: {
    marginTop: 32,
  },
  membro: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  rigaMembro: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  testoMembro: {
    fontSize: 16,
  },
  bottoneEsci: {
    marginTop: 32,
    alignSelf: 'center',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#c0392b',
  },
  testoBottoneEsci: {
    color: '#c0392b',
    fontSize: 15,
    fontWeight: '600',
  },
});
