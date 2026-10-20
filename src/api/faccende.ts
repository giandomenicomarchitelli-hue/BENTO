import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

export type Faccenda = Database['public']['Tables']['faccende']['Row'];
export type Frequenza = Faccenda['frequenza'];
export type Sforzo = Faccenda['sforzo'];
export type OrigineDelPunteggio = Faccenda['origine_punteggio'];
export type ImpostazioniFaccende = Database['public']['Tables']['impostazioni_faccende']['Row'];

/** Legge solo i parametri numerici di ricorrenza che ci interessano da una colonna jsonb, senza fidarsi della forma. */
export function leggiParametroRicorrenza(
  parametri: Database['public']['Tables']['faccende']['Row']['parametri_ricorrenza'],
  chiave: 'giorno_settimana' | 'giorno_mese'
): number | null {
  if (parametri === null || typeof parametri !== 'object' || Array.isArray(parametri)) {
    return null;
  }
  const valore = (parametri as Record<string, unknown>)[chiave];
  return typeof valore === 'number' ? valore : null;
}

/**
 * Legge i giorni della settimana preferiti da parametri_ricorrenza.
 * Gestisce sia il formato nuovo (giorni_settimana: number[]) sia il
 * legacy (giorno_settimana: number) per compatibilità con dati vecchi.
 */
export function leggiGiorniSettimana(
  parametri: Database['public']['Tables']['faccende']['Row']['parametri_ricorrenza']
): number[] | null {
  if (parametri === null || typeof parametri !== 'object' || Array.isArray(parametri)) {
    return null;
  }
  const raw = parametri as Record<string, unknown>;
  if (Array.isArray(raw.giorni_settimana)) {
    const giorni = raw.giorni_settimana.filter((v): v is number => typeof v === 'number');
    return giorni.length > 0 ? giorni : null;
  }
  if (typeof raw.giorno_settimana === 'number') {
    return [raw.giorno_settimana];
  }
  return null;
}

export async function listaFaccende(gruppoId: string): Promise<Faccenda[]> {
  const { data, error } = await supabase
    .from('faccende')
    .select()
    .eq('gruppo_id', gruppoId)
    .order('creato_il', { ascending: true });

  if (error) {
    throw error;
  }
  return data;
}

interface CreaFaccendaParams {
  gruppoId: string;
  nome: string;
  descrizione?: string | null;
  frequenza: Frequenza;
  intervalloRicorrenza?: number | null;
  giorniSettimana?: number[] | null;
  giornoMese?: number | null;
  durataStimataMinuti?: number | null;
  sforzo: Sforzo;
  punti: number;
  origine: OrigineDelPunteggio;
  assegnataA?: string | null;
  creatoDaMembroId?: string | null;
}

export async function creaFaccenda(params: CreaFaccendaParams): Promise<Faccenda> {
  const parametriRicorrenza: Record<string, number | number[]> = {};
  if (params.giorniSettimana !== undefined && params.giorniSettimana !== null && params.giorniSettimana.length > 0) {
    parametriRicorrenza.giorni_settimana = params.giorniSettimana;
  }
  if (params.giornoMese !== undefined && params.giornoMese !== null) {
    parametriRicorrenza.giorno_mese = params.giornoMese;
  }

  const { data, error } = await supabase
    .from('faccende')
    .insert({
      gruppo_id: params.gruppoId,
      nome: params.nome,
      descrizione: params.descrizione ?? null,
      frequenza: params.frequenza,
      intervallo_ricorrenza: params.intervalloRicorrenza ?? null,
      parametri_ricorrenza: parametriRicorrenza,
      durata_stimata_minuti: params.durataStimataMinuti ?? null,
      sforzo: params.sforzo,
      punti: params.punti,
      origine_punteggio: params.origine,
      assegnata_a: params.assegnataA ?? null,
      creato_da: params.creatoDaMembroId ?? null,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }
  return data;
}

interface AggiornaFaccendaParams {
  id: string;
  nome?: string;
  descrizione?: string | null;
  frequenza?: Frequenza;
  intervalloRicorrenza?: number | null;
  giorniSettimana?: number[] | null;
  giornoMese?: number | null;
  durataStimataMinuti?: number | null;
  sforzo?: Sforzo;
  punti?: number;
  origine?: OrigineDelPunteggio;
  assegnataA?: string | null;
  /** false per archiviare: ferma nuove occorrenze, non tocca quelle/lo storico già esistenti. */
  attiva?: boolean;
}

export async function aggiornaFaccenda(params: AggiornaFaccendaParams): Promise<void> {
  const payload: Database['public']['Tables']['faccende']['Update'] = {};

  if (params.nome !== undefined) payload.nome = params.nome;
  if (params.descrizione !== undefined) payload.descrizione = params.descrizione;
  if (params.frequenza !== undefined) payload.frequenza = params.frequenza;
  if (params.intervalloRicorrenza !== undefined) payload.intervallo_ricorrenza = params.intervalloRicorrenza;
  if (params.durataStimataMinuti !== undefined) payload.durata_stimata_minuti = params.durataStimataMinuti;
  if (params.sforzo !== undefined) payload.sforzo = params.sforzo;
  if (params.punti !== undefined) payload.punti = params.punti;
  if (params.origine !== undefined) payload.origine_punteggio = params.origine;
  if (params.assegnataA !== undefined) payload.assegnata_a = params.assegnataA;
  if (params.attiva !== undefined) payload.attiva = params.attiva;

  if (params.giorniSettimana !== undefined || params.giornoMese !== undefined) {
    const parametriRicorrenza: Record<string, number | number[]> = {};
    if (params.giorniSettimana !== undefined && params.giorniSettimana !== null && params.giorniSettimana.length > 0) {
      parametriRicorrenza.giorni_settimana = params.giorniSettimana;
    }
    if (params.giornoMese !== undefined && params.giornoMese !== null) {
      parametriRicorrenza.giorno_mese = params.giornoMese;
    }
    payload.parametri_ricorrenza = parametriRicorrenza;
  }

  const { error } = await supabase.from('faccende').update(payload).eq('id', params.id);
  if (error) {
    throw error;
  }
}

export async function leggiImpostazioniFaccende(gruppoId: string): Promise<ImpostazioniFaccende | null> {
  const { data, error } = await supabase
    .from('impostazioni_faccende')
    .select()
    .eq('gruppo_id', gruppoId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  return data;
}

/** Attiva il modulo Faccende per il gruppo (sola esistenza della riga = attivo). */
export async function attivaModuloFaccende(gruppoId: string): Promise<ImpostazioniFaccende> {
  const { data, error } = await supabase
    .from('impostazioni_faccende')
    .insert({ gruppo_id: gruppoId })
    .select()
    .single();

  if (error) {
    throw error;
  }
  return data;
}

/** Elimina definitivamente una faccenda e tutte le sue occorrenze (cascade). */
export async function eliminaFaccenda(faccendaId: string): Promise<void> {
  const { error } = await supabase.from('faccende').delete().eq('id', faccendaId);
  if (error) {
    throw error;
  }
}

/** Importa il catalogo di faccende suggerite nel gruppo. Restituisce quante ne ha effettivamente inserite (0 se già tutte presenti). */
export async function importaFaccendeSuggerite(gruppoId: string): Promise<number> {
  const { data, error } = await supabase.rpc('importa_faccende_suggerite', { p_gruppo_id: gruppoId });
  if (error) {
    throw error;
  }
  return data;
}
