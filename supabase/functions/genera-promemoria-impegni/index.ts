// Invocata ogni 15 minuti da pg_cron via net.http_post (vedi migration
// 00000000000031): rete di sicurezza indipendente dai client - genera le
// occorrenze future anche se nessun telefono apre mai l'app, ed è l'unico
// punto che inserisce i promemoria (le push vere e proprie partono dal
// trigger esistente su public.notifiche, Task 3 - questa funzione non
// chiama mai invia-push-notifica direttamente).
// Deployata con --no-verify-jwt: il cron non porta un JWT utente, stesso
// ragionamento di invia-push-notifica/index.ts. Usa
// SUPABASE_SERVICE_ROLE_KEY (iniettata automaticamente da Supabase) per
// leggere/scrivere tabelle di qualsiasi gruppo - richiede i GRANT su
// service_role aggiunti in migration 031 (service_role bypassa la RLS ma
// non i GRANT di tabella, vedi commento in migration 027).

import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') as string,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
);

// --- Motore di ricorrenza, portato da src/calcolo/ricorrenzaImpegni.ts e
// dalle utility di ricorrenzaFaccende.ts che usa. Un'Edge Function è un
// deployment separato da Metro/Expo: non può importare da src/, quindi
// questa logica pura (nessuna dipendenza React Native) è copiata qui
// 1:1, inclusi i casi limite già testati in ricorrenzaImpegni.test.ts
// (clamping di fine mese, settimanale "da data di inizio" non "dalla
// settimana contenente", tetto di sicurezza per sincronizzazione).

type Frequenza = 'giornaliera' | 'settimanale' | 'mensile' | 'personalizzata' | 'una_tantum';

interface DefinizioneRicorrenzaImpegno {
  frequenza: Frequenza;
  intervalloRicorrenza: number | null;
  dataInizio: string;
  ora: string | null;
}

interface OccorrenzaImpegnoCalcolata {
  dataISO: string;
  istanteISO: string;
}

const MAX_PERIODI_PER_SINCRONIZZAZIONE = 60;

function scomponiISO(dataISO: string): { anno: number; mese: number; giorno: number } {
  const [anno, mese, giorno] = dataISO.split('-').map(Number);
  return { anno, mese, giorno };
}

function scomponiInFuso(
  istante: Date,
  fusoOrario: string
): { anno: number; mese: number; giorno: number; ora: number; minuto: number; secondo: number } {
  const parti = new Intl.DateTimeFormat('en-US', {
    timeZone: fusoOrario,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(istante);

  const valore = (tipo: string): number => Number(parti.find((p) => p.type === tipo)?.value ?? '0');
  const ora = valore('hour');

  return {
    anno: valore('year'),
    mese: valore('month'),
    giorno: valore('day'),
    // Intl con hour12:false può restituire "24" per mezzanotte invece di "00".
    ora: ora === 24 ? 0 : ora,
    minuto: valore('minute'),
    secondo: valore('second'),
  };
}

function dataLocaleInUtc(
  anno: number,
  mese: number,
  giorno: number,
  ora: number,
  minuto: number,
  secondo: number,
  fusoOrario: string
): Date {
  const voluto = Date.UTC(anno, mese - 1, giorno, ora, minuto, secondo);
  let istante = voluto;

  for (let i = 0; i < 2; i++) {
    const ottenuto = scomponiInFuso(new Date(istante), fusoOrario);
    const ottenutoUtc = Date.UTC(
      ottenuto.anno,
      ottenuto.mese - 1,
      ottenuto.giorno,
      ottenuto.ora,
      ottenuto.minuto,
      ottenuto.secondo
    );
    istante += voluto - ottenutoUtc;
  }

  return new Date(istante);
}

function dataLocaleISO(istante: Date, fusoOrario: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: fusoOrario,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(istante);
}

function aggiungiGiorni(dataISO: string, giorni: number): string {
  const { anno, mese, giorno } = scomponiISO(dataISO);
  const d = new Date(Date.UTC(anno, mese - 1, giorno + giorni));
  return d.toISOString().slice(0, 10);
}

function ultimoGiornoDelMese(anno: number, mese: number): number {
  return new Date(Date.UTC(anno, mese, 0)).getUTCDate();
}

function aggiungiMesiStessoGiorno(dataISO: string, mesi: number): string {
  const { anno, mese, giorno } = scomponiISO(dataISO);
  const nuovoMese = mese + mesi;
  const nuovoAnno = anno + Math.floor((nuovoMese - 1) / 12);
  const meseDestinazione = ((nuovoMese - 1) % 12) + 1;

  const ultimoGiorno = ultimoGiornoDelMese(nuovoAnno, meseDestinazione);
  const giornoDestinazione = Math.min(giorno, ultimoGiorno);

  return `${nuovoAnno}-${String(meseDestinazione).padStart(2, '0')}-${String(giornoDestinazione).padStart(2, '0')}`;
}

function istanteImpegno(dataISO: string, oraHHmm: string | null, fusoOrario: string): string {
  const { anno, mese, giorno } = scomponiISO(dataISO);

  let ora = 0;
  let minuto = 0;
  if (oraHHmm !== null) {
    const [h, m] = oraHHmm.split(':').map(Number);
    ora = h;
    minuto = m;
  }

  return dataLocaleInUtc(anno, mese, giorno, ora, minuto, 0, fusoOrario).toISOString();
}

function calcolaOccorrenzeMancantiImpegno(
  definizione: DefinizioneRicorrenzaImpegno,
  ultimaDataGenerata: string | null,
  orizzonteISO: string,
  fusoOrario: string
): OccorrenzaImpegnoCalcolata[] {
  // Un cursore precedente alla (nuova) dataInizio è lo scarto di una
  // ricorrenza appena modificata (data_inizio spostata avanti, frequenza
  // cambiata, o una_tantum corretta a una data successiva): va ignorato e
  // si riparte da dataInizio, altrimenti la serie continuerebbe dal vecchio
  // cursore invece di riallinearsi al nuovo inizio. Tenere in lockstep con
  // src/calcolo/ricorrenzaImpegni.ts.
  const cursoreEsistente =
    ultimaDataGenerata !== null && ultimaDataGenerata < definizione.dataInizio ? null : ultimaDataGenerata;

  if (definizione.frequenza === 'una_tantum') {
    // Una_tantum produce al massimo una riga: nessun rischio di generazione
    // illimitata, quindi niente controllo sull'orizzonte - un impegno datato
    // oltre l'orizzonte non deve restare invisibile per sempre.
    if (cursoreEsistente !== null) {
      return [];
    }
    return [
      {
        dataISO: definizione.dataInizio,
        istanteISO: istanteImpegno(definizione.dataInizio, definizione.ora, fusoOrario),
      },
    ];
  }

  if (definizione.frequenza === 'giornaliera' || definizione.frequenza === 'personalizzata') {
    const passo =
      definizione.frequenza === 'personalizzata'
        ? Math.max(1, definizione.intervalloRicorrenza ?? 1)
        : 1;
    let cursore =
      cursoreEsistente !== null ? aggiungiGiorni(cursoreEsistente, passo) : definizione.dataInizio;

    const risultati: OccorrenzaImpegnoCalcolata[] = [];
    while (cursore <= orizzonteISO && risultati.length < MAX_PERIODI_PER_SINCRONIZZAZIONE) {
      risultati.push({
        dataISO: cursore,
        istanteISO: istanteImpegno(cursore, definizione.ora, fusoOrario),
      });
      cursore = aggiungiGiorni(cursore, passo);
    }
    return risultati;
  }

  if (definizione.frequenza === 'settimanale') {
    let cursore =
      cursoreEsistente !== null ? aggiungiGiorni(cursoreEsistente, 7) : definizione.dataInizio;

    const risultati: OccorrenzaImpegnoCalcolata[] = [];
    while (cursore <= orizzonteISO && risultati.length < MAX_PERIODI_PER_SINCRONIZZAZIONE) {
      risultati.push({
        dataISO: cursore,
        istanteISO: istanteImpegno(cursore, definizione.ora, fusoOrario),
      });
      cursore = aggiungiGiorni(cursore, 7);
    }
    return risultati;
  }

  // mensile
  let cursore =
    cursoreEsistente !== null
      ? aggiungiMesiStessoGiorno(cursoreEsistente, 1)
      : definizione.dataInizio;

  const risultati: OccorrenzaImpegnoCalcolata[] = [];
  while (cursore <= orizzonteISO && risultati.length < MAX_PERIODI_PER_SINCRONIZZAZIONE) {
    risultati.push({
      dataISO: cursore,
      istanteISO: istanteImpegno(cursore, definizione.ora, fusoOrario),
    });
    cursore = aggiungiMesiStessoGiorno(cursore, 1);
  }
  return risultati;
}

// --- Entry point --------------------------------------------------------

const ORIZZONTE_GIORNI = 90;
const FUSO_ORARIO_DEFAULT = 'Europe/Rome';

interface RigaImpegno {
  id: string;
  gruppo_id: string;
  titolo: string;
  data_inizio: string;
  ora: string | null;
  frequenza: Frequenza;
  intervallo_ricorrenza: number | null;
  promemoria_minuti_prima: number | null;
}

Deno.serve(async (_req) => {
  const adesso = new Date();

  // Lettura necessaria a ENTRAMBE le fasi (fase 2 filtra i promemoria sugli
  // stessi impegni attivi): un fallimento qui è l'unico caso davvero
  // fatale, perché senza impegni nessuna delle due fasi può procedere.
  const { data: impegniAttivi, error: erroreImpegni } = await supabase
    .from('impegni')
    .select('id, gruppo_id, titolo, data_inizio, ora, frequenza, intervallo_ricorrenza, promemoria_minuti_prima')
    .eq('attiva', true);
  if (erroreImpegni) {
    return new Response(erroreImpegni.message, { status: 500 });
  }
  const impegni: RigaImpegno[] = impegniAttivi ?? [];

  // --- Fase 1: generazione delle occorrenze mancanti, fino all'orizzonte.
  // Stesso algoritmo e stessa idempotenza (upsert con ignoreDuplicates sul
  // vincolo unique(impegno_id, data_ora)) di sincronizzaOccorrenzeImpegni
  // in src/api/impegni.ts: questa funzione è la rete di sicurezza lato
  // server, non sostituisce quella sincronizzazione lato client.
  // Avvolta in try/catch e resa non bloccante per la fase 2: la fase 2 è
  // l'unico percorso reale di invio dei promemoria (la generazione è solo
  // una rete di sicurezza che specchia lato server quanto il client fa già
  // da solo), quindi un errore qui non deve mai sopprimere in silenzio i
  // promemoria di questo e di ogni tick successivo finché il problema
  // persiste.
  let occorrenzeGenerate = 0;
  let erroreFase1: string | null = null;
  try {
    const gruppoIds = [...new Set(impegni.map((i) => i.gruppo_id))];
    const { data: impostazioni, error: erroreImpostazioni } =
      gruppoIds.length > 0
        ? await supabase.from('impostazioni_faccende').select('gruppo_id, fuso_orario').in('gruppo_id', gruppoIds)
        : { data: [] as { gruppo_id: string; fuso_orario: string }[], error: null };
    if (erroreImpostazioni) {
      throw new Error(erroreImpostazioni.message);
    }
    // Stesso default di leggiFusoOrarioGruppo (src/api/impegni.ts): un
    // gruppo senza modulo Faccende attivo non ha riga in
    // impostazioni_faccende.
    const fusoPerGruppo = new Map<string, string>(gruppoIds.map((g) => [g, FUSO_ORARIO_DEFAULT]));
    for (const riga of impostazioni ?? []) {
      fusoPerGruppo.set(riga.gruppo_id, riga.fuso_orario);
    }

    const impegnoIds = impegni.map((i) => i.id);
    // order('data_ora', { ascending: false }): se PostgREST dovesse
    // troncare il risultato al suo cap di righe predefinito, le righe
    // scartate sarebbero quelle più vecchie e non quelle più recenti -
    // esattamente ciò che serve qui, dato che l'unico uso di questi dati è
    // calcolare, per ciascun impegno, la data_ora PIÙ RECENTE già generata.
    const { data: occorrenzeEsistenti, error: erroreOccorrenze } =
      impegnoIds.length > 0
        ? await supabase
            .from('occorrenze_impegni')
            .select('impegno_id, data_ora')
            .in('impegno_id', impegnoIds)
            .order('data_ora', { ascending: false })
        : { data: [] as { impegno_id: string; data_ora: string }[], error: null };
    if (erroreOccorrenze) {
      throw new Error(erroreOccorrenze.message);
    }

    const ultimaDataOraPerImpegno = new Map<string, string>();
    for (const occ of occorrenzeEsistenti ?? []) {
      const attuale = ultimaDataOraPerImpegno.get(occ.impegno_id);
      if (attuale === undefined || occ.data_ora > attuale) {
        ultimaDataOraPerImpegno.set(occ.impegno_id, occ.data_ora);
      }
    }

    const righeDaInserire: { impegno_id: string; gruppo_id: string; data_ora: string }[] = [];
    for (const impegno of impegni) {
      const fusoOrario = fusoPerGruppo.get(impegno.gruppo_id) ?? FUSO_ORARIO_DEFAULT;
      const oggiISO = dataLocaleISO(adesso, fusoOrario);
      const orizzonteISO = aggiungiGiorni(oggiISO, ORIZZONTE_GIORNI);

      const definizione: DefinizioneRicorrenzaImpegno = {
        frequenza: impegno.frequenza,
        intervalloRicorrenza: impegno.intervallo_ricorrenza,
        dataInizio: impegno.data_inizio,
        ora: impegno.ora,
      };

      const ultimaDataOraEsistente = ultimaDataOraPerImpegno.get(impegno.id) ?? null;
      const ultimaDataGenerata =
        ultimaDataOraEsistente !== null ? dataLocaleISO(new Date(ultimaDataOraEsistente), fusoOrario) : null;

      const occorrenze = calcolaOccorrenzeMancantiImpegno(definizione, ultimaDataGenerata, orizzonteISO, fusoOrario);
      for (const occ of occorrenze) {
        righeDaInserire.push({ impegno_id: impegno.id, gruppo_id: impegno.gruppo_id, data_ora: occ.istanteISO });
      }
    }

    if (righeDaInserire.length > 0) {
      const { error } = await supabase
        .from('occorrenze_impegni')
        .upsert(righeDaInserire, { onConflict: 'impegno_id,data_ora', ignoreDuplicates: true });
      if (error) {
        throw new Error(error.message);
      }
    }

    occorrenzeGenerate = righeDaInserire.length;
  } catch (e) {
    erroreFase1 = e instanceof Error ? e.message : String(e);
    // Visibile nei log della function senza bloccare la fase 2 sottostante.
    console.error('Fase 1 (generazione occorrenze) fallita:', erroreFase1);
  }

  // --- Fase 2: promemoria. Solo impegni con promemoria_minuti_prima NON
  // NULL (0 incluso: "avvisa esattamente all'ora dell'impegno" è un
  // valore valido, mai saltarlo con un controllo troncato tipo
  // `if (promemoria_minuti_prima)`). impegni è già filtrato per attiva =
  // true sopra, quindi un impegno cancellato (soft delete) smette da solo
  // di generare nuovi promemoria anche se le sue occorrenze future non
  // vengono eliminate (vedi cancellaImpegno in src/api/impegni.ts).
  const impegnoPerId = new Map(impegni.map((i) => [i.id, i]));
  const idImpegniConPromemoria = impegni.filter((i) => i.promemoria_minuti_prima !== null).map((i) => i.id);

  if (idImpegniConPromemoria.length === 0) {
    return new Response(
      JSON.stringify({ occorrenzeGenerate, fase1Ok: erroreFase1 === null, erroreFase1, promemoriaInseriti: 0 }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  // data_ora > now() - 1 ora (non > now() secco): con promemoria_minuti_prima
  // = 0 ("avvisa esattamente all'ora dell'impegno", preset valido dal form
  // del Task 8), un controllo > now() stretto sarebbe incompatibile con il
  // filtro di preavviso sotto (data_ora <= now()), quindi quel promemoria
  // non scatterebbe quasi mai col cron ogni 15 minuti. La finestra di 1 ora
  // copre comodamente la cadenza del cron (anche saltandone un giro) pur
  // continuando a escludere gli impegni passati da ore/giorni (es. cron
  // fermo a lungo). Il filtro sulla finestra di preavviso vera e propria
  // (data_ora - promemoria_minuti_prima minuti <= now()) è fatto sotto in
  // JS, perché richiede l'aritmetica per riga sul valore di
  // promemoria_minuti_prima di CIASCUN impegno.
  // data_ora <= now() + 7 giorni: limite superiore necessario perché
  // PostgREST applica un cap di default al numero di righe restituite da
  // una select senza order - senza questo limite una query su un gruppo
  // con molte occorrenze future potrebbe essere troncata in modo
  // arbitrario, perdendo in modo permanente il promemoria di
  // un'occorrenza (il prossimo tick rifarebbe la stessa query troncata
  // nello stesso modo). 7 giorni = 10080 minuti, il preset di preavviso
  // più lungo offerto dal form (vedi ModificaImpegno.tsx): nessuna
  // occorrenza più lontana di 7 giorni da ora può avere un promemoria già
  // dovuto, quindi il limite non esclude mai un promemoria legittimo.
  const orizzontePromemoriaISO = new Date(adesso.getTime() + 7 * 24 * 60 * 60_000).toISOString();
  const { data: occorrenzeFuture, error: erroreFuture } = await supabase
    .from('occorrenze_impegni')
    .select('id, impegno_id, gruppo_id, data_ora')
    .in('impegno_id', idImpegniConPromemoria)
    .gt('data_ora', new Date(adesso.getTime() - 60 * 60_000).toISOString())
    .lte('data_ora', orizzontePromemoriaISO);
  if (erroreFuture) {
    return new Response(erroreFuture.message, { status: 500 });
  }

  const adessoMs = adesso.getTime();
  const daRicordare = (occorrenzeFuture ?? []).filter((occ) => {
    const impegno = impegnoPerId.get(occ.impegno_id);
    if (impegno === undefined || impegno.promemoria_minuti_prima === null) {
      return false;
    }
    const dataOraMs = new Date(occ.data_ora).getTime();
    return dataOraMs - impegno.promemoria_minuti_prima * 60_000 <= adessoMs;
  });

  if (daRicordare.length === 0) {
    return new Response(
      JSON.stringify({ occorrenzeGenerate, fase1Ok: erroreFase1 === null, erroreFase1, promemoriaInseriti: 0 }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  const gruppoIdsPromemoria = [...new Set(daRicordare.map((o) => o.gruppo_id))];
  const { data: membriAttivi, error: erroreMembri } = await supabase
    .from('membri')
    .select('id, gruppo_id')
    .in('gruppo_id', gruppoIdsPromemoria)
    .is('uscito_il', null);
  if (erroreMembri) {
    return new Response(erroreMembri.message, { status: 500 });
  }

  const membriPerGruppo = new Map<string, string[]>();
  for (const membro of membriAttivi ?? []) {
    const elenco = membriPerGruppo.get(membro.gruppo_id) ?? [];
    elenco.push(membro.id);
    membriPerGruppo.set(membro.gruppo_id, elenco);
  }

  // Un membro per occorrenza: evento_idempotenza = "impegno:<occorrenza_id>
  // :promemoria:<membro_id>" (stesso formato di "sfida:<id>:promemoria:
  // <turno_id>:<membro_id>" già in uso) - l'upsert con ignoreDuplicates
  // sotto si appoggia al vincolo unique esistente su questa colonna, quindi
  // è sicuro rilanciare questa funzione ogni 15 minuti: sia un tick
  // ripetuto sia due tick consecutivi dentro la stessa finestra di
  // preavviso producono lo stesso evento_idempotenza e il secondo viene
  // scartato senza duplicare la notifica/push.
  const notificheDaInserire = daRicordare.flatMap((occ) => {
    const impegno = impegnoPerId.get(occ.impegno_id);
    const membriGruppo = membriPerGruppo.get(occ.gruppo_id) ?? [];
    return membriGruppo.map((membroId) => ({
      gruppo_id: occ.gruppo_id,
      destinatario_membro_id: membroId,
      tipo: 'impegno_promemoria',
      titolo: impegno?.titolo ?? 'Promemoria',
      corpo: 'Promemoria per il tuo impegno.',
      impegno_id: occ.impegno_id,
      evento_idempotenza: `impegno:${occ.id}:promemoria:${membroId}`,
    }));
  });

  if (notificheDaInserire.length > 0) {
    const { error } = await supabase
      .from('notifiche')
      .upsert(notificheDaInserire, { onConflict: 'evento_idempotenza', ignoreDuplicates: true });
    if (error) {
      return new Response(error.message, { status: 500 });
    }
  }

  return new Response(
    JSON.stringify({
      occorrenzeGenerate,
      fase1Ok: erroreFase1 === null,
      erroreFase1,
      promemoriaInseriti: notificheDaInserire.length,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
