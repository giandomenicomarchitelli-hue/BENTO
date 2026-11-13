import { focusManager, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, AppState, type AppStateStatus, Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { queryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/store/authStore';

// Senza questo, tornare all'app dopo averla messa in background non
// riattiva mai il refetch automatico dei dati scaduti (staleTime 30s):
// React Query ragiona per "focus" della finestra, che sul web arriva
// gratis dal browser ma in React Native va collegato a mano ad AppState
// (ricetta ufficiale della libreria). Su web il comportamento di default
// resta quello giusto, per questo qui si ferma presto.
function useRiattivaQueryInPrimoPiano() {
  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }
    function alCambioStato(stato: AppStateStatus) {
      focusManager.setFocused(stato === 'active');
    }
    const sottoscrizione = AppState.addEventListener('change', alCambioStato);
    return () => sottoscrizione.remove();
  }, []);
}

// Il server di sviluppo di Expo Router non applica app/+html.tsx (solo
// l'export statico lo fa), quindi i tag per l'icona della scorciatoia
// aggiunta alla home da Safari/Chrome si inseriscono qui a runtime.
function useIconaWeb() {
  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = '/favicon.png';
    document.head.appendChild(link);

    const appleTouchIcon = document.createElement('link');
    appleTouchIcon.rel = 'apple-touch-icon';
    appleTouchIcon.href = '/apple-touch-icon.png';
    document.head.appendChild(appleTouchIcon);

    const metaTag = (name: string, content: string) => {
      const meta = document.createElement('meta');
      meta.name = name;
      meta.content = content;
      document.head.appendChild(meta);
    };
    metaTag('apple-mobile-web-app-capable', 'yes');
    metaTag('apple-mobile-web-app-title', 'Bento');
    metaTag('theme-color', '#F8F9FA');
  }, []);
}

function Navigazione() {
  const session = useAuthStore((stato) => stato.session);
  const isLoading = useAuthStore((stato) => stato.isLoading);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerTitleAlign: 'center' }}>
      <Stack.Protected guard={session !== null}>
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={session === null}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  useIconaWeb();
  useRiattivaQueryInPrimoPiano();

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <Navigazione />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
