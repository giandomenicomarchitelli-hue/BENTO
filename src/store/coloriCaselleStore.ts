import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Preferenza puramente personale (non condivisa con gli altri membri del
 * gruppo, vedi HANDOFF): salvata solo su questo dispositivo via
 * AsyncStorage, non sul profilo lato server. Niente RLS/migration da
 * toccare per una cosa puramente cosmetica che non deve sincronizzarsi
 * tra dispositivi.
 */
interface ColoriCaselleStore {
  coloriCaselle: Record<string, string>;
  impostaColoreCasella: (chiave: string, colore: string) => void;
  resetColoreCasella: (chiave: string) => void;
}

export const useColoriCaselleStore = create<ColoriCaselleStore>()(
  persist(
    (set) => ({
      coloriCaselle: {},
      impostaColoreCasella: (chiave, colore) =>
        set((stato) => ({ coloriCaselle: { ...stato.coloriCaselle, [chiave]: colore } })),
      resetColoreCasella: (chiave) =>
        set((stato) => {
          const { [chiave]: _rimossa, ...resto } = stato.coloriCaselle;
          return { coloriCaselle: resto };
        }),
    }),
    {
      name: 'colori-caselle',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

/** Il colore scelto dall'utente per questa casella, o il default se non l'ha mai cambiato. */
export function useColoreCasella(chiave: string, coloreDefault: string): string {
  return useColoriCaselleStore((stato) => stato.coloriCaselle[chiave] ?? coloreDefault);
}
