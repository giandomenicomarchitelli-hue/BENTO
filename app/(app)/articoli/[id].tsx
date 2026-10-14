import { Redirect, Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { ModificaAcquisto } from '@/components/ModificaAcquisto';
import { useArticoliSpesa } from '@/hooks/useArticoliSpesa';
import { useGruppoAttivoStore } from '@/store/gruppoAttivoStore';

export default function ModificaArticolo() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const gruppoAttivoId = useGruppoAttivoStore((stato) => stato.gruppoAttivoId);
  const { articoli, isLoading, aggiorna } = useArticoliSpesa(gruppoAttivoId);
  const [annullando, setAnnullando] = useState(false);

  if (gruppoAttivoId === null) {
    return <Redirect href="/gruppi" />;
  }

  const articolo = articoli.find((a) => a.id === id);

  if (isLoading || articolo === undefined) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: articolo.nome }} />
      <ModificaAcquisto
        nome={articolo.nome}
        prezzoCentesimi={articolo.prezzo_centesimi}
        note={articolo.note}
        salvando={aggiorna.isPending}
        annullando={annullando}
        onSalva={(prezzoCentesimi, note) => {
          aggiorna.mutate({ id: articolo.id, prezzoCentesimi, note });
        }}
        onAnnullaAcquisto={() => {
          setAnnullando(true);
          aggiorna.mutate(
            {
              id: articolo.id,
              stato: 'da_comprare',
              compratoDa: null,
              prezzoCentesimi: null,
              note: null,
            },
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
