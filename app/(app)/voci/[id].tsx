import { Redirect, Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { ModificaAcquisto } from '@/components/ModificaAcquisto';
import { useVociLista } from '@/hooks/useVociLista';

export default function ModificaVoce() {
  const { id, listaId } = useLocalSearchParams<{ id: string; listaId?: string }>();
  const { voci, isLoading, aggiorna } = useVociLista(listaId ?? null);
  const [annullando, setAnnullando] = useState(false);

  if (listaId === undefined) {
    return <Redirect href="/gruppi" />;
  }

  const voce = voci.find((v) => v.id === id);

  if (isLoading || voce === undefined) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: voce.testo }} />
      <ModificaAcquisto
        nome={voce.testo}
        prezzoCentesimi={voce.prezzo_centesimi}
        note={voce.note}
        salvando={aggiorna.isPending}
        annullando={annullando}
        onSalva={(prezzoCentesimi, note) => {
          aggiorna.mutate({ id: voce.id, prezzoCentesimi, note });
        }}
        onAnnullaAcquisto={() => {
          setAnnullando(true);
          aggiorna.mutate(
            { id: voce.id, fatto: false, prezzoCentesimi: null, note: null },
            {
              onSettled: () => setAnnullando(false),
              onSuccess: () => router.back(),
            }
          );
        }}
      />
    </>
  );
}
