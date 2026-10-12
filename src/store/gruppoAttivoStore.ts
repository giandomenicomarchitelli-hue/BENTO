import { create } from 'zustand';

interface GruppoAttivoStore {
  gruppoAttivoId: string | null;
  impostaGruppoAttivo: (gruppoId: string | null) => void;
}

export const useGruppoAttivoStore = create<GruppoAttivoStore>((set) => ({
  gruppoAttivoId: null,
  impostaGruppoAttivo: (gruppoId) => set({ gruppoAttivoId: gruppoId }),
}));
