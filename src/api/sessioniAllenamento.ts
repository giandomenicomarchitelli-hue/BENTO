import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

export type OccorrenzaAllenamento = Database['public']['Tables']['occorrenze_allenamento']['Row'];
export type EsercizioAllenamento = Database['public']['Tables']['esercizi_allenamento']['Row'];

export interface VoceEsercizio {
  nome: string;
  serie: number | null;
  ripetizioni: string | null;
  pesoKg: number | null;
}

/**
 * La sessione (occorrenza + esercizi) di questa scheda in questa data, o
 * null se non è mai stata salvata - un'occorrenza esiste solo se ha almeno
 * un esercizio (vedi salvaSessione), quindi "esiste" equivale a "fatta".
 */
export async function leggiSessione(
  allenamentoId: string,
  data: string
): Promise<{ occorrenza: OccorrenzaAllenamento; esercizi: EsercizioAllenamento[] } | null> {
  const { data: riga, error } = await supabase
    .from('occorrenze_allenamento')
    .select('*, esercizi_allenamento(*)')
    .eq('allenamento_id', allenamentoId)
    .eq('data', data)
    .order('ordine', { referencedTable: 'esercizi_allenamento', ascending: true })
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (riga === null) {
    return null;
  }
  const { esercizi_allenamento, ...occorrenza } = riga;
  return { occorrenza, esercizi: esercizi_allenamento };
}

/**
 * Le occorrenze (sessioni "fatte") dell'utente in un intervallo di date -
 * per sapere, con una sola query, quali giorni della striscia settimanale
 * sono già segnati, invece di interrogare ogni scheda/giorno a parte.
 */
export async function listaOccorrenzeNelPeriodo(
  utenteId: string,
  dataInizio: string,
  dataFine: string
): Promise<OccorrenzaAllenamento[]> {
  const { data, error } = await supabase
    .from('occorrenze_allenamento')
    .select()
    .eq('utente_id', utenteId)
    .gte('data', dataInizio)
    .lte('data', dataFine);

  if (error) {
    throw error;
  }
  return data;
}

/** Gli esercizi dell'ultima sessione salvata di questa scheda prima di questa data, se c'è. */
export async function ultimaSessione(allenamentoId: string, primaDiData: string): Promise<EsercizioAllenamento[]> {
  const { data: occorrenza, error: erroreOccorrenza } = await supabase
    .from('occorrenze_allenamento')
    .select('id')
    .eq('allenamento_id', allenamentoId)
    .lt('data', primaDiData)
    .order('data', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (erroreOccorrenza) {
    throw erroreOccorrenza;
  }
  if (occorrenza === null) {
    return [];
  }

  const { data: esercizi, error } = await supabase
    .from('esercizi_allenamento')
    .select()
    .eq('occorrenza_id', occorrenza.id)
    .order('ordine', { ascending: true });

  if (error) {
    throw error;
  }
  return esercizi;
}

/**
 * Salva per intero gli esercizi di una sessione (sostituisce quelli
 * esistenti): la lista si modifica come un'unica unità nel form, non riga
 * per riga. Con lista vuota elimina l'occorrenza stessa - una sessione
 * senza esercizi non è "fatta" (vedi leggiSessione).
 */
export async function salvaSessione(params: {
  allenamentoId: string;
  utenteId: string;
  data: string;
  esercizi: VoceEsercizio[];
}): Promise<void> {
  if (params.esercizi.length === 0) {
    const { error } = await supabase
      .from('occorrenze_allenamento')
      .delete()
      .eq('allenamento_id', params.allenamentoId)
      .eq('data', params.data);
    if (error) {
      throw error;
    }
    return;
  }

  const { data: occorrenza, error: erroreOccorrenza } = await supabase
    .from('occorrenze_allenamento')
    .upsert(
      { allenamento_id: params.allenamentoId, utente_id: params.utenteId, data: params.data },
      { onConflict: 'allenamento_id,data' }
    )
    .select()
    .single();
  if (erroreOccorrenza) {
    throw erroreOccorrenza;
  }

  const { error: erroreCancella } = await supabase
    .from('esercizi_allenamento')
    .delete()
    .eq('occorrenza_id', occorrenza.id);
  if (erroreCancella) {
    throw erroreCancella;
  }

  const righe = params.esercizi.map((esercizio, indice) => ({
    occorrenza_id: occorrenza.id,
    utente_id: params.utenteId,
    nome: esercizio.nome,
    serie: esercizio.serie,
    ripetizioni: esercizio.ripetizioni,
    peso_kg: esercizio.pesoKg,
    ordine: indice,
  }));
  const { error } = await supabase.from('esercizi_allenamento').insert(righe);
  if (error) {
    throw error;
  }
}
