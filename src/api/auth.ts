import { supabase } from '@/lib/supabase';

/**
 * Registra un nuovo utente. Restituisce true se la sessione è stata creata
 * subito, false se il progetto Supabase richiede la conferma via email
 * (in quel caso l'utente esiste ma non è ancora autenticato).
 */
export async function registrati(email: string, password: string): Promise<boolean> {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    throw error;
  }
  return data.session !== null;
}

export async function accedi(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw error;
  }
}

export async function esci(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}
