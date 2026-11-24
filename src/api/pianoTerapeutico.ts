import { aggiungiGiorni } from '@/calcolo/ricorrenzaFaccende';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

export type PianoTerapeutico = Database['public']['Tables']['piani_terapeutici']['Row'];
export type DosePiano = Database['public']['Tables']['dosi_piano_terapeutico']['Row'];

/** Piani attivi dell'utente, in nessun ordine particolare (pochi per utente). */
export async function listaPiani(utenteId: string): Promise<PianoTerapeutico[]> {
  const { data, error } = await supabase
    .from('piani_terapeutici')
    .select()
    .eq('utente_id', utenteId)
    .eq('attivo', true)
    .order('creato_il', { ascending: true });

  if (error) {
    throw error;
  }
  return data;
}

/**
 * Crea il piano e genera subito tutte le dosi previste (un giorno per
 * volta, un orario per volta): una terapia dura giorni/settimane, non
 * all'infinito, quindi il totale resta piccolo e si può generare tutto in
 * anticipo invece di materializzarlo via via come per gli allenamenti.
 */
export async function creaPiano(params: {
  utenteId: string;
  nome: string;
  orari: string[];
  dataInizio: string;
  durataGiorni: number;
  quantitaConfezione: number;
}): Promise<PianoTerapeutico> {
  const { data: piano, error: erroreCreazione } = await supabase
    .from('piani_terapeutici')
    .insert({
      utente_id: params.utenteId,
      nome: params.nome,
      orari: params.orari,
      data_inizio: params.dataInizio,
      durata_giorni: params.durataGiorni,
      quantita_confezione: params.quantitaConfezione,
    })
    .select()
    .single();

  if (erroreCreazione) {
    throw erroreCreazione;
  }

  const dosi: Database['public']['Tables']['dosi_piano_terapeutico']['Insert'][] = [];
  for (let giorno = 0; giorno < params.durataGiorni; giorno++) {
    const data = aggiungiGiorni(params.dataInizio, giorno);
    for (const orario of params.orari) {
      dosi.push({ piano_id: piano.id, utente_id: params.utenteId, data, orario });
    }
  }
  const { error: erroreDosi } = await supabase.from('dosi_piano_terapeutico').insert(dosi);
  if (erroreDosi) {
    throw erroreDosi;
  }

  return piano;
}

/** Disattiva il piano (soft delete): le dosi già spuntate restano nello storico. */
export async function eliminaPiano(id: string): Promise<void> {
  const { error } = await supabase.from('piani_terapeutici').update({ attivo: false }).eq('id', id);
  if (error) {
    throw error;
  }
}

/**
 * Tutte le dosi dell'utente, di ogni piano insieme: una query sola invece
 * di una per piano, cosi' l'avviso scorta si vede su ogni scheda anche
 * senza averla aperta.
 */
export async function listaDosiUtente(utenteId: string): Promise<DosePiano[]> {
  const { data, error } = await supabase
    .from('dosi_piano_terapeutico')
    .select()
    .eq('utente_id', utenteId)
    .order('data', { ascending: true })
    .order('orario', { ascending: true });

  if (error) {
    throw error;
  }
  return data;
}

export async function aggiornaDose(doseId: string, assunta: boolean): Promise<void> {
  const { error } = await supabase
    .from('dosi_piano_terapeutico')
    .update({ assunta, assunta_il: assunta ? new Date().toISOString() : null })
    .eq('id', doseId);

  if (error) {
    throw error;
  }
}
