import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="accedi" options={{ title: 'Accedi' }} />
      <Stack.Screen name="registrati" options={{ title: 'Crea account' }} />
    </Stack>
  );
}
