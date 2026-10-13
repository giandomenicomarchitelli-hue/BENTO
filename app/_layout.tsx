import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { queryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/store/authStore';

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
    metaTag('apple-mobile-web-app-title', 'Gestione Casa');
    metaTag('theme-color', '#2d6cdf');
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

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <Navigazione />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
