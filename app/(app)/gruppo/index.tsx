import * as Clipboard from 'expo-clipboard';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { esciDalGruppo } from '@/api/membri';
import { useGruppoAttivo } from '@/hooks/useGruppoAttivo';
import { useInvalidaMieiGruppi } from '@/hooks/useMieiGruppi';
import { useAuthStore } from '@/store/authStore';
import { useGruppoAttivoStore } from '@/store/gruppoAttivoStore';

export default function Gruppo() {
  const gruppoAttivoId = useGruppoAttivoStore((stato) => stato.gruppoAttivoId);
  const { gruppo, membri, isLoading } = useGruppoAttivo();
  const utenteId = useAuthStore((stato) => stato.session?.user.id);
  const impostaGruppoAttivo = useGruppoAttivoStore((stato) => stato.impostaGruppoAttivo);
  const invalidaMieiGruppi = useInvalidaMieiGruppi();
  const [copiato, setCopiato] = useState(false);
  const [uscendo, setUscendo] = useState(false);

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

  const confermaUscita = () => {
    if (ilMioMembro === undefined) {
      return;
    }
    Alert.alert(
      'Uscire dal gruppo?',
      `Non farai più parte di "${gruppo.nome}" e non vedrai più le sue spese e la sua lista della spesa.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Esci dal gruppo',
          style: 'destructive',
          onPress: async () => {
            setUscendo(true);
            try {
              await esciDalGruppo(ilMioMembro.id);
              impostaGruppoAttivo(null);
              await invalidaMieiGruppi();
              router.replace('/');
            } catch {
              Alert.alert('Qualcosa è andato storto', 'Riprova.');
              setUscendo(false);
            }
          },
        },
      ]
    );
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

  return (
    <View style={styles.contenitore}>
      <Text style={styles.titolo}>{gruppo.nome}</Text>

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
        Membri ({membri.length})
      </Text>
      {membri.map((membro) => (
        <Text key={membro.id} style={styles.membro}>
          {membro.nome}
        </Text>
      ))}

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
  titolo: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24,
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
    fontSize: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
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
