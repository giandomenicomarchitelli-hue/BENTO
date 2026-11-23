// Importa in Supabase (tabella offerte_prodotti) il JSON prodotto dalla
// piattaforma separata "volantini-platform" (data/export/offerte-bento.json).
// Ogni lancio sostituisce per intero le offerte esistenti: sono dati di
// riferimento regenerati da zero ad ogni scansione dei volantini, non c'e'
// uno stato da conciliare riga per riga.
//
// Uso:
//   SUPABASE_SERVICE_ROLE_KEY=... node --env-file=.env scripts/importa-offerte-volantini.mjs [percorso-json]
//
// La service role key serve perche' la tabella ha RLS in sola lettura per
// gli utenti autenticati: solo questo script (lato server/manuale) scrive.

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const percorsoJson =
  process.argv[2] ?? '/Users/giando/volantini-platform/data/export/offerte-bento.json';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    'EXPO_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devono essere impostate nell\'ambiente.'
  );
}

const offerte = JSON.parse(readFileSync(percorsoJson, 'utf8'));
if (!Array.isArray(offerte) || offerte.length === 0) {
  throw new Error(`Nessuna offerta trovata in ${percorsoJson}`);
}

// La piattaforma volantini a volte etichetta la catena con un prefisso
// descrittivo ("Volantino Conad: Lazio e Campania") invece del solo nome
// ("Conad: Lazio e Campania"): lo togliamo qui, non alla fonte, cosi'
// restiamo puliti anche se un futuro export smette/ricomincia a metterlo.
function pulisciCatena(catena) {
  return catena.replace(/^Volantino\s+/i, '').trim();
}

const righe = offerte.map((o) => ({
  nome: o.nome,
  marca: o.marca ?? null,
  categoria: o.categoria ?? null,
  prezzo_centesimi: Math.round(o.prezzoEur * 100),
  prezzo_riferimento: o.prezzoRiferimento ?? null,
  sconto_tipo: o.scontoTipo ?? null,
  catena: pulisciCatena(o.catena),
  gruppo: o.gruppo,
  valido_dal: o.validoDal,
  valido_al: o.validoAl,
  fonte_url: o.fonteUrl,
}));

const supabase = createClient(supabaseUrl, serviceRoleKey);

const { error: erroreCancella } = await supabase
  .from('offerte_prodotti')
  .delete()
  .not('id', 'is', null);
if (erroreCancella) throw erroreCancella;

const dimensioneBlocco = 500;
let inserite = 0;
for (let i = 0; i < righe.length; i += dimensioneBlocco) {
  const blocco = righe.slice(i, i + dimensioneBlocco);
  const { error } = await supabase.from('offerte_prodotti').insert(blocco);
  if (error) throw error;
  inserite += blocco.length;
}

console.log(`Importate ${inserite} offerte da ${percorsoJson}`);
