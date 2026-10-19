import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

export type Sfida = Database['public']['Tables']['sfide_scelta']['Row'];
export type OpzioneSfida = Database['public']['Tables']['sfide_opzioni']['Row'];
export type TurnoSfida = Database['public']['Tables']['sfide_turni']['Row'];
export type RisultatoOpzione = Database['public']['Tables']['sfide_turno_risultati']['Row'];

export async function listaSfide(gruppoId: string): Promise<Sfida[]> {
  const { data, error } = await supabase
    .from('sfide_scelta')
    .select()
    .eq('gruppo_id', gruppoId)
    .order('creata_il', { ascending: false });

  if (error) {
    throw error;
  }
  return data;
}

/**
 * Tutti i dati di una sfida per la sua pagina di dettaglio, aggregati con
 * più query in parallelo (stesso pattern di useGruppoAttivo) - non
 * un'unica query SQL. Il conteggio di chi ha già votato nel turno
 * corrente non può leggere le righe altrui di sfide_voti (RLS le nasconde
 * sempre, anche per chi ha creato la sfida): usa invece la vista
 * sfide_turni_progresso (solo aggregati, mai membro_id/opzione_id - vedi
 * migration 00000000000015). "Ho già votato" invece si deduce dalla
 * lunghezza della propria query su sfide_voti filtrata per turno_id: RLS
 * la limita comunque alle sole righe proprie, quindi length > 0 basta.
 */
export async function leggiSfidaCompleta(sfidaId: string): Promise<{
  sfida: Sfida;
  turni: TurnoSfida[];
  opzioniVisibili: OpzioneSfida[];
  risultatiTurnoCorrente: RisultatoOpzione[];
  partecipantiTotali: number;
  partecipantiCheHannoVotatoNelTurnoCorrente: number;
  hoGiaVotatoNelTurnoCorrente: boolean;
}> {
  const [sfidaRes, turniRes, opzioniRes] = await Promise.all([
    supabase.from('sfide_scelta').select().eq('id', sfidaId).maybeSingle(),
    supabase.from('sfide_turni').select().eq('sfida_id', sfidaId).order('numero_turno', { ascending: true }),
    supabase.from('sfide_opzioni').select().eq('sfida_id', sfidaId),
  ]);

  if (sfidaRes.error) {
    throw sfidaRes.error;
  }
  if (turniRes.error) {
    throw turniRes.error;
  }
  if (opzioniRes.error) {
    throw opzioniRes.error;
  }
  if (sfidaRes.data === null) {
    throw new Error('Sfida non trovata');
  }

  const turni = turniRes.data;
  const turnoCorrente = turni[turni.length - 1];
  if (turnoCorrente === undefined) {
    throw new Error('Sfida senza alcun turno');
  }

  const [risultatiRes, progressoRes, votiRes] = await Promise.all([
    supabase.from('sfide_turno_risultati').select().eq('turno_id', turnoCorrente.id),
    supabase.from('sfide_turni_progresso').select().eq('turno_id', turnoCorrente.id).maybeSingle(),
    supabase.from('sfide_voti').select('id').eq('turno_id', turnoCorrente.id),
  ]);

  if (risultatiRes.error) {
    throw risultatiRes.error;
  }
  if (progressoRes.error) {
    throw progressoRes.error;
  }
  if (votiRes.error) {
    throw votiRes.error;
  }

  return {
    sfida: sfidaRes.data,
    turni,
    opzioniVisibili: opzioniRes.data,
    risultatiTurnoCorrente: risultatiRes.data,
    partecipantiTotali: progressoRes.data?.partecipanti_totali ?? 0,
    partecipantiCheHannoVotatoNelTurnoCorrente: progressoRes.data?.partecipanti_votanti ?? 0,
    hoGiaVotatoNelTurnoCorrente: votiRes.data.length > 0,
  };
}

/**
 * Crea la sfida (snapshot di opzioni/partecipanti, primo turno, voto
 * dell'organizzatore) tramite la RPC atomica crea_sfida.
 *
 * @param params.richiestaId Generato dal CHIAMANTE (crypto.randomUUID()),
 * non da questa funzione: così un retry automatico sulla stessa richiesta
 * può riusare lo stesso id e la RPC (idempotente su richiesta_id) non crea
 * mai una sfida duplicata.
 * @param params.opzioniScelte Id di VOCI DELLA LISTA (voci_lista.id), non
 * di sfide_opzioni: queste ultime non esistono ancora quando si prepara
 * la chiamata, essendo create dalla stessa RPC. Esattamente 3, oppure 2 se
 * propostaPersonalizzata è fornita.
 */
export async function creaSfida(params: {
  listaId: string;
  richiestaId: string;
  titolo: string;
  categoria: string | null;
  attivitaPrecisione: 'giorno' | 'fascia' | 'orario';
  attivitaInizio: string;
  attivitaFine: string | null;
  votazioneScadeIl: string;
  opzioniScelte: string[];
  propostaPersonalizzata: string | null;
}): Promise<string> {
  const { data, error } = await supabase.rpc('crea_sfida', {
    p_lista_id: params.listaId,
    p_richiesta_id: params.richiestaId,
    p_titolo: params.titolo,
    p_categoria: params.categoria,
    p_attivita_precisione: params.attivitaPrecisione,
    p_attivita_inizio: params.attivitaInizio,
    p_attivita_fine: params.attivitaFine,
    p_votazione_scade_il: params.votazioneScadeIl,
    p_opzioni_scelte: params.opzioniScelte,
    p_proposta_personalizzata: params.propostaPersonalizzata,
  });

  if (error) {
    throw error;
  }
  return data;
}

/** Registra il voto (segreto fino alla chiusura) per il turno corrente. */
export async function confermaVoti(params: {
  turnoId: string;
  opzioniScelte: string[];
  propostaPersonalizzata?: string;
}): Promise<void> {
  const { error } = await supabase.rpc('conferma_voti', {
    p_turno_id: params.turnoId,
    p_opzioni_scelte: params.opzioniScelte,
    p_proposta_personalizzata: params.propostaPersonalizzata ?? null,
  });

  if (error) {
    throw error;
  }
}

/** "Riprova la sfida": unica azione esplicita utente dopo un esito senza vincitore. */
export async function ripetiSfida(sfidaId: string): Promise<string> {
  const { data, error } = await supabase.rpc('ripeti_sfida', { p_sfida_id: sfidaId });
  if (error) {
    throw error;
  }
  return data;
}

/** Solo l'organizzatore, solo mentre il turno corrente non è concluso. */
export async function annullaSfida(sfidaId: string): Promise<void> {
  const { error } = await supabase.rpc('annulla_sfida', { p_sfida_id: sfidaId });
  if (error) {
    throw error;
  }
}

/**
 * Sincronizzazione lato client (letta a ogni apertura della lista
 * sfide/di una sfida, stesso principio di sincronizzaOccorrenze):
 * chiude i turni scaduti e genera i promemoria per chi non ha ancora
 * votato quando resta poco tempo.
 */
export async function scadiTurniSfida(gruppoId: string): Promise<void> {
  const { error } = await supabase.rpc('scadi_turni_sfida', { p_gruppo_id: gruppoId });
  if (error) {
    throw error;
  }
}
