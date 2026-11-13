import NetInfo from '@react-native-community/netinfo';
import { onlineManager, QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
    },
  },
});

// Senza questo, React Query non sa mai che il telefono è andato offline:
// su web lo stato online/offline arriva gratis dal browser, in React
// Native va collegato a mano (ricetta ufficiale della libreria). Tocca
// solo i retry/refetch automatici "al riconnettersi" - niente a che fare
// con la vera UI offline (non c'è, qui serve solo a non restare con dati
// vecchi dopo un buco di rete). Il focus da app in background va invece
// collegato da un componente (serve AppState + un useEffect per il
// cleanup): vedi RootLayout in app/_layout.tsx.
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((stato) => {
    setOnline(stato.isConnected ?? false);
  });
});
