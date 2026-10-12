import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY devono essere impostate (vedi .env.example).'
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

/** Id dell'utente autenticato, o errore se non c'è una sessione attiva. */
export async function leggiUtenteIdCorrente(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error('Nessun utente autenticato.');
  }
  return data.user.id;
}
