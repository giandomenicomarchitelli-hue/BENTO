import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack initialRouteName="accedi">
      <Stack.Screen name="accedi" options={{ title: 'Accedi' }} />
      <Stack.Screen name="registrati" options={{ title: 'Crea account' }} />
    </Stack>
  );
}
