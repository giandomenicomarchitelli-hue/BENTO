import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'I tuoi gruppi' }} />
      <Stack.Screen name="dashboard" options={{ title: 'Gestione Casa' }} />
      <Stack.Screen name="lista-spesa" options={{ title: 'Lista della spesa' }} />
      <Stack.Screen name="spese/nuova" options={{ title: 'Nuova spesa' }} />
      <Stack.Screen name="saldi/index" options={{ title: 'Saldi e spese' }} />
      <Stack.Screen name="saldi/salda" options={{ title: 'Salda un debito' }} />
      <Stack.Screen name="liste/index" options={{ title: 'Liste' }} />
      <Stack.Screen name="liste/[id]" options={{ title: 'Lista' }} />
      <Stack.Screen name="gruppo/index" options={{ title: 'Il tuo gruppo' }} />
      <Stack.Screen name="onboarding/crea-gruppo" options={{ title: 'Crea un gruppo' }} />
      <Stack.Screen
        name="onboarding/unisciti-a-gruppo"
        options={{ title: 'Unisciti a un gruppo' }}
      />
    </Stack>
  );
}
