# Calendario condiviso nel gruppo

## Intento e perché

Dentro un gruppo (casa, ufficio, viaggio...) capitano impegni e scadenze che
riguardano tutti ma che oggi nessuno tiene scritti in un posto comune: la
prossima analisi del gatto, il rinnovo di un documento, una scadenza da non
perdere. Vogliamo una sezione **Calendario** dentro il gruppo, condivisa
come lista della spesa e faccende, dove chiunque aggiunge un impegno con
una data e, se vuole, un promemoria push — così la responsabilità di
ricordarsene non resta su una sola persona.

Non era nella roadmap a fasi di [CLAUDE.md](/Users/giando/App%20gestione%20casa/CLAUDE.md)
(che oggi è ferma alla fase 1, con fase 3 e parte della 4 già costruite in
pratica — vedi verifica precedente in conversazione). Questo documento
tratta il calendario come un modulo a sé, nello stile già usato per
Faccende.

## Cosa deciso in conversazione (letteralmente, dall'utente)

- Un vero calendario a **griglia mensile stile Google Calendar**, non un
  elenco di promemoria.
- Si aggiungono **impegni/scadenze condivisi con tutto il gruppo** (es.
  "analisi del gatto").
- **Notifica push** quando la scadenza si avvicina.
- Il tempo di preavviso della notifica è **configurabile per ogni impegno,
  e modificabile dopo** (non un valore fisso per tutta l'app).
- Un impegno può essere **ricorrente o singolo, a scelta caso per caso**
  (es. un vaccino ogni 6 mesi vs un appuntamento una tantum).
- Chi crea l'impegno **decide in quel momento** se resta modificabile/
  cancellabile da chiunque nel gruppo, o solo da lui.

## Goal

1. Sezione Calendario dentro ogni gruppo, vista a griglia mensile, con
   indicazione dei giorni che hanno impegni.
2. Aggiungere/modificare/cancellare un impegno con: titolo, descrizione
   opzionale, data (+ ora opzionale), ricorrenza opzionale, promemoria
   opzionale, permesso di modifica.
3. Notifica push al gruppo quando un promemoria scatta, riusando la
   pipeline push già esistente (`notifiche` → trigger → Edge Function
   `invia-push-notifica`).
4. Le regole di permesso e di ricorrenza si comportano in modo coerente
   anche con più membri che agiscono in contemporanea (stesso standard di
   idempotenza già usato per Faccende).

## Non-goal (esplicitamente fuori da questo lavoro)

- Nessuna assegnazione dell'impegno a un membro specifico ("chi se ne
  occupa"): è visibile e gestibile da tutto il gruppo, non c'è concetto di
  "responsabile". Se servirà in futuro è un'estensione, non parte di questo
  lavoro.
- Nessun collegamento con Faccende/punteggi/Sfide: un impegno di calendario
  non assegna punti, non entra in classifica.
- Nessuna sincronizzazione con calendari esterni (Google Calendar, iCal,
  export .ics).
- Nessun invito/RSVP tra membri: tutti vedono tutto, non c'è "partecipo/non
  partecipo".
- Nessuna vista giornaliera/settimanale ad agenda con fasce orarie
  affiancate: solo griglia mensile + lista degli impegni del giorno
  selezionato.
- Nessun drag-and-drop per spostare un impegno sulla griglia: si modifica
  da un form, come già succede per faccende/articoli.
- Fase 2 della roadmap (input vocale + interpretazione Claude) non viene
  toccata: aggiungere un impegno resta un form testuale in questa fase.

## Anti-goal (farebbe fallire il lavoro anche se "funziona")

- Un promemoria che non parte per un bug di fuso orario (il calcolo deve
  riusare `impostazioni_faccende.fuso_orario`, già esistente per gruppo,
  non assumere UTC o il fuso del device).
- Notifiche duplicate per lo stesso promemoria (va riusato il pattern
  `evento_idempotenza` già in `notifiche`).
- Un impegno che "sparisce" dalla griglia se il job dei promemoria non
  girasse: la visibilità dell'impegno non deve mai dipendere dall'invio
  della notifica, sono due cose separate.
- Cancellare un impegno con una vera `DELETE` che lo fa sparire senza
  possibilità di tornare indietro (vedi regola 6 di CLAUDE.md, "ogni
  operazione è annullabile").

## Vincoli (dal progetto, non negoziabili qui)

- TypeScript strict, niente `any`.
- Nessun calcolo di date/ricorrenze lato LLM: è codice deterministico e
  testato, stesso principio già applicato ai saldi e a
  `src/calcolo/ricorrenzaFaccende.ts`.
- Il gruppo è l'unità di base: tutto appartiene a `gruppo_id`, mai
  assumere un numero fisso di membri.
- Testi dell'interfaccia in italiano.
- Pattern RLS del progetto: nessun ruolo "admin", `e_membro_di(gruppo_id)`
  come base; qui però introduciamo la prima eccezione a "libero per tutti
  i membri" — vedi sotto.

## Come: le parti già decise

### Schema dati (parallelo diretto a `faccende`/`occorrenze_faccende`)

```
impegni
  id uuid pk
  gruppo_id uuid -> gruppi, not null
  titolo text not null
  descrizione text null
  data_inizio date not null          -- prima/unica occorrenza
  ora time null                      -- null = impegno "tutto il giorno"
  frequenza text not null check in
    ('giornaliera','settimanale','mensile','personalizzata','una_tantum')
  intervallo_ricorrenza integer null -- "ogni N giorni" per 'personalizzata'
  parametri_ricorrenza jsonb not null default '{}'
    -- stesso formato di faccende: {"giorno_settimana": n} / {"giorno_mese": n}
  promemoria_minuti_prima integer null  -- null = nessuna notifica
  modificabile_da_tutti boolean not null default true
  creato_da uuid -> membri, null
  attiva boolean not null default true  -- soft-delete: "cancellare" = false
  creato_il / aggiornata_il timestamptz

occorrenze_impegni
  id uuid pk
  impegno_id uuid -> impegni, on delete cascade
  gruppo_id uuid not null            -- denormalizzato, come occorrenze_faccende
  data_ora timestamptz not null      -- istante assoluto, calcolato lato client
                                      -- da data_inizio/ora/fuso orario gruppo
  creato_il timestamptz
  unique (impegno_id, data_ora)      -- idempotenza generazione, come faccende
```

Riusa esattamente il vocabolario di ricorrenza già usato da `faccende`
(stessi valori di `frequenza`, stesso formato di `parametri_ricorrenza`):
la logica di calcolo in `src/calcolo/ricorrenzaFaccende.ts` va **riusata o
generalizzata**, non duplicata — è lo stesso identico problema (espandere
una regola di ricorrenza in occorrenze concrete), solo applicato a una
tabella diversa.

**Scelta mia, non lasciata al builder**: `ricorrenzaFaccende.ts` ancora
ogni serie su `creato_il` (le faccende non hanno una data di inizio
separata). Qui `data_inizio` è un campo scelto dall'utente, distinto da
`creato_il` — la versione generalizzata deve ancorare il calcolo a
`data_inizio`, non al momento di creazione della riga, altrimenti un
impegno ricorrente creato oggi ma con inizio il mese prossimo calcolerebbe
male la prima occorrenza.

**Scelta mia per gli impegni "tutto il giorno" (`ora = null`)**: l'istante
usato per `data_ora` è **mezzanotte (00:00) nel fuso orario del gruppo**,
non le 23:59 usate da faccende per le scadenze (lì è una deadline, qui è
l'inizio di un evento — semantica diversa). I promemoria "N prima" si
calcolano da quell'istante.

Niente `stato`/`completata_da` sulle occorrenze: a differenza di una
faccenda, un impegno di calendario non si "completa", è solo un promemoria
— tenerlo minimo.

### RLS — la prima eccezione al pattern "libero per tutti i membri"

- `impegni`: SELECT e INSERT liberi per `e_membro_di(gruppo_id)` (chiunque
  nel gruppo vede e crea). UPDATE/DELETE solo se `e_membro_di(gruppo_id)`
  **e** (`modificabile_da_tutti = true` OPPURE `creato_da` corrisponde al
  membro corrente). È la prima tabella del progetto con questa distinzione
  — finora nessuna tabella aveva bisogno di un permesso diverso da "membro
  del gruppo sì/no" (vedi commento in `00000000000013_faccende.sql`: "nessun
  ruolo admin esiste in questo progetto" — qui non è un ruolo, è un
  interruttore per-riga deciso da chi crea la riga).

  **Scelta mia**: `membri` non cancella mai la riga quando si esce dal
  gruppo (resta con `uscito_il` impostato, vedi migration 8) — quindi se
  chi ha creato un impegno "solo io" lascia il gruppo, `creato_da` punta a
  un membro che non passa più `e_membro_di()`, e senza un ruolo admin
  nessuno potrebbe più modificare o cancellare quella riga. Per evitare un
  impegno bloccato per sempre, la condizione diventa: modificabile da
  chiunque nel gruppo se `modificabile_da_tutti = true`, **oppure** se
  `creato_da` è nullo o appartiene a un membro non più attivo nel gruppo,
  **oppure** se corrisponde al membro corrente.
- `occorrenze_impegni`: SELECT/INSERT liberi per i membri del gruppo
  (generazione lato client, stesso pattern di `occorrenze_faccende`).
  Nessun UPDATE/DELETE da RLS diretta.

### Permessi: cosa restare al builder

Cosa succede alle occorrenze già generate quando si modifica data/ricorrenza
di un impegno ricorrente (rigenerare da zero le occorrenze future? lasciarle
finché non si rigenera?) è lasciato al builder: lo stesso problema esiste già
per Faccende, si può copiare quella soluzione se ne esiste una consolidata,
altrimenti la scelta più semplice è cancellare le occorrenze con
`data_ora > now()` e rigenerarle, lasciando intatte quelle passate.

### Promemoria push: il pezzo nuovo nell'infrastruttura

Oggi `notifiche` viene scritta in risposta a un evento che succede ora
(invito accettato, ecc.) e il trigger `_invia_notifica_push` la spinge
subito. Un promemoria è diverso: deve scattare **nel futuro**, quando
nessuna azione utente lo provoca. Il progetto non ha oggi nessun
meccanismo di schedulazione (`pg_cron` non è mai stato usato).

**Scelta mia, importante**: per Faccende la generazione delle occorrenze è
client-side e guarda solo fino a "oggi" (vedi `useOccorrenzeFaccende.ts`),
il che va benissimo per una lista di cose da fare. Qui non basta: la griglia
deve mostrare occorrenze future anche se nessuno apre l'app per settimane,
e un promemoria non può dipendere dal fatto che qualcuno abbia aperto l'app
abbastanza di recente da averle generate. Serve quindi un secondo passo
server-side che generi le occorrenze in anticipo, **non** calcolato in
PL/pgSQL (regola 1 di CLAUDE.md, già rispettata da `ricorrenzaFaccende.ts`:
i calcoli di ricorrenza sono codice TypeScript testato, mai logica SQL) —
va invece in una **Edge Function schedulata**, nuova, che porta con sé la
stessa logica di espansione della ricorrenza (generalizzata per `impegni`,
punto sopra) scritta in TypeScript/Deno.

Decisione: abilitare l'estensione `pg_cron` (va verificato se nel piano
Supabase del progetto serve anche un'attivazione da dashboard, non solo da
migration) e schedulare, ogni 15 minuti, una chiamata (via `net.http_post`,
stesso meccanismo già usato dal trigger push) a una nuova Edge Function
`genera-promemoria-impegni` che, con la service role:

1. genera (idempotente, grazie a `unique(impegno_id, data_ora)`) le
   occorrenze dei prossimi ~60-90 giorni per ogni impegno ricorrente attivo
   — finestra esatta lasciata al builder;
2. cerca le occorrenze il cui impegno ha `promemoria_minuti_prima` non
   nullo, con `data_ora - (promemoria_minuti_prima * interval '1 minuto')
   <= now()`, `data_ora > now()` (mai avvisare per un impegno già passato
   se il job fosse stato fermo), e per cui non esiste già una notifica con
   lo stesso `evento_idempotenza` (`'impegno:' || occorrenza_id ||
   ':promemoria'`, stesso pattern già usato per
   `sfida:<id>:promemoria:<turno_id>`);
3. per ciascuna, inserisce una riga in `notifiche` **per ogni membro attivo
   del gruppo** (confermato in conversazione: il promemoria va a tutto il
   gruppo, non solo a chi ha creato l'impegno) — il trigger esistente fa il
   resto, nessuna modifica alla pipeline di invio.

Il builder valuta se condividere letteralmente il modulo di calcolo tra
l'app Expo e questa Edge Function (entrambi TypeScript, ma runtime diversi
— Expo/Metro vs Deno) o se è più semplice tenerne due copie testate
separatamente; è un dettaglio di packaging, non cambia la logica.

Estensioni minime e localizzate allo schema esistente, non un sistema nuovo:
- nuovo valore `'impegno_promemoria'` nel check constraint di
  `notifiche.tipo`;
- nuova colonna `impegno_id uuid references impegni(id) on delete cascade`
  su `notifiche`, parallela a `sfida_id` (serve per il deep-link dalla
  notifica al calendario — url esatto lasciato al builder, stesso branch
  già presente in `invia-push-notifica/index.ts` per `sfida_id`).

Il calcolo di "quando scatta il promemoria" userà sempre
`impostazioni_faccende.fuso_orario` del gruppo per interpretare correttamente
date senza ora — se un gruppo non ha ancora quella riga (modulo faccende non
attivato), usare il default `'Europe/Rome'` già previsto da quella tabella.

### UI — il pezzo davvero nuovo di questo lavoro

Nessun componente esistente copre una griglia mensile (tutto il resto
dell'app è liste). Serve:
- una vista mensile con celle giorno, un indicatore sui giorni che hanno
  impegni;
- tap su un giorno → lista degli impegni di quel giorno, con un modo per
  aggiungerne uno nuovo già con quella data precompilata;
- un form di creazione/modifica con: titolo, descrizione, data, ora
  (opzionale), ricorrenza (nessuna / ogni N giorni / settimanale / mensile,
  stessi controlli già esistenti per le faccende, va bene riusare lo stesso
  componente o pattern di input), promemoria (preset tipo "il giorno
  stesso / 1 ora prima / 1 giorno prima / 1 settimana prima" + custom, visto
  che l'utente vuole poterlo cambiare liberamente), interruttore
  "modificabile da tutti".

Libreria per la griglia: nessuna è già installata nel progetto per calendari
— il builder valuta se usarne una leggera per React Native/Expo o
costruire la griglia a mano (è un layout a 7 colonne, non richiede
funzionalità complesse); decisione lasciata al builder, da annotare come
sua scelta nel codice.

### Entry point: una tile nella Dashboard Bento

Confermato dall'utente: il punto d'ingresso è una nuova `GlassTile` nella
griglia della Dashboard del gruppo (`app/(app)/dashboard.tsx`), stessa
famiglia delle tile già presenti (Lista spesa, Gruppo, Faccende, Liste,
Sfide) — stessa icona Feather + colore d'accento + titolo + sottotitolo,
non un componente a parte. Es.: icona `calendar`, titolo "Calendario",
sottotitolo con il prossimo impegno in arrivo (stesso stile di
"3 articoli da comprare" / "Nessuna sfida attiva" già usato dalle altre
tile), `onPress` verso la nuova rotta del calendario. Il builder decide se
aggiungerla come terza tile nell'ultima riga (insieme a "Sfide") o in una
riga propria.

## Cosa resta al builder

- Nome esatto delle route/schermate (`app/(app)/calendario/...` o simile).
- Scelta/assenza di una libreria per la griglia mensile.
- Comportamento esatto di rigenerazione delle occorrenze quando si edita un
  impegno ricorrente (vedi sopra).
- Preset esatti del selettore di promemoria.
- Se `pg_cron` nel progetto Supabase va attivato anche da dashboard oltre
  alla migration (verificarlo prima di scrivere la migration che lo usa).
- Test unitari per il calcolo di ricorrenza/promemoria (riuso o estensione
  di quelli già esistenti per `ricorrenzaFaccende`), seguendo la
  convenzione del progetto di testare i moduli di calcolo.
