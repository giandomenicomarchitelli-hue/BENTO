import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'I tuoi gruppi' }} />
      <Stack.Screen name="dashboard" options={{ title: 'Gestione Casa' }} />
      <Stack.Screen name="lista-spesa" options={{ title: 'Lista della spesa' }} />
      <Stack.Screen name="spese/index" options={{ title: 'Spese' }} />
      <Stack.Screen name="spese/nuova" options={{ title: 'Nuova spesa' }} />
      <Stack.Screen name="saldi" options={{ title: 'Saldi' }} />
      <Stack.Screen name="gruppo/index" options={{ title: 'Il tuo gruppo' }} />
      <Stack.Screen name="onboarding/crea-gruppo" options={{ title: 'Crea un gruppo' }} />
      <Stack.Screen
        name="onboarding/unisciti-a-gruppo"
        options={{ title: 'Unisciti a un gruppo' }}
      />
    </Stack>
  );
}
