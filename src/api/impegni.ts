import type { Frequenza } from '@/api/faccende';
import { leggiImpostazioniFaccende } from '@/api/faccende';
import { aggiungiGiorni, dataLocaleISO } from '@/calcolo/ricorrenzaFaccende';
import {
  calcolaOccorrenzeMancantiImpegno,
  type DefinizioneRicorrenzaImpegno,
} from '@/calcolo/ricorrenzaImpegni';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

export type Impegno = Database['public']['Tables']['impegni']['Row'];
export type OccorrenzaImpegno = Database['public']['Tables']['occorrenze_impegni']['Row'];

export async function listaImpegni(gruppoId: string): Promise<Impegno[]> {
  const { data, error } = await supabase
    .from('impegni')
    .select()
    .eq('gruppo_id', gruppoId)
    .eq('attiva', true);

  if (error) {
    throw error;
  }
  return data;
}

export async function listaOccorrenzeImpegni(gruppoId: string): Promise<OccorrenzaImpegno[]> {
  const { data, error } = await supabase
    .from('occorrenze_impegni')
    .select()
    .eq('gruppo_id', gruppoId)
    .order('data_ora', { ascending: true });

  if (error) {
    throw error;
  }
  return data;
}

/** Fuso orario del gruppo per i calcoli di ricorrenza, 'Europe/Rome' se il modulo Faccende non è ancora attivo. */
export async function leggiFusoOrarioGruppo(gruppoId: string): Promise<string> {
  const impostazioni = await leggiImpostazioniFaccende(gruppoId);
  return impostazioni?.fuso_orario ?? 'Europe/Rome';
}

interface ParametriImpegno {
  gruppoId: string;
  membroId: string;
  titolo: string;
  descrizione: string | null;
  dataInizio: string;
  ora: string | null;
  frequenza: Frequenza;
  intervalloRicorrenza: number | null;
  promemoriaMinutiPrima: number | null;
  modificabileDaTutti: boolean;
}

export async function creaImpegno(params: ParametriImpegno): Promise<string> {
  const { data, error } = await supabase
    .from('impegni')
    .insert({
      gruppo_id: params.gruppoId,
      creato_da: params.membroId,
      titolo: params.titolo,
      descrizione: params.descrizione,
      data_inizio: params.dataInizio,
      ora: params.ora,
      frequenza: params.frequenza,
      intervallo_ricorrenza: params.intervalloRicorrenza,
      promemoria_minuti_prima: params.promemoriaMinutiPrima,
      modificabile_da_tutti: params.modificabileDaTutti,
    })
    .select('id')
    .single();

  if (error) {
    throw error;
  }
  return data.id;
}

export async function modificaImpegno(
  impegnoId: string,
  params: Omit<ParametriImpegno, 'gruppoId' | 'membroId'>
): Promise<void> {
  const { error } = await supabase
    .from('impegni')
    .update({
      titolo: params.titolo,
      descrizione: params.descrizione,
      data_inizio: params.dataInizio,
      ora: params.ora,
      frequenza: params.frequenza,
      intervallo_ricorrenza: params.intervalloRicorrenza,
      promemoria_minuti_prima: params.promemoriaMinutiPrima,
      modificabile_da_tutti: params.modificabileDaTutti,
    })
    .eq('id', impegnoId);

  if (error) {
    throw error;
  }
}

/** Soft delete: ferma la generazione di nuove occorrenze, non tocca quelle già esistenti/lo storico delle notifiche. */
export async function cancellaImpegno(impegnoId: string): Promise<void> {
  const { error } = await supabase.from('impegni').update({ attiva: false }).eq('id', impegnoId);
  if (error) {
    throw error;
  }
}

/** Elimina le occorrenze future di un impegno (es. dopo una modifica alla ricorrenza), lasciando intatte quelle passate. */
export async function eliminaOccorrenzeFuture(impegnoId: string): Promise<void> {
  const { error } = await supabase
    .from('occorrenze_impegni')
    .delete()
    .eq('impegno_id', impegnoId)
    .gt('data_ora', new Date().toISOString());

  if (error) {
    throw error;
  }
}

/**
 * Genera le occorrenze mancanti per tutti gli impegni attivi del gruppo,
 * fino a `orizzonteGiorni` giorni da oggi. Stesso schema di
 * sincronizzaOccorrenze in src/api/occorrenzeFaccende.ts: upsert con
 * ignoreDuplicates sul vincolo unique(impegno_id, data_ora), quindi sicura
 * da richiamare più volte/da più dispositivi senza creare righe doppie.
 */
export async function sincronizzaOccorrenzeImpegni(
  gruppoId: string,
  fusoOrario: string,
  orizzonteGiorni: number = 90
): Promise<void> {
  const [impegniAttivi, occorrenzeEsistenti] = await Promise.all([
    supabase.from('impegni').select().eq('gruppo_id', gruppoId).eq('attiva', true),
    supabase.from('occorrenze_impegni').select('impegno_id, data_ora').eq('gruppo_id', gruppoId),
  ]);

  if (impegniAttivi.error) {
    throw impegniAttivi.error;
  }
  if (occorrenzeEsistenti.error) {
    throw occorrenzeEsistenti.error;
  }

  const ultimaDataPerImpegno = new Map<string, string>();
  for (const occorrenza of occorrenzeEsistenti.data) {
    const attuale = ultimaDataPerImpegno.get(occorrenza.impegno_id);
    if (attuale === undefined || occorrenza.data_ora > attuale) {
      ultimaDataPerImpegno.set(occorrenza.impegno_id, occorrenza.data_ora);
    }
  }

  const oggiISO = dataLocaleISO(new Date(), fusoOrario);
  const orizzonteISO = aggiungiGiorni(oggiISO, orizzonteGiorni);
  const righeDaInserire: Database['public']['Tables']['occorrenze_impegni']['Insert'][] = [];

  for (const impegno of impegniAttivi.data) {
    const definizione: DefinizioneRicorrenzaImpegno = {
      frequenza: impegno.frequenza,
      intervalloRicorrenza: impegno.intervallo_ricorrenza,
      dataInizio: impegno.data_inizio,
      ora: impegno.ora,
    };

    const ultimaDataOraEsistente = ultimaDataPerImpegno.get(impegno.id) ?? null;
    const ultimaDataGenerata =
      ultimaDataOraEsistente !== null ? dataLocaleISO(new Date(ultimaDataOraEsistente), fusoOrario) : null;

    const occorrenze = calcolaOccorrenzeMancantiImpegno(definizione, ultimaDataGenerata, orizzonteISO, fusoOrario);

    for (const occorrenza of occorrenze) {
      righeDaInserire.push({
        impegno_id: impegno.id,
        gruppo_id: gruppoId,
        data_ora: occorrenza.istanteISO,
      });
    }
  }

  if (righeDaInserire.length > 0) {
    const { error } = await supabase
      .from('occorrenze_impegni')
      .upsert(righeDaInserire, { onConflict: 'impegno_id,data_ora', ignoreDuplicates: true });
    if (error) {
      throw error;
    }
  }
}
