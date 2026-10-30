# Chat universale per aggiungere — estensione dell'Assistente a liste e calendario

## Intento e perché

Oggi "Scrivi" (l'Assistente appena costruito e in review per il merge) interpreta
frasi solo per due cose: aggiungere articoli alla lista della spesa e registrare
una spesa condivisa. L'utente vuole un unico posto — la stessa schermata, stesso
meccanismo — per aggiungere al volo qualunque cosa nell'app scrivendo una frase.

Esempi concreti raccolti in conversazione: "è finito il latte" (già coperto),
"aggiungi Inception a film" (una lista generica che magari non esiste ancora),
un appuntamento in calendario. Il valore cercato è la velocità: un solo punto
d'ingresso, senza dover navigare tra schermate diverse per ogni tipo di cosa.

## Obiettivi

- Estendere l'interpretazione testuale a due nuovi domini: liste generiche (la
  funzione "Liste" già esistente) e calendario (la funzione "Calendario" già
  esistente).
- Se la frase nomina una lista generica che non esiste ancora nel gruppo (es.
  "film"), crearla al volo, come parte della stessa conferma dell'azione — non
  un passaggio/conferma separato.
- Mantenere lo stesso principio di sicurezza già costruito: **conferma sempre
  obbligatoria su tutto**, nessuna eccezione per azioni "ovvie" (anche
  aggiungere un film a una lista passa dalla schermata di conferma).
- L'AI riconosce da sola in quale dominio va ogni pezzo della frase (lista
  spesa vs lista generica vs calendario vs spesa) senza che l'utente debba
  specificarlo esplicitamente.

## Non-obiettivi (fuori da questa fase)

- **Modificare o cancellare** qualcosa di già esistente tramite chat (spostare
  un appuntamento, correggere un prezzo, segnare una spesa sbagliata...).
  Rimandato: richiede capire QUALE elemento tra quelli esistenti l'utente
  intende colpire, un problema diverso e più rischioso dell'aggiungere.
  Decisione esplicita dell'utente in conversazione.
- **Faccende di casa** (es. "ho pulito il bagno") — rimandato a una fase
  successiva. Decisione esplicita dell'utente: è un caso di confine tra
  "aggiungere" (registrare un completamento) e "modificare" (lo stato di
  un'occorrenza esistente), e si è scelto di non deciderlo ora.
- **Cronologia visibile della chat** — resta come oggi: si scrive, si
  conferma, il campo si svuota. Nessun log dei messaggi precedenti da
  mostrare o salvare.

## Vincoli (ereditati da CLAUDE.md e dalla fase precedente)

- "L'AI interpreta, il codice calcola" — nessun numero o decisione critica
  presa "a fiducia" dall'LLM quando esiste un modo deterministico di
  calcolarla o risolverla nel codice.
- Conferma sempre prima di scrivere qualunque cosa — qui estesa oltre ai soli
  soldi/ambiguità (la regola originale di CLAUDE.md) per scelta esplicita
  dell'utente in questa conversazione: non più "solo se ambiguo o se soldi",
  ma sempre, su ogni dominio.
- La chiave API di Claude resta solo lato Edge Function, mai nell'app.
- Non rompere lo schema di azioni già in produzione: `aggiungi_articolo` e
  `acquisto` restano invariati; i nuovi domini sono nuovi membri dello stesso
  union discriminato, non una sostituzione.
- Gruppo come unità base, mai assumere "due persone" — vale anche per un
  eventuale assegnatario di un impegno creato via chat.

## Cosa è già deciso (dalla conversazione)

- Due nuovi tipi di azione nello stesso schema Zod discriminato usato oggi:
  uno per "aggiungi una voce a una lista generica" (creando la lista se non
  esiste) e uno per "crea un impegno in calendario".
- Per le liste generiche: lista non trovata per nome nel gruppo → creata al
  volo come parte della stessa conferma, nessuna domanda separata
  "vuoi crearla?".
- Per il calendario: resta aperta la strategia esatta di interpretazione di
  date/ora relative ("domani", "venerdì", "tra due settimane") — vedi "Cosa
  resta al builder".
- La schermata di conferma (`ConfermaAzioni`, oggi gestisce solo
  `aggiungi_articolo` e `acquisto`) va estesa per rendere leggibili anche
  questi due nuovi tipi di azione, riusando lo stesso meccanismo di "nome non
  risolto → scelta manuale" dove si applica.
- **Un impegno creato via chat deve poter essere assegnato a un membro
  specifico** (es. "domani Marco ha il dentista alle 18" → impegno assegnato
  a Marco). Oggi gli impegni NON hanno questo concetto nello schema (solo
  `creato_da`, che è "chi l'ha creato", non "per chi è"; le faccende invece
  hanno già `assegnata_a` — gli impegni no). Questo è un cambiamento reale
  allo schema esistente, non solo alla chat, con conseguenze da tenere a
  mente nel piano:
  - serve una nuova migration (`impegni` guadagna una colonna assegnatario
    nullable — nullable perché un impegno può restare di gruppo, senza
    assegnatario, come oggi), non una modifica alla migration 029 già
    applicata in produzione.
  - il campo va esposto anche nella creazione/modifica MANUALE del calendario
    (`ModificaImpegno.tsx`), non solo nel percorso chat — altrimenti un
    impegno assegnato via chat sarebbe modificabile a mano senza poter
    cambiare o vedere l'assegnatario, un'incoerenza nella UI esistente.
  - la risoluzione del nome (Marco → membroId) riusa lo stesso meccanismo
    già costruito per `pagato_da` in `acquisto`: se non risolvibile,
    selettore manuale nella schermata di conferma.
  - un impegno resta visibile a tutto il gruppo indipendentemente
    dall'assegnatario (coerente con "il gruppo è l'unità di base" — non
    diventa un filtro di accesso/RLS, solo un'informazione in più).

## Cosa resta al builder

- Firma esatta Zod dei due nuovi tipi di azione.
- Valori di default quando una lista generica viene creata al volo
  (`mostraInHome`, `conPrezzi` sono richiesti da `creaLista` oggi) — proposta
  di partenza: `mostraInHome: false`, `conPrezzi: false`; il builder valuta
  se ha senso diverso.
- Strategia di risoluzione data/ora per gli impegni: il rischio è che l'LLM
  non sappia con certezza "che giorno è oggi". Due strade possibili, la
  scelta è del builder: (a) il system prompt riceve "oggi è il [data]" e
  l'LLM restituisce direttamente una data assoluta; (b) l'LLM restituisce
  l'espressione testuale così com'è e un livello di codice deterministico la
  normalizza (coerente con "l'AI interpreta, il codice calcola", ma più
  lavoro). L'app ha già utility di calcolo data riusabili
  (`src/calcolo/ricorrenzaFaccende.ts`, `src/calcolo/ricorrenzaImpegni.ts`).
- Frequenza dell'impegno creato via chat: proposta di partenza, sempre
  `una_tantum` (evento singolo — il caso più comune per "domani alle 18 dal
  dentista"); riconoscere ricorrenze dette a parole ("ogni lunedì") è
  rimandabile, coerente con "una fase alla volta" di CLAUDE.md, ma il builder
  valuta se è a costo marginale visto che `creaImpegno` supporta già
  `frequenza`.
- Testo esatto del system prompt esteso con i nuovi domini — coerente con
  quello già in produzione per spesa/spese.
- Da dove parte il lavoro (nuovo worktree/branch): da `feature/faccende-casa`
  una volta che la PR di "interpretazione testuale" è stata mergiata, o da
  `feature/interpretazione-testuale` se si parte prima — decisione pratica al
  momento di avviare il piano, non blocca questo documento.
- Nome esatto della nuova colonna/migration per l'assegnatario di un impegno
  (es. `assegnato_a uuid references membri(id) on delete set null`, nullable)
  e numero di migration (prossimo libero: 00000000000032).
- Se e come mostrare l'assegnatario nella griglia/lista del calendario
  esistente (`CalendarioGriglia.tsx`) — il builder valuta se è necessario per
  questa fase o se basta vederlo aprendo il dettaglio dell'impegno.
