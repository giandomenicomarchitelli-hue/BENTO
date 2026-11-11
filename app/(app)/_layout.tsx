import { Stack } from 'expo-router';

// Ogni rotta apre a comparsa (fade, 120ms) e non con lo scorrimento da
// destra di default di iOS: tutte le schermate condividono lo stesso
// linguaggio visivo "a vassoio", e un mix di transizioni diverse si
// notava passando da una all'altra. Le tre rotte già così
// (index/gruppi/personale) erano le uniche: estesa a tutte le altre.
const FADE = { animation: 'fade', animationDuration: 120 } as const;

export default function AppLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false, ...FADE }} />
      <Stack.Screen name="gruppi/index" options={{ headerShown: false, ...FADE }} />
      <Stack.Screen name="crea-profilo" options={{ title: 'Nome utente', ...FADE }} />
      <Stack.Screen name="profilo" options={{ title: 'Il mio profilo', ...FADE }} />
      <Stack.Screen name="dashboard" options={{ headerShown: false, ...FADE }} />
      <Stack.Screen name="prototipo-ui" options={{ headerShown: false }} />
      <Stack.Screen name="prototipo-gruppi" options={{ headerShown: false }} />
      <Stack.Screen name="prototipo-casa" options={{ headerShown: false }} />
      <Stack.Screen name="lista-spesa" options={{ headerShown: false, ...FADE }} />
      <Stack.Screen name="articoli/[id]" options={{ title: 'Articolo', ...FADE }} />
      <Stack.Screen name="assistente/index" options={{ headerShown: false, ...FADE }} />
      <Stack.Screen name="voci/[id]" options={{ title: 'Voce', ...FADE }} />
      <Stack.Screen name="spese/nuova" options={{ title: 'Nuova spesa', ...FADE }} />
      <Stack.Screen name="saldi/index" options={{ headerShown: false, ...FADE }} />
      <Stack.Screen name="saldi/salda" options={{ headerShown: false, ...FADE }} />
      <Stack.Screen name="saldi-personali/index" options={{ headerShown: false, ...FADE }} />
      <Stack.Screen name="saldi-personali/[utenteId]" options={{ headerShown: false, ...FADE }} />
      <Stack.Screen name="liste/index" options={{ headerShown: false, ...FADE }} />
      <Stack.Screen name="liste/[id]" options={{ title: 'Lista', ...FADE }} />
      <Stack.Screen name="personale/index" options={{ headerShown: false, ...FADE }} />
      <Stack.Screen name="personale/liste/index" options={{ headerShown: false, ...FADE }} />
      <Stack.Screen name="personale/liste/[id]" options={{ title: 'Lista', ...FADE }} />
      <Stack.Screen name="personale/note/index" options={{ headerShown: false, ...FADE }} />
      <Stack.Screen name="personale/note/[id]" options={{ headerShown: false, ...FADE }} />
      <Stack.Screen name="personale/calendario/index" options={{ headerShown: false, ...FADE }} />
      <Stack.Screen name="gruppo/index" options={{ headerShown: false, ...FADE }} />
      <Stack.Screen name="calendario/index" options={{ headerShown: false, ...FADE }} />
      <Stack.Screen name="faccende/index" options={{ headerShown: false, ...FADE }} />
      <Stack.Screen name="sfide/index" options={{ headerShown: false, ...FADE }} />
      <Stack.Screen name="sfide/nuova" options={{ headerShown: false, ...FADE }} />
      <Stack.Screen name="sfide/[id]" options={{ headerShown: false, ...FADE }} />
      <Stack.Screen name="notifiche/index" options={{ headerShown: false, ...FADE }} />
      <Stack.Screen name="onboarding/crea-gruppo" options={{ title: 'Crea un gruppo', ...FADE }} />
      <Stack.Screen
        name="onboarding/unisciti-a-gruppo"
        options={{ title: 'Unisciti a un gruppo', ...FADE }}
      />
    </Stack>
  );
}
