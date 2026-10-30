// Invocata DIRETTAMENTE dall'app con il JWT dell'utente (a differenza di
// invia-push-notifica e genera-promemoria-impegni, che partono da trigger/cron
// Postgres). Due conseguenze su cui questa funzione è diversa dalle altre:
//
// 1. NON va deployata con --no-verify-jwt: qui c'è un utente autenticato vero,
//    e il suo JWT è l'unica cosa che ci dice chi sta chiamando.
// 2. NON usa SUPABASE_SERVICE_ROLE_KEY. Il client qui sotto è costruito con
//    l'Authorization della RICHIESTA, quindi il controllo di appartenenza al
//    gruppo passa attraverso la RLS di Postgres (policy membri_select, vedi
//    migration 00000000000002) invece di fidarsi del gruppoId arrivato dal
//    body. Con il service role chiunque potrebbe interpretare frasi a nome di
//    un gruppo non suo - e ogni chiamata costa soldi veri (API di Claude).
//
// Il controllo di appartenenza avviene SEMPRE prima della chiamata a Claude.

import { createClient } from 'npm:@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk@1';
import { zodOutputFormat } from 'npm:@anthropic-ai/sdk@1/helpers/zod';
import { z } from 'npm:zod@4';

// COPIA GEMELLA di src/calcolo/schemaAzioni.ts: se cambi questo schema,
// cambia anche quello. La duplicazione è voluta - un'Edge Function è un
// deployment Deno separato da Metro/Expo e non può importare da src/.
const AzioneAggiungiArticolo = z.object({
  tipo: z.literal('aggiungi_articolo'),
  articoli: z.array(z.string().min(1)).min(1),
});

const AzioneAcquisto = z.object({
  tipo: z.literal('acquisto'),
  articoli: z.array(z.string()),
  importo_euro: z.number().positive(),
  pagato_da: z.string().min(1),
  diviso_tra: z.array(z.string()).optional(),
});

const SchemaRisposta = z.object({
  azioni: z.array(z.discriminatedUnion('tipo', [AzioneAggiungiArticolo, AzioneAcquisto])),
  ambiguo: z.boolean(),
  domanda_chiarimento: z.string().nullable(),
});

const MODELLO = 'claude-opus-5';

// Costruito a livello di modulo: se ANTHROPIC_API_KEY manca, la funzione
// fallisce al boot in modo rumoroso invece di cadere in silenzio nel fallback
// "ambiguo" a ogni frase (che sembrerebbe funzionare per sempre).
const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') as string });

// Risposta valida secondo SchemaRisposta: "serve un chiarimento" è un esito
// normale, non un errore - quindi status 200 e non 4xx/5xx.
const FALLBACK = {
  azioni: [],
  ambiguo: true,
  domanda_chiarimento: 'Non ho capito bene, puoi riscriverla?',
};

function rispostaJson(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

interface Richiesta {
  gruppoId: string;
  membriNomi: string[];
  nomeMittente: string;
  testo: string;
}

Deno.serve(async (req) => {
  let corpo: Richiesta;
  try {
    corpo = await req.json();
  } catch {
    return new Response('body non valido', { status: 400 });
  }

  // Validazione al confine di fiducia: questi valori finiscono nel system
  // prompt e nella query, arrivano dal client e non sono ancora verificati.
  const { gruppoId, membriNomi, nomeMittente, testo } = corpo;
  if (
    typeof gruppoId !== 'string' ||
    gruppoId === '' ||
    !Array.isArray(membriNomi) ||
    membriNomi.some((n) => typeof n !== 'string') ||
    typeof nomeMittente !== 'string' ||
    nomeMittente === '' ||
    typeof testo !== 'string' ||
    testo.trim() === ''
  ) {
    return new Response('campi mancanti o non validi', { status: 400 });
  }

  // Cap di lunghezza: questo è l'unico percorso a pagamento (Claude API) di
  // tutto il progetto. Un membro autenticato (o un retry loop lato client)
  // non deve poter inviare un testo enorme e farlo fatturare a piena dimensione.
  if (testo.length > 2000) {
    return new Response('testo troppo lungo', { status: 400 });
  }
  // Un gruppo casalingo ha poche persone, non migliaia: limite di sicurezza.
  if (membriNomi.length > 50) {
    return new Response('troppi membri', { status: 400 });
  }

  const supabaseUtente = createClient(
    Deno.env.get('SUPABASE_URL') as string,
    Deno.env.get('SUPABASE_ANON_KEY') as string,
    { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } }
  );

  const { data: utente } = await supabaseUtente.auth.getUser();
  if (utente.user === null) {
    return new Response('non autenticato', { status: 401 });
  }

  // membri ha unique(gruppo_id, utente_id) (vedi migration 018), quindi
  // maybeSingle() non può incontrare righe duplicate. Un non-membro non vede
  // la riga per RLS e ottiene data = null -> 403.
  const { data: membro } = await supabaseUtente
    .from('membri')
    .select('id')
    .eq('gruppo_id', gruppoId)
    .eq('utente_id', utente.user.id)
    .is('uscito_il', null)
    .maybeSingle();

  if (membro === null) {
    return new Response('non sei membro di questo gruppo', { status: 403 });
  }

  const systemPrompt = `Sei un interprete di comandi per un'app di gestione casa condivisa.
L'utente scrive una frase libera in italiano. Traducila in una lista di
azioni secondo lo schema fornito.

Chi scrive questa frase si chiama "${nomeMittente}". Quando la frase usa
la prima persona (io, ho comprato, ho speso, mi deve...) riferita a chi
scrive, usa il nome "${nomeMittente}" nei campi pagato_da/diviso_tra -
non scrivere mai "io".

I membri di questo gruppo sono: ${membriNomi.join(', ')}. Usa esattamente
questi nomi, stessa capitalizzazione, quando la frase li nomina o li
implica.

Se diviso_tra non è specificato per un acquisto, lascialo vuoto (il
codice dividerà automaticamente tra tutti i membri del gruppo).

Se la frase è ambigua, incompleta, o non descrive né un acquisto né
un'aggiunta alla lista della spesa, imposta ambiguo a true e scrivi una
domanda_chiarimento breve e specifica in italiano; in quel caso azioni
deve essere un array vuoto.`;

  try {
    const risposta = await anthropic.messages.parse({
      model: MODELLO,
      // max_tokens alto nonostante il JSON di output sia minuscolo: su
      // claude-opus-5 il ragionamento è attivo di default e consuma lo stesso
      // budget, quindi un tetto basso (es. 2048) troncherebbe la risposta e
      // finirebbe nel fallback "ambiguo" senza che si veda alcun errore.
      max_tokens: 16000,
      system: systemPrompt,
      messages: [{ role: 'user', content: testo }],
      // effort basso: tradurre una frase in 1-2 azioni è un compito semplice,
      // e ogni chiamata è a pagamento. Alzare a 'high' se si vedono
      // interpretazioni sbagliate su frasi complesse.
      output_config: { effort: 'low', format: zodOutputFormat(SchemaRisposta) },
    });

    if (risposta.parsed_output === null || risposta.parsed_output === undefined) {
      return rispostaJson(FALLBACK);
    }
    return rispostaJson(risposta.parsed_output);
  } catch (e) {
    // Solo il messaggio d'errore: la frase dell'utente non va nei log
    // (regola di privacy del progetto).
    console.error('Interpretazione fallita:', e instanceof Error ? e.message : String(e));
    return rispostaJson(FALLBACK);
  }
});
