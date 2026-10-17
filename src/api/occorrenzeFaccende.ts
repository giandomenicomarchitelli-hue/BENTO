import { leggiParametroRicorrenza } from '@/api/faccende';
import { calcolaPeriodiMancanti, dataLocaleISO, type DefinizioneRicorrenza } from '@/calcolo/ricorrenzaFaccende';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

export type OccorrenzaFaccenda = Database['public']['Tables']['occorrenze_faccende']['Row'];
export type StoricoFaccenda = Database['public']['Tables']['storico_faccende']['Row'];

export async function listaOccorrenze(gruppoId: string): Promise<OccorrenzaFaccenda[]> {
  const { data, error } = await supabase
    .from('occorrenze_faccende')
    .select()
    .eq('gruppo_id', gruppoId)
    .order('periodo_inizio', { ascending: false });

  if (error) {
    throw error;
  }
  return data;
}

export async function listaStorico(gruppoId: string): Promise<StoricoFaccenda[]> {
  const { data, error } = await supabase
    .from('storico_faccende')
    .select()
    .eq('gruppo_id', gruppoId)
    .order('creato_il', { ascending: false });

  if (error) {
    throw error;
  }
  return data;
}

/**
 * Genera le occorrenze mancanti per tutte le faccende attive del gruppo (una
 * per ogni periodo dovuto, dalla frequenza di ciascuna - vedi
 * src/calcolo/ricorrenzaFaccende.ts) e segna come scadute quelle non
 * completate oltre la scadenza.
 *
 * Sicura da richiamare più volte e da più dispositivi contemporaneamente:
 * la generazione usa un upsert con `ignoreDuplicates` sul vincolo
 * unique(faccenda_id, periodo_inizio) del database (migration
 * 00000000000013_faccende.sql), quindi due chiamate concorrenti con lo
 * stesso risultato calcolato non creano mai una riga doppia. Lo
 * scadenzamento è un update condizionale (`where stato = 'da_fare'`), senza
 * effetto se già applicato da un'altra chiamata.
 */
export async function sincronizzaOccorrenze(gruppoId: string, fusoOrario: string): Promise<void> {
  const [faccendeAttive, occorrenzeEsistenti] = await Promise.all([
    supabase.from('faccende').select().eq('gruppo_id', gruppoId).eq('attiva', true),
    supabase.from('occorrenze_faccende').select('faccenda_id, periodo_inizio').eq('gruppo_id', gruppoId),
  ]);

  if (faccendeAttive.error) {
    throw faccendeAttive.error;
  }
  if (occorrenzeEsistenti.error) {
    throw occorrenzeEsistenti.error;
  }

  const ultimoPeriodoPerFaccenda = new Map<string, string>();
  for (const occorrenza of occorrenzeEsistenti.data) {
    const attuale = ultimoPeriodoPerFaccenda.get(occorrenza.faccenda_id);
    if (attuale === undefined || occorrenza.periodo_inizio > attuale) {
      ultimoPeriodoPerFaccenda.set(occorrenza.faccenda_id, occorrenza.periodo_inizio);
    }
  }

  const oggiISO = dataLocaleISO(new Date(), fusoOrario);
  const righeDaInserire: Database['public']['Tables']['occorrenze_faccende']['Insert'][] = [];

  for (const faccenda of faccendeAttive.data) {
    const definizione: DefinizioneRicorrenza = {
      frequenza: faccenda.frequenza,
      intervalloRicorrenza: faccenda.intervallo_ricorrenza,
      giornoSettimana: leggiParametroRicorrenza(faccenda.parametri_ricorrenza, 'giorno_settimana'),
      giornoMese: leggiParametroRicorrenza(faccenda.parametri_ricorrenza, 'giorno_mese'),
      creatoIl: faccenda.creato_il,
    };

    const periodi = calcolaPeriodiMancanti(
      definizione,
      ultimoPeriodoPerFaccenda.get(faccenda.id) ?? null,
      oggiISO,
      fusoOrario
    );

    for (const periodo of periodi) {
      righeDaInserire.push({
        faccenda_id: faccenda.id,
        gruppo_id: gruppoId,
        periodo_inizio: periodo.periodoInizio,
        periodo_fine: periodo.periodoFine,
        scadenza: periodo.scadenza,
        punti_previsti: faccenda.punti,
      });
    }
  }

  if (righeDaInserire.length > 0) {
    const { error } = await supabase
      .from('occorrenze_faccende')
      .upsert(righeDaInserire, { onConflict: 'faccenda_id,periodo_inizio', ignoreDuplicates: true });
    if (error) {
      throw error;
    }
  }

  const { error: erroreScadenza } = await supabase
    .from('occorrenze_faccende')
    .update({ stato: 'scaduta' })
    .eq('gruppo_id', gruppoId)
    .eq('stato', 'da_fare')
    .lt('scadenza', new Date().toISOString());

  if (erroreScadenza) {
    throw erroreScadenza;
  }
}

/**
 * Completa un'occorrenza: RPC atomica, l'esecutore si ricava sul server da
 * auth.uid() (mai da un parametro), i punti si assegnano insieme
 * all'aggiornamento dello stato nella stessa transazione (vedi migration
 * 00000000000014_faccende_rpc.sql). Impedisce strutturalmente il doppio
 * completamento della stessa occorrenza.
 */
export async function completaOccorrenza(occorrenzaId: string): Promise<void> {
  const { error } = await supabase.rpc('completa_occorrenza', { p_occorrenza_id: occorrenzaId });
  if (error) {
    throw error;
  }
}

/** Annulla un completamento errato: riporta l'occorrenza a "da_fare" e registra l'evento di segno opposto nello storico. */
export async function annullaCompletamentoOccorrenza(occorrenzaId: string): Promise<void> {
  const { error } = await supabase.rpc('annulla_completamento_occorrenza', { p_occorrenza_id: occorrenzaId });
  if (error) {
    throw error;
  }
}
