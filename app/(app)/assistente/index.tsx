import { Redirect } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';

import { BentoButton } from '@/components/BentoButton';
import { BentoScreen } from '@/components/BentoScreen';
import { ConfermaAzioni } from '@/components/ConfermaAzioni';
import { useGruppoAttivo } from '@/hooks/useGruppoAttivo';
import { useInterpretazione } from '@/hooks/useInterpretazione';
import { useGruppoAttivoStore } from '@/store/gruppoAttivoStore';
import { bento, raggio, semantica, spaziatura } from '@/theme/tokens';

/** Messaggio leggibile da un errore di rete/Supabase, senza assumere una forma precisa (stesso helper di calendario/index.tsx e faccende/index.tsx). */
function messaggioErrore(errore: unknown): string {
  if (errore instanceof Error && errore.message.trim() !== '') {
    return errore.message;
  }
  return 'Qualcosa è andato storto. Riprova.';
}

export default function Assistente() {
  const gruppoAttivoId = useGruppoAttivoStore((stato) => stato.gruppoAttivoId);

  if (gruppoAttivoId === null) {
    return <Redirect href="/gruppi" />;
  }

  return <AssistenteDelGruppo gruppoAttivoId={gruppoAttivoId} />;
}

function AssistenteDelGruppo({ gruppoAttivoId }: { gruppoAttivoId: string }) {
  const { membriAttivi } = useGruppoAttivo();
  const { interpreta, conferma } = useInterpretazione(gruppoAttivoId);
  const [testo, setTesto] = useState('');

  return (
    <BentoScreen>
      <TextInput
        style={styles.input}
        value={testo}
        onChangeText={setTesto}
        placeholder="Scrivi cosa è successo, es. «ho comprato il sale e ho speso 4 euro»"
        multiline
      />

      <BentoButton
        etichetta="Invia"
        onPress={() => interpreta.mutate(testo)}
        variante="primario"
        disabilitato={interpreta.isPending || testo.trim() === ''}
        caricando={interpreta.isPending}
      />

      {interpreta.error !== null && (
        <Text style={styles.testoErrore}>{messaggioErrore(interpreta.error)}</Text>
      )}

      {interpreta.data !== undefined &&
        (interpreta.data.ambiguo ? (
          <Text style={styles.testoChiarimento}>{interpreta.data.domanda_chiarimento}</Text>
        ) : (
          <ConfermaAzioni
            azioni={interpreta.data.azioni}
            membri={membriAttivi}
            confermando={conferma.isPending}
            onConferma={(azioniRisolte) =>
              conferma.mutate(azioniRisolte, {
                onSuccess: () => {
                  setTesto('');
                  interpreta.reset();
                },
              })
            }
          />
        ))}

      {conferma.error !== null && (
        <Text style={styles.testoErrore}>{messaggioErrore(conferma.error)}</Text>
      )}
    </BentoScreen>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 100,
    backgroundColor: bento.superficieForte,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: bento.bordoForte,
    borderRadius: raggio.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: bento.testoPrimario,
    textAlignVertical: 'top',
  },
  testoChiarimento: {
    fontSize: 14,
    color: bento.testoSecondario,
  },
  testoErrore: {
    fontSize: 13,
    color: semantica.pericolo,
    marginTop: spaziatura.xs,
  },
});
