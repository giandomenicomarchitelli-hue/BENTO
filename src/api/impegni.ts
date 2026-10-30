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
  // Finestra temporale limitata: senza un limite, il risultato crescerebbe
  // senza fine per tutta la vita del gruppo. Se mai troncato dal cap di
  // default di PostgREST, l'ordine ascendente scarterebbe le righe più
  // vecchie, non quelle future/più rilevanti - ma è comunque più sicuro
  // limitare esplicitamente a quanto la UI (griglia mensile + lista
  // giornaliera) può davvero mostrare.
  const adesso = new Date();
  const dataMinima = new Date(adesso);
  dataMinima.setMonth(dataMinima.getMonth() - 1);
  const dataMassima = new Date(adesso);
  dataMassima.setMonth(dataMassima.getMonth() + 12);

  const { data, error } = await supabase
    .from('occorrenze_impegni')
    .select()
    .eq('gruppo_id', gruppoId)
    .gte('data_ora', dataMinima.toISOString())
    .lte('data_ora', dataMassima.toISOString())
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
  assegnatoA?: string | null;
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
      assegnato_a: params.assegnatoA,
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
  const { data, error } = await supabase
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
      assegnato_a: params.assegnatoA,
    })
    .eq('id', impegnoId)
    .select('id');

  if (error) {
    throw error;
  }
  // Grant a livello di tabella + RLS "bloccata" da chi non ha creato
  // l'impegno (vedi impegni_update) fanno sì che un UPDATE respinto dalla
  // policy restituisca 0 righe, non un errore: senza questo controllo
  // l'utente non vedrebbe nulla succedere, senza nessuna spiegazione.
  if (data.length === 0) {
    throw new Error('Solo chi ha creato questo impegno può modificarlo.');
  }
}

/** Soft delete: ferma la generazione di nuove occorrenze, non tocca quelle già esistenti/lo storico delle notifiche. */
export async function cancellaImpegno(impegnoId: string): Promise<void> {
  const { data, error } = await supabase
    .from('impegni')
    .update({ attiva: false })
    .eq('id', impegnoId)
    .select('id');
  if (error) {
    throw error;
  }
  // Stesso ragionamento di modificaImpegno: un DELETE/UPDATE bloccato dalla
  // policy RLS restituisce 0 righe, non un errore.
  if (data.length === 0) {
    throw new Error('Solo chi ha creato questo impegno può eliminarlo.');
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
