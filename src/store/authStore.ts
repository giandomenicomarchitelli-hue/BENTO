import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import { supabase } from '@/lib/supabase';

interface AuthStore {
  session: Session | null;
  /** true finché non si è ancora capito se c'è una sessione salvata. */
  isLoading: boolean;
}

export const useAuthStore = create<AuthStore>(() => ({
  session: null,
  isLoading: true,
}));

// Il modulo è un singleton (come lo store): la sottoscrizione va fatta una
// sola volta per l'intera vita dell'app, non ad ogni render di un componente.
supabase.auth.onAuthStateChange((_evento, session) => {
  useAuthStore.setState({ session, isLoading: false });
});
