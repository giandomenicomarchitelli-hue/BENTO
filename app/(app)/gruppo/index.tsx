import { Feather } from '@expo/vector-icons';
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
import { esciDalGruppo } from '@/api/membri';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { useGruppoAttivo } from '@/hooks/useGruppoAttivo';
import { useInvalidaMieiGruppi } from '@/hooks/useMieiGruppi';
import { useSaldi } from '@/hooks/useSaldi';
import { confermaAzione } from '@/lib/conferma';
import { useAuthStore } from '@/store/authStore';
import { useGruppoAttivoStore } from '@/store/gruppoAttivoStore';
import { colori, raggio, spaziatura, tipografia } from '@/theme/tokens';

export default function Gruppo() {
  const gruppoAttivoId = useGruppoAttivoStore((stato) => stato.gruppoAttivoId);
  const { gruppo, membri, membriAttivi, isLoading, ricarica } = useGruppoAttivo();
  const { transazioni, isLoading: saldiInCaricamento } = useSaldi(gruppoAttivoId);
  const utenteId = useAuthStore((stato) => stato.session?.user.id);
  const impostaGruppoAttivo = useGruppoAttivoStore((stato) => stato.impostaGruppoAttivo);
  const invalidaMieiGruppi = useInvalidaMieiGruppi();
  const [copiato, setCopiato] = useState(false);
  const [uscendo, setUscendo] = useState(false);

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
        <ActivityIndicator />
      </View>
    );
  }

  const ilMioMembro = membri.find((m) => m.utente_id === utenteId);
  const hoUnSaldoAperto = transazioni.some(
    (t) => t.da === ilMioMembro?.id || t.a === ilMioMembro?.id
  );

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
        <Feather name="share-2" size={16} color="#fff" />
        <Text style={styles.testoBottone}>Condividi invito</Text>
      </Pressable>

      <View style={styles.rigaEtichettaMembri}>
        <Text style={styles.etichetta}>Membri</Text>
        <Badge testo={String(membriAttivi.length)} tono="blu" />
      </View>
      <View style={styles.cartaMembri}>
        {membriAttivi.map((membro, indice) => (
          <View
            key={membro.id}
            style={[styles.rigaMembro, indice > 0 && styles.rigaMembroDivisa]}
          >
            <Avatar nome={membro.nome} dimensione={32} />
            <Text style={styles.nomeMembro}>
              {membro.nome}
              {membro.id === ilMioMembro?.id ? ' (tu)' : ''}
            </Text>
          </View>
        ))}
      </View>

      <Pressable
        style={styles.bottoneEsci}
        onPress={confermaUscita}
        disabled={uscendo || saldiInCaricamento}
      >
        {uscendo ? (
          <ActivityIndicator color={colori.rosso600} />
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
    backgroundColor: colori.sfondoApp,
    padding: spaziatura.xl,
  },
  rigaTitolo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 10,
    marginBottom: spaziatura.xl,
  },
  titolo: {
    ...tipografia.titolo,
    fontSize: 24,
    textAlign: 'center',
    color: colori.inchiostro900,
  },
  rigaModifica: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: spaziatura.lg,
  },
  inputTitolo: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: colori.blu600,
    borderRadius: raggio.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: colori.inchiostro900,
  },
  linkModifica: {
    color: colori.blu600,
    fontSize: 13,
    fontWeight: '600',
  },
  linkSalva: {
    color: colori.blu600,
    fontSize: 14,
    fontWeight: '700',
  },
  linkAnnulla: {
    color: colori.inchiostro500,
    fontSize: 14,
  },
  etichetta: {
    fontSize: 14,
    color: colori.inchiostro500,
    marginBottom: spaziatura.sm,
  },
  riquadroCodice: {
    backgroundColor: colori.superficie,
    borderWidth: 1,
    borderColor: colori.blu600,
    borderRadius: raggio.sm,
    paddingVertical: 16,
    alignItems: 'center',
  },
  codice: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 2,
    color: colori.blu600,
  },
  suggerimento: {
    fontSize: 13,
    color: colori.inchiostro500,
    textAlign: 'center',
    marginTop: spaziatura.sm,
  },
  bottone: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colori.blu600,
    borderRadius: raggio.sm,
    paddingVertical: 14,
    marginTop: spaziatura.lg,
  },
  testoBottone: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  rigaEtichettaMembri: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spaziatura.xxl,
  },
  cartaMembri: {
    backgroundColor: colori.superficie,
    borderRadius: raggio.md,
    borderWidth: 1,
    borderColor: colori.inchiostro150,
    overflow: 'hidden',
  },
  rigaMembro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spaziatura.md,
    paddingVertical: 10,
    paddingHorizontal: spaziatura.md,
  },
  rigaMembroDivisa: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colori.inchiostro150,
  },
  nomeMembro: {
    fontSize: 15,
    fontWeight: '600',
    color: colori.inchiostro900,
  },
  bottoneEsci: {
    marginTop: spaziatura.xxl,
    alignSelf: 'center',
    borderRadius: raggio.sm,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: colori.rosso600,
  },
  testoBottoneEsci: {
    color: colori.rosso600,
    fontSize: 15,
    fontWeight: '600',
  },
});
