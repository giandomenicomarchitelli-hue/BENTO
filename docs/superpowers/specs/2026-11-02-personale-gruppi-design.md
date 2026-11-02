# Architettura "due mondi": Personale e Gruppi — Design

## Intento

Oggi l'app è centrata sul gruppo attivo: la Home (`app/(app)/index.tsx`)
mostra subito l'elenco dei gruppi, e quasi tutto il resto presuppone un
gruppo selezionato. L'utente vuole separare due aree concettualmente
diverse:

- **Personale** — cose private dell'utente, mai condivise con un gruppo:
  liste, note, un calendario che unisce i propri impegni personali con
  quelli di TUTTI i gruppi di cui fa parte (non solo quello attivo).
- **Gruppi** — quello che esiste già (elenco gruppi → dashboard di
  gruppo), più l'accesso ai Saldi, portato dentro questo mondo invece di
  restare una scorciatoia a sé.

## Fuori scope per questa fase (esplicito)

- Gestione password/credenziali.
- "Ponti" tra personale e condiviso (es. trasformare una nota personale
  in una lista di gruppo). Richiede di capire bene i casi d'uso prima —
  fase successiva.
- Faccende/modifiche-cancellazioni via chat (già deciso fuori scope nella
  fase "chat universale", non riguarda questo lavoro).

## Architettura di navigazione

`app/(app)/index.tsx` (oggi "Homepage", la vera Home dell'app — route
`/`) diventa lo switch a due ingressi: Personale / Gruppi. Il contenuto
che oggi mostra subito (elenco gruppi, saldo rapido, scorciatoie crea/
unisciti) resta lo stesso contenuto, ma si sposta dietro l'ingresso
"Gruppi" — riusando la route `/gruppi` già esistente (oggi un elenco
semplice non ancora nello stile Bento) invece di duplicare la logica.
Questa è l'ultima fase da implementare (Fase 4: nuova Home), per poter
sviluppare e testare le tre sezioni di Personale separatamente prima di
toccare la navigazione principale.

"Saldi" non diventa un terzo ingresso nello switch: resta raggiungibile
da dove già lo è oggi (scorciatoia "I tuoi saldi" verso
`/saldi-personali`, e il saldo del singolo gruppo dentro la sua
dashboard) — semplicemente quella scorciatoia finisce nel mondo "Gruppi"
invece che nella Home di primo livello. Nessun nuovo codice per i saldi
in questa fase.

## Decisione di modello dati: tabelle separate, non `gruppo_id` nullable

**Scelta:** contenuti personali (liste, note, eventi) vivono in tabelle
proprie (`liste_personali`, `note_personali`, `eventi_personali`...),
non riusando `liste`/`impegni` con `gruppo_id` reso nullable.

**Perché (due righe):** le tabelle di gruppo legano la paternità di una
riga a `membri(id)` (chi, tra i membri del gruppo, l'ha creata) — un
contenuto personale non ha un `membro`, ha solo `auth.users(id)`
direttamente (stesso pattern già usato da `profili.utente_id` e
`membri.utente_id`). Riusare la stessa tabella per entrambi i casi
richiederebbe o due colonne di paternità mutuamente esclusive (una per
`membri`, una per `auth.users`) o una RLS che controlla due condizioni
completamente diverse a seconda che `gruppo_id` sia nullo — più
complesso, più facile da sbagliare, per un risparmio di codice minimo
(le funzioni CRUD restano comunque quasi identiche, solo scoped
diversamente). Tabelle separate: RLS banale (`utente_id = auth.uid()`,
punto), nessuna colonna doppia, nessun vincolo di esclusione reciproca.

Questa decisione vale per tutte e tre le sezioni di Personale (liste,
note, eventi) — non va ridiscussa fase per fase.

## Fase 1 — Liste personali (questo piano)

Vedi `docs/superpowers/plans/2026-11-02-personale-liste.md`.

## Fase 2 — Note personali (piano successivo, non ancora scritto)

Stesso pattern di tabella separata (`note_personali`), scoped per
`utente_id`. Contenuto con formattazione minima (grassetto, corsivo,
elenco puntato) + foto allegate via Supabase Storage (bucket dedicato,
object path `<utente_id>/<nota_id>/<file>`, RLS sul bucket che verifica
il primo segmento del path contro `auth.uid()` — stesso principio delle
tabelle, nessuna condivisione).

Libreria per il testo formattato: **non** un editor WYSIWYG nativo (le
librerie RN per rich text sono o basate su WebView, pesanti e poco
"native", o immature) — formattazione a sintassi leggera tipo Markdown
digitata in un `TextInput` normale (`**grassetto**`, `*corsivo*`, `- voce`),
renderizzata in sola lettura con una libreria di markdown leggera già
nell'ecosistema Expo (es. `react-native-markdown-display`). Zero
dipendenze pesanti, editing = lo stesso `TextInput` multilinea già usato
in tutta l'app, copre esattamente i tre stili richiesti. Decisione da
confermare nel piano di Fase 2, non bloccante per la Fase 1.

## Fase 3 — Calendario unificato (piano successivo, non ancora scritto)

`eventi_personali` (tabella propria, stesso pattern) + aggregazione in
lettura di `occorrenze_impegni` per **tutti** i gruppi di cui l'utente è
membro attivo (oggi `listaOccorrenzeImpegni` filtra per un singolo
`gruppoId` — serve una nuova funzione che prende una lista di gruppi,
non un `gruppoAttivoId`). Distinzione visiva per provenienza: colore per
gruppo (riusa `accenti.*` già esistente, un colore stabile per gruppo,
es. hash dell'id) più un colore fisso per gli eventi personali.

## Fase 4 — Nuova Home (piano successivo, non ancora scritto)

Vedi "Architettura di navigazione" sopra.
