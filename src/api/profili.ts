import { leggiUtenteIdCorrente, supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

export type Profilo = Database['public']['Tables']['profili']['Row'];

/** Il profilo dell'utente corrente, o null se non l'ha ancora creato. */
export async function leggiProfiloCorrente(): Promise<Profilo | null> {
  const utenteId = await leggiUtenteIdCorrente();

  const { data, error } = await supabase
    .from('profili')
    .select()
    .eq('utente_id', utenteId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  return data;
}

/**
 * Crea il profilo dell'utente corrente con il nome utente scelto. Si può
 * fare una sola volta: il nome utente è fisso e unico in tutto il sistema.
 */
export async function creaProfilo(nomeUtente: string): Promise<Profilo> {
  const utenteId = await leggiUtenteIdCorrente();

  const { data, error } = await supabase
    .from('profili')
    .insert({ utente_id: utenteId, nome_utente: nomeUtente })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Questo nome utente è già in uso.');
    }
    throw error;
  }
  return data;
}
