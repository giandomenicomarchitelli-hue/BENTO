# Fase 2a: interpretazione in linguaggio naturale (solo testo)

## Scelta di scope, prima di tutto

L'utente ha chiesto di procedere senza altre domande. Scelta mia più
importante, dichiarata qui: **questo documento copre solo metà della
fase 2** di [CLAUDE.md](/Users/giando/App%20gestione%20casa/CLAUDE.md) —
l'interpretazione in linguaggio naturale **scritto**. L'input **vocale**
(microfono, trascrizione Whisper/Deepgram) resta un incremento
successivo, non in questo lavoro. Motivo: sono due rischi indipendenti
(capire una frase vs. trascriverla bene) e la fase 1 di CLAUDE.md dice
esplicitamente "una fase alla volta, non anticipare" — ha senso
dividerla piuttosto che bloccare l'interpretazione testuale dietro a
tutta l'infrastruttura audio.

## Intento

Oggi per aggiungere "sale e pasta" alla lista e registrare che li hai
pagati 4€ servono due azioni separate e manuali. L'obiettivo di CLAUDE.md
è scrivere una frase sola e lasciare che il codice (non l'AI) la trasformi
in azioni concrete — esattamente l'esempio già nel file:

```json
{
  "azioni": [
    { "tipo": "aggiungi_articolo", "articoli": ["sale"] },
    { "tipo": "acquisto", "articoli": ["sale", "pasta"], "importo_euro": 4,
      "pagato_da": "marito", "diviso_tra": ["marito", "moglie"] }
  ],
  "ambiguo": false,
  "domanda_chiarimento": null
}
```

## Goal

1. Un campo di testo dove un membro scrive una frase libera in italiano.
2. Una Edge Function (mai l'app) che la manda a Claude e restituisce
   esattamente questo JSON, validato con Zod prima di essere usato.
3. Una schermata di conferma che mostra cosa sta per succedere (voci da
   aggiungere, spesa da registrare e come si divide) prima di scrivere
   qualunque cosa nel database — **sempre**, non solo per i casi
   ambigui/con soldi (vedi "Conferma: sempre, non selettiva" sotto).
4. Dopo la conferma, l'esecuzione usa le funzioni già esistenti
   (`aggiungiArticolo`, `creaSpesa`, ecc.) — zero calcoli nuovi, zero
   logica di business nell'Edge Function.
5. Risoluzione nome→membro deterministica lato client, con un modo di
   correggere a mano se un nome non si risolve in modo univoco.

## Non-goal (fuori da questo lavoro)

- Input vocale, microfono, trascrizione (Whisper/Deepgram) — fase 2b.
- Azioni su Faccende, Calendario, Sfide — l'esempio di CLAUDE.md copre
  solo lista della spesa e spese; restano gli unici due tipi di azione
  in questo primo giro.
- Conversazione multi-turno per chiarire un'azione ambigua: se
  `ambiguo: true`, si mostra la `domanda_chiarimento` come testo e
  l'utente riscrive la frase da capo nello stesso campo — nessuno stato
  di conversazione che ricorda lo scambio precedente.
- Storico delle interpretazioni passate, modifica di un'interpretazione
  dopo che è stata eseguita (si corregge come oggi: modificando
  l'articolo/la spesa risultante).
- Nessuna nuova azione oltre alle due già nello schema di CLAUDE.md
  (niente "elimina_articolo", "modifica_spesa", ecc. in questo giro).

## Anti-goal

- Un'azione sui soldi eseguita senza che l'utente l'abbia vista prima
  (viola la regola 5 di CLAUDE.md).
- Qualunque calcolo di divisione/importo deciso dal testo del modello
  invece che da `dividiEqualmente`/`creaSpesa` (viola la regola 1).
- La chiave API di Claude che finisce in una variabile `EXPO_PUBLIC_*` o
  in qualunque codice spedito all'app (viola la regola 7) — vedi
  `.env.example`, tutte le variabili lì sono già pubbliche per design,
  nessuna nuova va lì.
- JSON malformato o fuori schema che blocca l'app o viene eseguito
  "alla meglio": uno schema non valido è sempre trattato come se
  `ambiguo: true` con un messaggio generico, mai eseguito.

## Come: le parti decise

### Edge Function `interpreta-azione`

- Input: `{ gruppoId: string, membriNomi: string[], nomeMittente: string, testo: string }`.
  **Scelta mia**: `nomeMittente` è il nome del membro che ha scritto la
  frase (lo conosce già l'app, è il profilo dell'utente loggato) —
  serve perché l'esempio stesso di CLAUDE.md ("ho comprato...") non
  nomina mai esplicitamente "marito": senza sapere chi sta scrivendo,
  "io"/"ho speso" non si può risolvere a un membro reale, soprattutto
  in un gruppo con più di due persone (regola 4). Il prompt istruisce
  Claude a usare `nomeMittente` ogni volta che la frase si riferisce
  alla prima persona, scrivendo il nome vero (non "io") nei campi
  `pagato_da`/`diviso_tra` — stessa logica di riconoscimento nomi che
  già deve fare per gli altri membri citati, nessun meccanismo a parte.
- **Scelta mia, sicurezza**: a differenza delle due Edge Function
  esistenti (`invia-push-notifica`, `genera-promemoria-impegni`,
  entrambe invocate da trigger/cron con `--no-verify-jwt` e service
  role), questa è la prima invocata direttamente da un utente loggato, e
  l'unica che costa una chiamata a un'API esterna a pagamento per ogni
  uso. Resta quindi con la verifica JWT di default (nessun
  `--no-verify-jwt`), e verifica anche l'appartenenza al gruppo prima di
  chiamare Claude: con un client Supabase creato dal JWT della richiesta
  (non service role), `select id from membri where gruppo_id =
  :gruppoId and utente_id = auth.uid() and uscito_il is null` — zero
  righe → 403, nessuna chiamata a Claude. Nessun limite di frequenza
  oltre a questo in questa prima versione: la barriera reale è già "devi
  avere un codice invito per essere nel gruppo", un rate limiter è
  rimandabile. `shortcut: nessun rate limiting per utente/gruppo,
  aggiungilo se i costi Claude diventano un problema osservabile.`
- Chiama l'API di Claude con l'SDK ufficiale (`@anthropic-ai/sdk`, import
  Deno `npm:@anthropic-ai/sdk@1` — stesso stile major-only già usato per
  `npm:@supabase/supabase-js@2`/`npm:web-push@3`), modello `claude-opus-5`
  di default. **Nota sul costo**: per un compito di sola estrazione JSON
  un modello più economico (Haiku) costerebbe meno, ma il modello di
  default non si abbassa di propria iniziativa — resta una costante
  isolata e facile da cambiare (es. `const MODELLO = 'claude-opus-5'`),
  così l'utente può scegliere lui se scendere a un modello più economico
  una volta visto il costo reale in uso.
- **Output forzato in JSON**: `client.messages.parse()` con
  `output_config: { format: zodOutputFormat(schemaAzioni) }` (helper
  `zodOutputFormat` da `@anthropic-ai/sdk/helpers/zod`).
  `response.parsed_output` è già tipato dallo schema; `null` se il
  parsing è comunque fallito, trattato come `ambiguo: true`.
  **Correzione rispetto all'idea iniziale**: l'Edge Function (Deno) e
  l'app (Metro/React Native) non condividono oggi nessun modulo tra
  `supabase/functions/` e `src/` — niente monorepo, niente alias che
  attraversi i due. Niente di nuovo da costruire solo per uno schema di
  ~15 righe: resta **duplicato identico** nei due file, con un commento
  in ciascuno che rimanda all'altro ("se cambi questo schema, cambia
  anche l'altra copia in ...").
  Chiave `ANTHROPIC_API_KEY` come secret della Edge Function
  (`supabase secrets set`), mai in `.env`/`.env.example` (quelli sono
  tutti `EXPO_PUBLIC_*`, cioè pubblici per design — la chiave Claude non
  ci va mai).
- Output: lo stesso JSON testualmente, **non interpretato né eseguito
  qui** — l'Edge Function è un passacarte verso Claude (più il controllo
  di appartenenza sopra), la validazione e l'esecuzione vivono nell'app.
- Nessuna persistenza, nessuna scrittura al database applicativo da
  parte di questa funzione.

### Validazione

Schema Zod che rispecchia esattamente la forma in CLAUDE.md:
`azioni: Array<{tipo: 'aggiungi_articolo', articoli: string[]} | {tipo:
'acquisto', articoli: string[], importo_euro: number, pagato_da: string,
diviso_tra: string[]}>`, `ambiguo: boolean`,
`domanda_chiarimento: string | null`. Se il parsing Zod fallisce (JSON
non valido o fuori schema), l'app si comporta come se avesse ricevuto
`ambiguo: true` con un messaggio fisso ("Non ho capito bene, puoi
riscriverla?") — mai un crash, mai un tentativo di eseguire comunque
qualcosa di parziale.

### Risoluzione nome → membro

Puro codice, lato client: confronto case-insensitive tra ogni stringa in
`pagato_da`/`diviso_tra` e i nomi dei membri attivi del gruppo
(`membriNomi` passati anche alla Edge Function, ma la risoluzione vera e
propria avviene qui, non lì — stessa regola "l'AI interpreta, il codice
calcola"). Se `diviso_tra` è assente o vuoto per un'azione `acquisto`:
default a **tutti i membri attivi del gruppo** (mai assumere due
persone, regola 4). Se un nome non risolve a esattamente un membro (zero
o più di uno — es. due persone con lo stesso nome nel gruppo): quell'
azione resta nella schermata di conferma ma con quel campo segnato da
risolvere a mano (un menu a tendina con i membri reali).

**Scelta mia sull'ordine delle quote**: `diviso_tra`, una volta risolto
a id dei membri, va **riordinato secondo l'ordine canonico
`membriAttivi` del gruppo** (stesso ordine già usato da
`app/(app)/spese/nuova.tsx`) prima di chiamare `dividiEqualmente` — non
nell'ordine in cui Claude ha scritto i nomi. `dividiEqualmente` assegna
il resto in centesimi ai primi elementi dell'array per indice: senza
questo riordino, chi riceve il centesimo in più dipenderebbe
dall'ordine delle parole nella frase, non da una regola deterministica
— romperebbe la regola 1 ("il codice calcola") in modo sottile.

### Conferma: sempre, non selettiva

La regola 5 di CLAUDE.md impone la conferma solo per azioni ambigue o
che riguardano soldi. Scelta mia: mostrare **sempre** la schermata di
conferma per l'intero batch di azioni, mai un'esecuzione istantanea in
background — perché l'esempio stesso di CLAUDE.md produce quasi sempre
un `acquisto` insieme a un `aggiungi_articolo` nella stessa frase, e
quindi quasi ogni batch reale finisce comunque per contenere soldi. Una
sola schermata, un solo comportamento, invece di due percorsi di codice
(istantaneo vs. con conferma) che si sarebbero dovuti tenere sincronizzati.

La schermata mostra ogni azione come una riga leggibile ("Aggiungi: sale,
pasta" / "Registra spesa: 4,00€ pagati da Marco, divisi tra Marco e
Giulia") con una `X` per rimuoverla dal batch prima di confermare, e il
picker di correzione nome descritto sopra quando serve.

**Scelta mia su cosa è correggibile**: solo due correzioni in questa
prima versione — risolvere a mano un nome ambiguo (sopra), o togliere
una riga con la `X`. Non si modifica una divisione già risolta
correttamente ma non voluta (es. Claude divide tra tutti e l'utente
voleva solo due persone): in quel caso si rimuove la riga e si usa la
schermata "Nuova spesa" già esistente, che permette già di scegliere la
divisione esatta. Evita di ricostruire un editor di quote dentro la
schermata di conferma per questo primo giro, e soddisfa comunque "permetti
di correggere" (regola 5) — correggere qui significa "annulla questa
riga e fallo a mano", non "modifica sul posto".

**Scelta mia sul bottone**: un solo bottone "Conferma" per tutto il
batch (coerente con "una sola schermata, non selettiva" sopra), non uno
per riga — disabilitato finché **ogni riga rimasta nel batch** (dopo
eventuali rimozioni con la `X`) ha tutti i nomi risolti. Alla conferma,
esegue, nell'ordine in cui appaiono, le chiamate già esistenti
(`aggiungiArticolo` per ogni articolo di `aggiungi_articolo`;
`creaSpesa` con le quote calcolate da `dividiEqualmente` per ogni
`acquisto` — se l'articolo nominato nell'azione `acquisto` esiste ancora
come "da comprare", lo segna anche comprato con `aggiornaArticolo`,
stesso collegamento già implicito nell'esempio di CLAUDE.md "ho comprato
il sale... toglie sale... dalla lista").

Se `ambiguo: true`: nessuna schermata di conferma con azioni, solo il
testo di `domanda_chiarimento` sopra al campo di testo, che resta
modificabile per riprovare.

### Entry point

Nuova voce nella Dashboard Bento, stessa famiglia delle tile esistenti
(coerente con come è stato aggiunto il Calendario): icona a scelta del
builder (es. `message-circle` o `mic` anche se il microfono non è ancora
attivo in questo giro — il builder valuta), titolo "Scrivi", apre una
schermata dedicata con il campo di testo, uno storico locale (solo in
memoria, non persistito) delle ultime interpretazioni della sessione, e
la schermata di conferma quando arriva una risposta.

## Cosa resta al builder

- Modello Claude esatto e parametri di temperatura/max token.
- Meccanismo preciso per forzare il JSON (tool-use vs. prompt + parsing)
  con l'SDK Anthropic usato lato Deno.
- Testo esatto delle righe di riepilogo nella schermata di conferma.
- Nome/percorso della nuova rotta e della tile.
- Se collegare anche l'azione `acquisto` alla spunta automatica
  dell'articolo corrispondente nella lista (il design doc lo assume
  utile, coerente con l'esempio di CLAUDE.md, ma il dettaglio di
  matching nome-articolo-esistente è un'implementazione, non un
  requisito di prodotto nuovo).
