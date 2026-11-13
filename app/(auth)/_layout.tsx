import { Stack } from 'expo-router';

// Stesso linguaggio "a comparsa" del resto dell'app (vedi app/(app)/_layout.tsx):
// prima di questa correzione accedi/registrati erano le uniche rotte rimaste
// con lo scorrimento da destra di default di iOS.
const FADE = { animation: 'fade', animationDuration: 120 } as const;

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="accedi" options={{ headerShown: false, ...FADE }} />
      <Stack.Screen name="registrati" options={{ headerShown: false, ...FADE }} />
    </Stack>
  );
}
