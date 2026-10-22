# Carte e buoni — Design

## Intento e perché

Due momenti concreti, confermati dall'utente: essere al supermercato e
dover trovare la carta fedeltà giusta tra tante, e avere un buono sconto
che rischia di perdersi/essere dimenticato prima di usarlo. In entrambi i
casi la soluzione è la stessa: una foto, facile da ritrovare, condivisa
con tutto il gruppo (è la tessera Esselunga "di casa", non quella di una
persona sola).

## Obiettivi

- Aggiungere una carta fedeltà o un buono sconto come foto (fotocamera o
  libreria) + un'etichetta di testo libero (es. "Esselunga", "Decathlon
  -20%").
- Due elenchi separati (carte fedeltà / buoni sconto) nella stessa
  sezione, condivisi con tutto il gruppo.
- Qualunque membro del gruppo può aggiungere, vedere ed eliminare
  qualunque carta/buono — stesso livello di fiducia già usato per liste e
  faccende, nessun ruolo "admin" in questo progetto.
- Punto d'ingresso dalla dashboard del gruppo, stessa tile già usata per
  Sfide/Faccende/Liste (confermato dall'utente via playback, nessuna
  obiezione).

## Non-obiettivi (in questa fase)

- Data di scadenza dei buoni e promemoria: l'utente vuole che in una
  fase futura sia un'AI a leggere la scadenza dalla foto, non un campo
  inserito a mano ora — costruire oggi un campo data manuale verrebbe
  gettato via in quella fase. Lo schema di oggi non lo prevede; aggiunta
  una colonna in una migration futura, quando quella fase arriva, non è
  un problema (append-only, come sempre in questo progetto).
- Nessun riconoscimento automatico di negozio/importo dalla foto (stessa
  AI futura di cui sopra).
- Nessuna modifica di una carta/buono già salvato (solo aggiungere ed
  eliminare): l'utente non ha chiesto di poter correggere un'etichetta o
  sostituire una foto, e aggiungerlo "per completezza" sarebbe
  anticipare un bisogno non espresso.
- Nessun "segna come usato" per i buoni: si elimina quando non serve più.
- Nessuna deduplicazione o validazione del contenuto della foto.

## Anti-obiettivi (cosa sarebbe un fallimento anche se "funziona")

- Un buono o una carta visibile/scaricabile da chi non è nel gruppo
  (es. un bucket di storage pubblico, o un URL che non scade mai e
  gira fuori dall'app): un buono spesso ha un codice usa-e-getta, una
  carta fedeltà spesso ha un codice a barre leggibile — la stessa
  attenzione già data al segreto dei voti nelle Sfide si applica qui ai
  file, non solo alle righe del database.
- File orfani nello storage (foto che restano anche dopo aver eliminato
  la riga, accumulandosi senza controllo) o righe "fantasma" che
  puntano a un file già cancellato.

## Vincoli

- Stesso stack: Supabase (Postgres + RLS + **Storage**, nuovo per questo
  progetto) + Expo/React Native.
- Nessuna libreria UI nuova per i componenti esistenti (riuso
  `GlassCard`, `BentoButton`, `SectionHeader`, `GlassTile`, `BentoScreen`)
  — ma **serve** una nuova libreria funzionale per fotocamera/libreria
  foto (`expo-image-picker`), che non è un componente UI del design
  system: nessuna alternativa già nel progetto la copre.
- RLS sempre via `e_membro_di(gruppo_id)`, stesso principio ovunque.
- Migrazioni nuove sempre append-only; applicazione al progetto Supabase
  collegato solo dopo autorizzazione esplicita in chat (stesso processo
  già seguito per Faccende e Sfida delle scelte).
- Branch dedicato, creato da `feature/sfida-scelte` (ultimo lavoro
  mergeabile); mai merge né push diretto su `main`.

## Risultati dell'audit (fatti verificati nel repository)

- Nessun uso di Supabase Storage in nessuna parte del progetto: prima
  volta che questa app carica file binari. Nessun bucket, nessuna policy
  di storage esistente da cui ripartire.
- Nessuna libreria di selezione immagini installata (`expo-image-picker`
  non è in `package.json`). Expo SDK in uso: `~57`.
- `app.json` non ha ancora descrizioni di permesso per fotocamera/libreria
  foto (`NSCameraUsageDescription`/`NSPhotoLibraryUsageDescription` lato
  iOS) — vanno aggiunte per poter chiedere questi permessi.
- Convenzione già stabilita per contenuto condiviso "di tutti, senza
  ruoli": `liste_tutti`/`voci_lista_tutti` (`00000000000006_liste.sql`),
  policy `for all using(e_membro_di(...)) with check(e_membro_di(...))` —
  stesso pattern da riusare qui.
- Pattern dashboard già stabilito in `app/(app)/dashboard.tsx`: griglia di
  `GlassTile` a due colonne per le funzioni principali del gruppo (Lista
  spesa, Gruppo, Faccende, Liste, e dal lavoro precedente Sfide da sola
  in una terza riga) — la tile di questa funzione va aggiunta lì,
  accoppiata con quella di Sfide per tornare a due colonne.

## Come funziona (flusso concettuale)

1. Dalla dashboard del gruppo, tile "Carte e buoni" → lista con due
   sezioni: **Carte fedeltà** e **Buoni sconto**, ciascuna una griglia di
   miniature con l'etichetta sotto.
2. Un form di aggiunta (inline, stesso principio di Liste/Faccende: niente
   schermata separata) con: scelta tipo (carta/buono), un bottone
   "Scatta foto" e uno "Scegli dalla libreria", campo etichetta.
3. Scelta la foto, l'app la carica nello storage del gruppo e inserisce
   la riga nel database; appare subito nella sezione giusta.
4. Toccare una miniatura la apre a schermo intero, immagine statica
   adattata allo schermo (niente pinch-to-zoom in questa fase — vedi §5:
   nessuna libreria di gesture nel progetto, e una foto ben inquadrata al
   momento dello scatto/ritaglio basta normalmente a leggere un codice a
   barre o un codice del buono; se in pratica non bastasse, aggiungere
   lo zoom dopo è un'estensione isolata a quella sola schermata, non una
   modifica allo schema o alle API). Da lì, eliminarla.

## Decisioni tecniche (le mie scelte, da confermare o correggere)

### 1. Schema dati

```sql
carte_buoni
  id uuid pk
  gruppo_id uuid -> gruppi
  tipo text check in ('carta', 'buono')
  etichetta text not null              -- es. "Esselunga", "Decathlon -20%"
  percorso_file text not null          -- percorso nel bucket storage, vedi §2
  creato_da uuid nullable -> membri (on delete set null, come creato_da altrove)
  creato_il timestamptz
```

Niente colonna "scaduto"/data: per il Non-obiettivo sopra. Niente
`aggiornato_il`/trigger: nessuna modifica dopo la creazione in questa
fase (solo insert/delete).

RLS: `carte_buoni_tutti for all using(e_membro_di(gruppo_id))
with check(e_membro_di(gruppo_id))` — stesso pattern di
`liste_tutti`/`voci_lista_tutti`, stesso livello di fiducia confermato
dall'utente (condiviso, nessun "solo chi l'ha caricata può eliminarla").

### 2. Storage: bucket privato, non pubblico

Un bucket **privato** chiamato `carte-buoni` (mai pubblico — vedi
l'anti-obiettivo sulla segretezza dei codici). Percorso di ogni file:
`<gruppo_id>/<nome-file-generato>.<estensione>`, così le policy di
storage possono leggere il primo segmento del percorso come `gruppo_id`
ed estendere lo stesso `e_membro_di()` già usato ovunque:

```sql
create policy carte_buoni_storage_tutti on storage.objects for all
  using (
    bucket_id = 'carte-buoni'
    and e_membro_di(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'carte-buoni'
    and e_membro_di(((storage.foldername(name))[1])::uuid)
  );
```

Lettura lato client: **URL firmati** (`createSignedUrl`, scadenza 1 ora,
rigenerati ad ogni refetch della lista) — non URL pubblici permanenti.
Compressione: solo tramite l'opzione `quality` di `expo-image-picker`
(es. 0.6), nessuna libreria di manipolazione immagini aggiuntiva: la
foto serve a essere letta a schermo (o in futuro da un'AI), non stampata.

**Eliminazione**: cancellare una riga `carte_buoni` deve cancellare anche
il file nello storage, altrimenti si accumulano file orfani (anti-obiettivo
sopra). Postgres non può richiamare l'API di Storage da un trigger SQL:
l'eliminazione resta orchestrata lato client in due passi (cancella il
file, poi cancella la riga) — non atomica in senso stretto, ma è lo
stesso compromesso già accettato altrove in questo progetto per
operazioni che toccano due sistemi diversi, e l'ordine (file prima, riga
dopo) fa sì che un fallimento a metà lasci nel dubbio una riga ancora
visibile piuttosto che un file invisibile ma ancora presente.

### 3. Libreria: expo-image-picker

`npx expo install expo-image-picker` (versione compatibile con Expo 57
scelta automaticamente). Il suo plugin Expo va aggiunto a `app.json` con
le descrizioni dei permessi:

```json
["expo-image-picker", {
  "photosPermission": "Bento usa le tue foto per salvare carte fedeltà e buoni sconto.",
  "cameraPermission": "Bento usa la fotocamera per fotografare carte fedeltà e buoni sconto."
}]
```

`allowsEditing: true` nella chiamata al picker (ritaglio nativo gratuito,
utile per inquadrare bene la carta/il buono).

Caricamento in React Native: `fetch(uriLocale).then(r => r.blob())` poi
`supabase.storage.from('carte-buoni').upload(percorso, blob, {contentType})`
come primo tentativo (nessuna libreria aggiuntiva di filesystem). È però
un punto noto di fragilità di React Native (blob corrotti/vuoti verso
alcuni server, mai testato in questo progetto perché prima integrazione
di Storage): il piano deve verificarlo con un vero upload riuscito prima
di considerarlo chiuso, e prevedere come ripiego `expo-file-system`
(lettura in base64 → `ArrayBuffer`) se il caricamento via blob risultasse
vuoto o corrotto - stesso approccio comune nelle app Expo+Supabase che
incontrano questo problema.

**Expo Go vs build nativo**: `expo-image-picker` (fotocamera e libreria)
funziona dentro Expo Go senza bisogno di un dev client o di una build
EAS — resta testabile con lo stesso flusso "Expo Go sul telefono" già
usato per ogni fase precedente. L'unica differenza: dentro Expo Go il
sistema mostra il proprio testo di permesso generico, non le descrizioni
personalizzate (`photosPermission`/`cameraPermission`) scritte in
`app.json`, che prendono effetto solo in una build nativa vera (prebuild/
EAS) — non è un blocco, solo un dettaglio da non confondere con un difetto
quando si testa in questa fase.

### 4. Pagine

- `app/(app)/carte-buoni/index.tsx` — le due sezioni + form di aggiunta
  inline (stesso principio di `liste/index.tsx`/`faccende/index.tsx`).
- Nessuna pagina di dettaglio separata: toccare una miniatura apre un
  overlay a schermo intero nella stessa pagina (niente nuova rotta).
- Tile "Carte e buoni" in `app/(app)/dashboard.tsx`, accoppiata a quella
  di Sfide nella stessa riga.

## Cosa resta al builder (dettaglio implementativo nel piano)

- Icona Feather esatta per la nuova tile (es. `credit-card` o `tag`).
  Colore accento: degli accenti in `theme/tokens.ts` (`oro`, `viola`,
  `ciano`, `menta`, `rosa`, `indaco`), la dashboard usa già `ciano`
  (Lista spesa), `viola` (Gruppo), `menta` (Faccende), `oro` (Liste),
  `rosa` (Sfide) — resta solo `indaco`, libero.
- Dimensione/qualità esatta di compressione, dettaglio del layout a
  griglia delle miniature, testo esatto dei permessi/errori.
- Gestione dell'errore "permesso negato" per fotocamera/libreria
  (messaggio leggibile, nessun crash).
