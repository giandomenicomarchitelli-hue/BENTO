# Sfida delle scelte — Design

## Intento e perché

Nei gruppi Bento (coppie, coinquilini, uffici, amici) capita spesso che
qualcuno debba decidere insieme agli altri cosa fare — dove mangiare,
che film vedere, dove andare — partendo da una lista già esistente
(ristoranti, film, attività...). Oggi questo avviene fuori dall'app
(chat, messaggi vocali), con discussioni lente e senza un modo pulito
per far votare tutti in modo onesto.

**Scenario reale (dalla conversazione con l'utente):** non è "siamo
tutti insieme ora, decidiamo sul posto" — è più spesso un membro del
gruppo che, qualche giorno prima, vuole organizzare qualcosa. Apre
l'app, lancia la sfida per un momento futuro (es. "sabato sera"), gli
altri rispondono quando hanno un attimo nelle ore/giorni successivi, da
posti diversi.

**Priorità esplicita dell'utente:** il rischio che vuole evitare di più
non è la segretezza (che resta comunque un requisito funzionale rigido,
vedi sotto) ma la **lentezza/macchinosità** nell'avviare una sfida.
Ogni scelta di UI in questo documento privilegia un flusso di creazione
rapido, con pochi tap e default sensati, rispetto a esporre ogni
possibile opzione di configurazione.

## Obiettivi

- Trasformare qualunque lista condivisa (liste personalizzate, non la
  lista della spesa) in una sfida di scelta a 3 preferenze segrete.
- Avvio della sfida in pochi passaggi, con domanda proposta
  automaticamente e modificabile.
- Segretezza dei voti garantita lato server (RLS/RPC), non solo nella UI.
- Risultato calcolato in modo deterministico, lato server, mai nel client.
- Notifiche (almeno interne, persistenti, in tempo reale) per invito,
  promemoria, parità/spareggio, risultato.
- Storico completo e consultabile, inclusi tentativi e spareggi.

## Non-obiettivi (in questa fase)

- Notifiche push native (Expo push) — **di default NON le implemento in
  questa fase** (confermato con l'utente in chat): nessun provider push
  è configurato nel progetto (nessuna dipendenza `expo-notifications`,
  verificato nell'audit). Costruisco invece notifiche interne
  persistenti + aggiornamento Realtime, con lo schema pensato in modo
  che un livello push possa essere aggiunto in futuro senza modificare
  le tabelle.
- Interpretazione della domanda/voto tramite LLM — il brief lo esclude
  esplicitamente: generazione domanda e calcolo vincitore sono
  deterministici, a template e a regole.
- Redesign grafico di qualunque schermata esistente.
- Modifica della logica finanziaria (`src/calcolo/**`, spese, saldi,
  quote, pagamenti) — totalmente fuori perimetro.

## Anti-obiettivi (cosa sarebbe un fallimento anche se "funziona")

- Un flusso di creazione con troppi tap/schermate prima di "Invia sfida".
- Qualunque modo (query diretta, payload Realtime, conteggio parziale,
  notifica) per intuire le scelte di un altro partecipante prima della
  chiusura del turno.
- Un vincitore scelto con criteri non riproducibili (casualità, ordine
  di arrivo dei voti) o calcolato nel client.
- Spareggi infiniti.
- Perdita dello storico quando si ripete una sfida.

## Vincoli

- Non toccare `src/calcolo/**`, l'API/hook delle spese, le migration
  esistenti (append-only, nessuna modifica a quelle già applicate).
- Non introdurre una nuova libreria UI; riuso dei componenti Bento già
  esistenti (`GlassCard`, `Badge`, `BentoButton`, `SectionHeader`,
  `IconBadge`, `Avatar`, `BentoScreen`).
- Stesse convenzioni già in uso nel repo: API typed in `src/api/`, hook
  React Query in `src/hooks/`, calcolo puro testabile in `src/calcolo/`,
  RPC `security invoker` che derivano l'identità da `auth.uid()`, RLS
  via `e_membro_di(gruppo_id)`.
- Migrazioni applicate al progetto Supabase collegato solo con
  autorizzazione esplicita (come già avvenuto per il modulo Faccende).
- Branch `feature/sfida-scelte`, creato da `feature/faccende-casa`
  (branch di lavoro corrente), mai merge su `main`.

## Risultati dell'audit (fatti verificati nel repository)

- **Nessun sistema di notifiche esiste**: nessuna tabella `notifiche`,
  nessun hook, nessuna dipendenza `expo-notifications` in
  `package.json`. Va costruito da zero (solo interno in questa fase).
- `liste` (migration `00000000000006_liste.sql`) non ha un campo
  categoria: `{ id, gruppo_id, nome, creato_da, creato_il, con_prezzi,
  mostra_in_home }`. Nessuna colonna da cui dedurre "Cibo" / "Film" /
  "Ristoranti" ecc.
- `voci_lista`: `{ id, lista_id, testo, fatto, note, prezzo_centesimi,
  creato_da, creato_il, aggiornato_il }` — `testo` è il campo che
  diventa il nome di un'opzione.
- Pattern RLS consolidato: `e_membro_di(gruppo_id)` (già conta solo
  membri con `uscito_il is null`), usato identico per
  `articoli_spesa`/`liste`/`faccende`.
- Pattern RPC consolidato (da `crea_spesa`, e da `completa_occorrenza`/
  `annulla_completamento_occorrenza` del modulo Faccende): `security
  invoker`, identità sempre da `auth.uid()`, mai da un parametro;
  update atomico `where stato = 'x'` per evitare doppie scritture
  concorrenti.
- Nessun job schedulato (pg_cron) o Edge Function nel progetto: la
  generazione/scadenza del modulo Faccende è guidata dal client
  (sincronizzazione ad apertura pagina, idempotente via vincoli DB) —
  stesso pattern riuso qui per lo scadenzamento dei turni.
- Nessuna tabella di impostazioni per gruppo generica (solo
  `impostazioni_faccende.fuso_orario`, specifica di quel modulo). Per
  questa funzionalità **non creo una nuova tabella di impostazioni**:
  uso un fuso orario fisso `Europe/Rome` (stessa logica "fuso
  esplicitamente determinato e salvato" già permessa dal brief), con lo
  stesso meccanismo di conversione già scritto e testato in
  `src/calcolo/ricorrenzaFaccende.ts` (nessuna nuova libreria di fusi
  orari).

## Come funziona (flusso concettuale)

1. **Creazione** (`crea_sfida`, RPC atomica unica): snapshot delle voci
   della lista → `sfide_opzioni`; snapshot dei membri attivi del gruppo
   → `sfide_partecipanti`; crea la sfida e il primo turno
   (`tipo_turno = 'iniziale'`); registra subito le 3 scelte segrete
   dell'organizzatore come suo voto nel turno 1. Tutto o niente, con
   una chiave di idempotenza lato client per evitare duplicati da
   ritrasmissione.
2. **Notifica** interna a tutti i partecipanti tranne l'organizzatore
   (lui ha già votato).
3. **Voto**: ogni partecipante conferma le sue 3 scelte in un'unica
   chiamata RPC (`conferma_voti`) — nessuna riga di voto esiste prima
   della conferma, quindi nessuna selezione parziale è mai leggibile da
   nessuno (nemmeno da se stessi su un altro dispositivo, finché non si
   conferma). La stessa RPC, nella stessa transazione, verifica se con
   questo voto il turno è completo: se sì, calcola il risultato e
   chiude il turno subito (stesso principio del "conferma e basta" già
   visto nel completamento delle faccende).
4. **Scadenza**: una sincronizzazione lato client (ad apertura della
   sfida/della lista sfide, come già per le occorrenze delle faccende)
   chiude come "scaduto/incompleto" ogni turno `in_corso` oltre la sua
   scadenza, senza vincitore.
5. **Risultato**: se un turno finisce con un vincitore, la sfida si
   chiude. Se c'è parità (e il turno non era già uno spareggio), il
   sistema **apre da solo** un turno di spareggio
   (`tipo_turno = 'spareggio'`) solo tra le opzioni in parità, 1 scelta
   a testa - nessuna azione richiesta a nessuno. Se non c'è accordo
   (nessuna opzione condivisa, o uno spareggio ancora in parità),
   qualunque partecipante attivo può avviare esplicitamente un turno
   "nuovo tentativo" (`tipo_turno = 'nuovo_tentativo'`, torna a 3
   scelte sull'intero pool di opzioni) — mai precompilato.
6. **Storico**: ogni turno (iniziale, spareggio, nuovo tentativo) resta
   per sempre nella tabella `sfide_turni`, mai cancellato.

## Decisioni tecniche (le mie scelte, da confermare o correggere)

### 1. Schema dati

Adatto la proposta del brief, con alcune semplificazioni per evitare
contatori derivabili (stesso principio già seguito nel modulo Faccende:
mai un contatore che può disallinearsi dai dati reali).

```
sfide_scelta
  id uuid pk
  gruppo_id uuid -> gruppi
  lista_id uuid -> liste
  richiesta_id uuid unique, nullable   -- chiave di idempotenza lato client
  titolo text                          -- domanda confermata
  categoria text nullable              -- dedotta dal nome lista, solo per emoji/contesto notifica
  attivita_precisione text check in ('giorno','fascia','orario')
  attivita_inizio timestamptz
  attivita_fine timestamptz nullable
  votazione_scade_il timestamptz       -- SOLO riferimento informativo: la vera scadenza vive sul turno
  stato text check in ('in_corso','conclusa_vincitore','conclusa_senza_accordo','conclusa_scaduta','annullata')
  opzione_vincente_id uuid nullable -> sfide_opzioni
  creata_da uuid -> membri
  creata_il timestamptz
  conclusa_il timestamptz nullable
  -- stato rispecchia sempre l'esito del turno corrente: 'in_corso' finché
  -- il turno corrente è 'in_corso', altrimenti copia 1:1 il suo esito
  -- (vedi sfide_turni.stato sotto) finché non si apre un turno successivo

sfide_partecipanti        -- roster FISSO allo snapshot iniziale, mai aggiornato dopo
  id uuid pk
  sfida_id uuid -> sfide_scelta
  membro_id uuid -> membri
  unique (sfida_id, membro_id)
  -- NESSUN campo "votato_il": si deriva contando sfide_voti per turno corrente

sfide_opzioni              -- pool CONDIVISO fra tutti i turni della stessa sfida
  id uuid pk
  sfida_id uuid -> sfide_scelta
  voce_lista_id uuid nullable -> voci_lista
  testo_opzione text
  testo_normalizzato text    -- per deduplicare le proposte personalizzate
  personalizzata boolean
  proposta_da uuid nullable -> membri   -- chi l'ha proposta
  creata_il timestamptz
  unique (sfida_id, testo_normalizzato)
  -- RLS SELECT: una riga con personalizzata = true è visibile solo a
  -- chi l'ha proposta (proposta_da = proprio membro_id) finché il turno
  -- in cui è stata proposta non è concluso; dopo la chiusura del turno
  -- diventa visibile a tutti i partecipanti della sfida. Le opzioni non
  -- personalizzate (snapshot della lista) sono sempre visibili a tutti
  -- i partecipanti. Qualunque partecipante può proporne una come una
  -- delle proprie 3 scelte (non solo l'organizzatore - vedi brief §10,
  -- "Campo 'Proponi un'altra opzione'" nella vista di voto di ciascuno).

sfide_turni
  id uuid pk
  sfida_id uuid -> sfide_scelta
  numero_turno int
  tipo_turno text check in ('iniziale','spareggio','nuovo_tentativo')
  stato text check in ('in_corso','concluso_vincitore','concluso_pareggio','concluso_senza_accordo','scaduto_incompleto')
  opzioni_in_gara uuid[]      -- per uno spareggio: solo le opzioni pari merito; per iniziale/nuovo tentativo: tutto il pool
  scadenza timestamptz
  iniziato_il timestamptz
  concluso_il timestamptz nullable
  unique (sfida_id, numero_turno)
  -- 'concluso_senza_accordo' (tutti hanno votato ma senza preferenza
  -- condivisa) è uno stato DISTINTO da 'scaduto_incompleto' (il tempo è
  -- scaduto prima che tutti votassero): copia diversa, stessa gestione
  -- "puoi riprovare" lato UI, ma non vanno confusi nello storico.

sfide_voti                 -- scritti SOLO dalla RPC conferma_voti, mai una riga alla volta dal client
  id uuid pk
  turno_id uuid -> sfide_turni
  membro_id uuid -> membri
  opzione_id uuid -> sfide_opzioni
  creato_il timestamptz
  unique (turno_id, membro_id, opzione_id)

sfide_turno_risultati       -- ECCEZIONE motivata alla regola "non salvare classifiche derivabili":
  turno_id uuid -> sfide_turni            -- serve a mostrare i conteggi aggregati SENZA mai esporre
  opzione_id uuid -> sfide_opzioni         -- la riga sfide_voti (che resta privata per sempre, anche
  voti_ricevuti int                        -- a turno concluso) - scritta una sola volta, dalla stessa
  primary key (turno_id, opzione_id)       -- RPC che chiude il turno, mai modificabile dopo

notifiche
  id uuid pk
  gruppo_id uuid -> gruppi
  destinatario_membro_id uuid -> membri
  tipo text                   -- 'sfida_invito' | 'sfida_promemoria' | 'sfida_tutti_votato' |
                               -- 'sfida_spareggio' | 'sfida_vincitore' | 'sfida_senza_accordo' | 'sfida_scaduta'
  titolo text
  corpo text
  sfida_id uuid nullable -> sfide_scelta
  evento_idempotenza text     -- es. "sfida:<id>:promemoria:<turno_id>" - unique, evita duplicati
  letta_il timestamptz nullable
  creata_il timestamptz
  unique (evento_idempotenza)
```

Perché niente `sfide_voti` leggibile dopo la chiusura: la riga
`sfide_voti` lega un `membro_id` a un'`opzione_id` — è esattamente il
dato che il brief vieta di esporre, anche a chiusura avvenuta ("non è
necessario rivelare pubblicamente quali singoli partecipanti hanno
votato ciascuna scelta"). `sfide_turno_risultati` è la cosa più vicina
a un "contatore derivato" che scrivo in questo intero progetto, ed è
l'unica eccezione necessaria: senza quella tabella, mostrare i
conteggi finali richiederebbe lasciare `sfide_voti` leggibile a tutti
dopo la chiusura, il che significherebbe poter ricostruire chi ha
votato cosa.

### 2. Fuso orario e date

Fuso fisso `Europe/Rome` per tutti i gruppi (vedi audit: nessuna
tabella di impostazioni generiche esiste). Riuso **senza modifiche**
`dataLocaleISO`/`fineGiornoISO` da `src/calcolo/ricorrenzaFaccende.ts`
(già scritte e testate) per ogni conversione data locale ⇄ UTC.

Nuovo modulo puro `src/calcolo/datazioneSfida.ts` per risolvere le
scelte rapide "Quando?" in `{ inizio, fine, precisione }`:

- Giorno singolo (Oggi/Domani/Venerdì/Sabato/Domenica/data scelta):
  `precisione: 'giorno'`, inizio = inizio giornata, fine = fine
  giornata.
- Fascia (Stasera/Domani sera/Venerdì sera): `precisione: 'fascia'`,
  banda fissa **19:00–23:59** locali (mia scelta esplicita, da
  confermare) del giorno risolto.
- Weekend/Prossimo weekend: intervallo da sabato 00:00 a domenica
  23:59 (non una singola data).
- "Scegli data" / "Scegli data e ora": `precisione: 'giorno'` o
  `'orario'` a seconda che l'utente fornisca anche l'ora.

Regola di validazione scadenza voto (RPC `crea_sfida`):
`votazione_scade_il` deve essere nel futuro; se
`attivita_precisione = 'orario'`, deve anche essere `<= attivita_inizio`
(altrimenti errore leggibile). Per `'giorno'`/`'fascia'` non si forza
altro vincolo oltre "nel futuro": il brief chiede esplicitamente di
"non presumere mezzanotte", non di bloccare scadenze più permissive.

### 3. Categoria e domanda automatica

Nuovo modulo puro `src/calcolo/domandaSfida.ts`:

- `deduciCategoria(nomeLista: string): Categoria | null` — liste di
  parole chiave italiane per `cibo`, `ristoranti`, `film`, `attivita`,
  `viaggi`, `giochi` (es. "cibo"/"ricette"/"mangiare" → `cibo`;
  "ristorant*"/"pizzer*"/"trattori*" → `ristoranti`; "film"/"cinema"/
  "serie" → `film`; ecc.), `null` se nessuna corrisponde.
- `generaDomanda(categoria: Categoria | null, quando: EsitoDatazione): string`
  — tabella di template per categoria × precisione temporale (replica
  esattamente gli esempi della tabella nel brief), fallback generico
  `"Quale opzione scegliamo per <quando>?"` quando `categoria` è
  `null`.

Entrambe pure, interamente testabili senza rete.

### 4. Algoritmo del vincitore (`src/calcolo/risultatoSfida.ts`)

Puro, deterministico, un'unica funzione usata sia dai test sia
(concettualmente) rispecchiata nella RPC che chiude il turno:

```
calcolaRisultatoTurno(voti: {opzioneId, membroId}[], tipoTurno, opzioniInGara: string[])
  -> { esito: 'vincitore' | 'pareggio' | 'nessun_accordo',
       opzioneVincenteId?, opzioniInParita?, conteggi: Map<opzioneId, numero> }
```

Regole (derivate di peso dagli esempi A–D del brief, verificate a mano
contro ciascuno):

- Turni a 3 scelte (`iniziale`, `nuovo_tentativo`): se il conteggio
  massimo è 1 per tutte le opzioni → `nessun_accordo` (mai spareggio:
  "se tutte le opzioni hanno ricevuto un solo voto... termina senza
  vincitore"). Se il massimo è ≥2 e un'unica opzione lo raggiunge →
  `vincitore`. Se il massimo è ≥2 e più opzioni sono a pari merito →
  `pareggio` (apre spareggio).
- Turni di spareggio (1 scelta): se un'unica opzione ha il massimo
  (anche solo 1 voto, visto che le opzioni in gara sono poche) →
  `vincitore`. Se più opzioni sono ancora a pari merito → `nessun_accordo`
  (niente secondo spareggio, coerente con "non creare spareggi
  infiniti").

Percentuali in risultato: `voti_ricevuti(opzione) /
totale_partecipanti_che_hanno_votato_nel_turno * 100`, arrotondate come
già fatto in `puntiFaccende.ts`.

### 5. Deduplicazione proposte personalizzate

`testo_normalizzato` = testo proposto → trim, Unicode NFKC, minuscolo,
spazi multipli collassati. **Nessuna fusione semantica** (es. "pizza"
e "pizze" restano opzioni diverse, come richiesto esplicitamente):
solo normalizzazione di maiuscole/spazi/forma Unicode, mai sinonimi.
Vincolo `unique(sfida_id, testo_normalizzato)` sul database per
l'idempotenza reale, non solo lato applicativo.

### 6. RPC (tutte `security invoker`, identità sempre da `auth.uid()`)

- `crea_sfida(p_lista_id, p_richiesta_id, p_titolo, p_attivita_*, p_votazione_scade_il, p_opzioni_scelte[3], p_opzione_personalizzata?)`
  → crea tutto atomicamente (vedi flusso sopra) **e registra anche le 3
  scelte dell'organizzatore come suo voto nel turno 1** (può includere
  `p_opzione_personalizzata` come una delle 3, esattamente come ogni
  altro partecipante potrà fare nella propria `conferma_voti` — il
  campo "Proponi un'altra opzione" non è riservato all'organizzatore,
  vedi brief §10). Ritorna l'id sfida. Idempotente su `p_richiesta_id`.
- `conferma_voti(p_turno_id, p_opzioni_scelte[], p_proposta_personalizzata?)`
  → esattamente 3 per `iniziale`/`nuovo_tentativo`, esattamente 1 per
  `spareggio`; se `p_proposta_personalizzata` è fornita, crea (o
  riusa, se stesso `testo_normalizzato` già proposto da un altro nella
  stessa sfida) una riga in `sfide_opzioni` e la include tra le scelte.
  Rifiuta se il turno non è `in_corso`, se già scaduto, se il chiamante
  ha già votato in quel turno, o se il chiamante non è un partecipante
  autorizzato (membro ancora attivo del gruppo in quel momento - vedi
  §9). Se con questo voto tutti i partecipanti **ancora attivi**
  hanno risposto, chiude il turno nella stessa transazione e calcola
  l'esito:
  - `vincitore` → chiude anche la sfida (`conclusa_vincitore`), genera
    la notifica di vittoria.
  - `pareggio` **in un turno `iniziale` o `nuovo_tentativo`** → **apre
    automaticamente**, nella stessa transazione, il turno successivo
    di tipo `spareggio` (solo le opzioni pari merito) e genera la
    notifica di spareggio. Coerente con il brief §14 ("il sistema apre
    un nuovo turno di spareggio"): nessuna azione richiesta
    all'organizzatore, a differenza del "Riprova".
  - `pareggio` **in un turno già `spareggio`** → **non** riapre un
    altro spareggio (mai spareggi infiniti, brief §14): il turno si
    chiude `concluso_senza_accordo`, la sfida riflette
    `conclusa_senza_accordo`, genera la notifica "nessun accordo".
  - nessuna opzione con ≥2 voti (tutte a 1) → `concluso_senza_accordo`
    diretto, mai uno spareggio (brief §12).
- `ripeti_sfida(p_sfida_id)` → **unica azione esplicita utente**
  ("Riprova la sfida"): crea un nuovo turno `nuovo_tentativo` con
  l'intero pool di opzioni, da uno stato terminale
  (`conclusa_senza_accordo` o `conclusa_scaduta`); aperto a qualunque
  partecipante attivo, non solo l'organizzatore (stesso livello di
  fiducia già usato altrove in Bento - nessun ruolo "admin"); genera la
  notifica. Non precompila mai le scelte del tentativo precedente.
- `scadi_turni_sfida(p_gruppo_id)` → sincronizzazione lato client (letta
  a ogni apertura della lista sfide/di una sfida, stesso principio del
  modulo Faccende): chiude come `scaduto_incompleto` ogni turno
  `in_corso` oltre `scadenza`.
- `annulla_sfida(p_sfida_id)` → solo l'organizzatore, solo se il turno
  corrente non è concluso.

### 7. Notifiche (solo interne in questa fase)

Tabella `notifiche` sopra. Hook `useNotifiche(gruppoId)` con
sottoscrizione Realtime (stesso pattern di `useFaccende`/
`useOccorrenzeFaccende`), badge con conteggio non lette. Punto
d'accesso: icona campanella nell'header della Home, accanto a
profilo/logout già esistenti (mia scelta di posizionamento — l'unica
aggiunta visiva fuori dalle nuove schermate dedicate; nessun'altra
modifica alla Home).

I "promemoria" (`sfida_promemoria`) vanno generati dalla stessa
sincronizzazione lato client che scadenzia i turni
(`scadi_turni_sfida` o una funzione gemella), con
`evento_idempotenza` univoco per turno così da non duplicarli mai, e
solo per chi non ha ancora votato in quel turno.

### 8. Pagine (routing)

- `app/(app)/liste/[id].tsx` (esistente) → aggiunto bottone **Inizia
  sfida**, visibile solo con ≥3 voci nella lista.
- `app/(app)/sfide/nuova.tsx` — creazione (riceve `listaId` via param).
- `app/(app)/sfide/[id].tsx` — **unica** schermata per voto in corso /
  attesa altri / spareggio / risultati, stati diversi della stessa
  pagina in base allo stato di sfida/turno/proprio voto (stesso
  principio già usato per `app/(app)/faccende/index.tsx`: una pagina,
  stati condizionali, non 4 route separate).
- `app/(app)/sfide/index.tsx` — elenco sfide del gruppo (in attesa del
  mio voto / attive / concluse), accessibile da `liste/index.tsx` (mia
  scelta di posizionamento, da confermare: le sfide nascono sempre da
  una lista, quindi vivono accanto all'elenco liste).
- `app/(app)/notifiche/index.tsx` — elenco notifiche.

### 9. Politiche esplicite richieste dal brief (decise qui)

Il brief, in più punti, chiede esplicitamente di "definire una politica
esplicita" o lascia un dettaglio alla mia scelta. Le fisso qui, per
iscritto, così restano verificabili:

- **Membro che lascia il gruppo a sfida in corso** (brief §16): il
  roster (`sfide_partecipanti`) resta fisso come snapshot e i voti già
  registrati non si toccano mai. Il controllo "hanno votato tutti?"
  però considera solo i partecipanti **ancora attivi in quel momento**
  (`membri.uscito_il is null`): chi esce smette di essere atteso, senza
  che questo cancelli o alteri un suo voto già espresso. Se nessuno
  resta da attendere, il turno si chiude e calcola il risultato sui
  voti effettivamente registrati. Scelta: altrimenti un turno
  resterebbe bloccato per sempre in attesa di chi non può più votare,
  chiudibile solo per scadenza — mai per accordo raggiunto.
- **Opzioni "fatte" della lista**: contano come opzioni valide allo
  stesso modo di quelle non fatte, sia nello snapshot sia nel conteggio
  "almeno 3 voci" che sblocca "Inizia sfida". Le liste di questo tipo
  (ristoranti, film, attività...) non hanno davvero un concetto di
  "completato" nello stesso senso della lista della spesa.
- **Promemoria**: inviato al massimo una volta per turno (idempotente
  sull'`evento_idempotenza`), generato dalla stessa sincronizzazione
  lato client che scadenzia i turni, quando restano meno del 25% del
  tempo di voto originale del turno E il turno è ancora `in_corso` E
  nessun promemoria è già stato inviato per quel turno. Solo ai
  partecipanti attivi che non hanno ancora votato in quel turno.
- **Gruppi troppo piccoli**: `crea_sfida` richiede almeno 2 membri
  attivi nel gruppo (l'organizzatore più almeno un altro), altrimenti
  errore leggibile ("Serve almeno un altro membro nel gruppo per
  avviare una sfida"). Con un solo membro il risultato sarebbe sempre e
  comunque "nessun accordo" (ogni opzione riceve al più 1 voto): non ha
  senso prodotto, meglio bloccarlo esplicitamente che mostrarlo.

## Cosa resta al builder (dettaglio implementativo nel piano)

- Wording esatto di ciascun template di domanda/notifica (il brief ne
  dà già molti esempi letterali: li riuso quasi alla lettera).
- Dettaglio stile dei nuovi componenti minimi necessari (es. riga opzione
  con contatore "2 di 3 scelte"), sempre dentro al design system Bento
  esistente.
- Suite di test completa mappata 1:1 sui 30 casi elencati nel brief.
