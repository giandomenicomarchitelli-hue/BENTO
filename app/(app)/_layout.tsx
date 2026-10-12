import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Gestione Casa' }} />
      <Stack.Screen name="onboarding/index" options={{ title: 'Benvenuto' }} />
      <Stack.Screen name="onboarding/crea-gruppo" options={{ title: 'Crea un gruppo' }} />
      <Stack.Screen
        name="onboarding/unisciti-a-gruppo"
        options={{ title: 'Unisciti a un gruppo' }}
      />
    </Stack>
  );
}
