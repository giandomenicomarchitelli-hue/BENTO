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

export type StatoPartecipazione = 'in_attesa' | 'accettata' | 'rifiutata';

export type SfidaConStato = {
  sfida: Sfida;
  turnoCorrente: TurnoSfida | undefined;
  hoGiaVotatoNelTurnoCorrente: boolean;
  /** null se non ero tra gli invitati originali (es. entrato nel gruppo dopo). */
  mioStatoPartecipazione: StatoPartecipazione | null;
};

/**
 * Come listaSfide, ma con lo stato del turno corrente e se IO ho già
 * votato - per raggruppare l'elenco (in attesa del mio voto / attive /
 * spareggi / concluse) senza una query per sfida. Sempre 3 query fisse
 * indipendentemente da quante sfide ha il gruppo: tutte le sfide, tutti i
 * loro turni in un'unica query con `in()`, e i MIEI voti (RLS li limita
 * comunque alle sole righe proprie, su qualunque turno) per sapere in
 * quali turni ho già votato.
 */
export async function listaSfideConStato(gruppoId: string): Promise<SfidaConStato[]> {
  const sfide = await listaSfide(gruppoId);
  if (sfide.length === 0) {
    return [];
  }

  const turniRes = await supabase
    .from('sfide_turni')
    .select()
    .in('sfida_id', sfide.map((s) => s.id))
    .order('numero_turno', { ascending: true });
  if (turniRes.error) {
    throw turniRes.error;
  }

  const turniPerSfida = new Map<string, TurnoSfida[]>();
  for (const turno of turniRes.data) {
    const lista = turniPerSfida.get(turno.sfida_id) ?? [];
    lista.push(turno);
    turniPerSfida.set(turno.sfida_id, lista);
  }

  // Serve solo sapere se ho votato nel turno CORRENTE di ciascuna sfida: si
  // filtra per quei soli turno_id invece di scaricare tutti i voti di ogni
  // turno mai giocato dall'utente (query che altrimenti cresce senza limite
  // con la storia delle sfide).
  const turniCorrentiIds = sfide
    .map((s) => turniPerSfida.get(s.id)?.at(-1)?.id)
    .filter((id): id is string => id !== undefined);

  const [votiRes, partecipazioneRes] = await Promise.all([
    turniCorrentiIds.length > 0
      ? supabase.from('sfide_voti').select('turno_id').in('turno_id', turniCorrentiIds)
      : Promise.resolve({ data: [] as { turno_id: string }[], error: null }),
    supabase.from('sfide_mia_partecipazione').select('sfida_id, stato').in('sfida_id', sfide.map((s) => s.id)),
  ]);
  if (votiRes.error) {
    throw votiRes.error;
  }
  if (partecipazioneRes.error) {
    throw partecipazioneRes.error;
  }
  const turniVotati = new Set(votiRes.data.map((v) => v.turno_id));
  const mioStatoPerSfida = new Map(
    partecipazioneRes.data
      .filter((p): p is { sfida_id: string; stato: StatoPartecipazione } => p.sfida_id !== null && p.stato !== null)
      .map((p) => [p.sfida_id, p.stato])
  );

  return sfide.map((sfida) => {
    const turni = turniPerSfida.get(sfida.id) ?? [];
    const turnoCorrente = turni[turni.length - 1];
    return {
      sfida,
      turnoCorrente,
      hoGiaVotatoNelTurnoCorrente: turnoCorrente !== undefined && turniVotati.has(turnoCorrente.id),
      mioStatoPartecipazione: mioStatoPerSfida.get(sfida.id) ?? null,
    };
  });
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
  /** null se non ero tra gli invitati originali (es. entrato nel gruppo dopo). */
  mioStatoPartecipazione: StatoPartecipazione | null;
}> {
  const [sfidaRes, turniRes, opzioniRes, mioStatoRes] = await Promise.all([
    supabase.from('sfide_scelta').select().eq('id', sfidaId).maybeSingle(),
    supabase.from('sfide_turni').select().eq('sfida_id', sfidaId).order('numero_turno', { ascending: true }),
    supabase.from('sfide_opzioni').select().eq('sfida_id', sfidaId),
    supabase.from('sfide_mia_partecipazione').select('stato').eq('sfida_id', sfidaId).maybeSingle(),
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
  if (mioStatoRes.error) {
    throw mioStatoRes.error;
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
    mioStatoPartecipazione: mioStatoRes.data?.stato ?? null,
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

/** Accetta o rifiuta l'invito: solo mentre non si è ancora risposto. */
export async function rispondiInvitoSfida(sfidaId: string, accetta: boolean): Promise<void> {
  const { error } = await supabase.rpc('rispondi_invito_sfida', {
    p_sfida_id: sfidaId,
    p_accetta: accetta,
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
