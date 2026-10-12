import { leggiUtenteIdCorrente, supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

export type Gruppo = Database['public']['Tables']['gruppi']['Row'];

interface CreaGruppoParams {
  nome: string;
  tipo?: Gruppo['tipo'];
  nomeMembro: string;
}

/** Crea un gruppo e iscrive subito il creatore come primo membro. */
export async function creaGruppo({ nome, tipo = 'casa', nomeMembro }: CreaGruppoParams): Promise<Gruppo> {
  const utenteId = await leggiUtenteIdCorrente();

  const { data: gruppo, error: erroreGruppo } = await supabase
    .from('gruppi')
    .insert({ nome, tipo, creato_da: utenteId })
    .select()
    .single();

  if (erroreGruppo) {
    throw erroreGruppo;
  }

  const { error: erroreMembro } = await supabase
    .from('membri')
    .insert({ gruppo_id: gruppo.id, utente_id: utenteId, nome: nomeMembro });

  if (erroreMembro) {
    throw erroreMembro;
  }

  return gruppo;
}

export async function leggiGruppo(gruppoId: string): Promise<Gruppo> {
  const { data, error } = await supabase.from('gruppi').select().eq('id', gruppoId).single();
  if (error) {
    throw error;
  }
  return data;
}

/** Gruppi di cui l'utente corrente è membro. */
export async function listaGruppiUtente(): Promise<Gruppo[]> {
  const utenteId = await leggiUtenteIdCorrente();

  const { data, error } = await supabase
    .from('membri')
    .select('gruppi(*)')
    .eq('utente_id', utenteId)
    .is('uscito_il', null);

  if (error) {
    throw error;
  }
  return data.map((riga) => riga.gruppi);
}
