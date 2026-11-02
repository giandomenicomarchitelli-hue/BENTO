# Personale — Nuova Home a due mondi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** sostituire l'attuale Home (`app/(app)/index.tsx`, oggi un elenco
gruppi con scorciatoie) con uno switch a due ingressi, Personale e
Gruppi — la Fase 4 già prevista nello spec di "Personale", anticipata
ora su richiesta esplicita invece che dopo Note e Calendario unificato.

**Architecture:** `index.tsx` diventa lo switch minimale (due tile
grandi); il contenuto che oggi mostra subito (elenco gruppi, saldo
rapido, scorciatoie crea/unisciti, campanella, profilo) si sposta dentro
`app/(app)/gruppi/index.tsx`, sostituendo il suo contenuto attuale
(ancora pre-stile Bento) — stessa funzione, stesso comportamento, solo
spostata dietro l'ingresso "Gruppi". Ogni `<Redirect href="/gruppi">`
già sparso nell'app (faccende, calendario, liste, assistente, ecc.)
continua a funzionare esattamente come prima, perché la destinazione
`/gruppi` mantiene lo stesso scopo (mostra i gruppi, permette di
sceglierne uno), solo con un'interfaccia migliore. "Personale" ottiene
una sua schermata di destinazione (`app/(app)/personale/index.tsx`),
stesso pattern a griglia di tile della Dashboard di gruppo, con "Liste"
reale e due tile segnaposto ("Note", "Calendario") con badge "Presto"
(già supportato da `GlassTile`) per le fasi successive non ancora
costruite.

I due ingressi temporanei introdotti nella fase "Liste personali" (tile
"Personale" sulla Dashboard di gruppo, scorciatoia "Le mie liste" sulla
vecchia Home) vengono rimossi: lo switch di primo livello li sostituisce,
come già previsto quando furono aggiunti ("da rimuovere quando arriva la
Fase 4").

**Tech Stack:** React Native + Expo + TypeScript, componenti
`Bento*`/`Glass*` esistenti in `src/components` e `src/theme/tokens.ts`.

**Spec:** `docs/superpowers/specs/2026-11-02-personale-gruppi-design.md`
(sezione "Fase 4 — Nuova Home")

## Global Constraints

- Nessun cambiamento di comportamento per `/gruppi` oltre allo stile:
  stessa logica (`apriGruppo` imposta il gruppo attivo e naviga a
  `/dashboard`, stesse scorciatoie crea/unisciti), solo migrata ai
  componenti Bento. Ogni `<Redirect href="/gruppi">` esistente nell'app
  deve continuare a funzionare senza modifiche altrove.
- Il nuovo switch (`index.tsx`) resta `headerShown: false` (come oggi) —
  nessuna intestazione nativa, coerente con come la vecchia Home era
  registrata.
- `/gruppi` deve passare a `headerShown: false` nella sua registrazione
  (porta con sé l'intestazione completa — logo, campanella, profilo,
  esci — che prima aveva solo `index.tsx`; un'intestazione nativa in più
  sopra sarebbe duplicata).
- Rimuovere, non lasciare, i due ingressi temporanei (vedi Architecture)
  — altrimenti restano tre modi di raggiungere Personale invece di uno,
  con accenti/etichette già divergenti (trovato nella review finale della
  fase precedente).
- Stile: `BentoScreen`/`GlassCard`/`GlassTile`/`BentoButton`/`tokens.ts`
  — non lo stile dei file `app/(app)/prototipo-*.tsx` (prototipi isolati,
  non toccare, non presenti in questo worktree comunque).
- Fuori scope: Note e Calendario unificato restano tile segnaposto
  "Presto", nessuna nuova logica per loro in questa fase.

## Review Focus

- Un `<Redirect href="/gruppi">` da una qualsiasi schermata esistente
  (es. aprire `/calendario` senza gruppo attivo) deve atterrare sulla
  nuova `/gruppi` e funzionare esattamente come prima (scegliere un
  gruppo, crearne uno, unirsi con un codice) — nessuna di queste
  schermate va toccata in questo piano, ma il comportamento di arrivo
  deve restare identico (Task 1).
- Un utente senza nessun gruppo deve poter comunque raggiungere
  "Personale" dal nuovo switch di primo livello, senza passare da
  `/gruppi` — verificare che lo switch stesso non dipenda da
  `gruppoAttivoId` (Task 2).
- Dopo questo piano, deve esistere **un solo** punto d'ingresso a
  Personale dal flusso principale (lo switch), non più la tile
  temporanea sulla Dashboard né la scorciatoia temporanea sulla vecchia
  Home — verificare che entrambe siano state rimosse, non solo
  duplicate (Task 4).

---

## File Structure

```
app/(app)/gruppi/index.tsx     (sostituito: contenuto della vecchia Home)
app/(app)/index.tsx            (sostituito: nuovo switch Personale/Gruppi)
app/(app)/personale/index.tsx  (nuovo: landing dell'area Personale)
app/(app)/_layout.tsx          (modificato: headerShown su gruppi/index, nuova rotta personale/index)
app/(app)/dashboard.tsx        (modificato: rimossa la tile temporanea "Personale")
```

---

### Task 1: `/gruppi` eredita il contenuto della vecchia Home

**Files:**
- Modify: `app/(app)/gruppi/index.tsx` (sostituzione completa del contenuto)
- Modify: `app/(app)/_layout.tsx`

**Interfaces:**
- Produces: `/gruppi` con lo stesso comportamento di oggi (scegliere/
  creare/unirsi a un gruppo), nello stile Bento. Consumato da ogni
  `<Redirect href="/gruppi">` già esistente nell'app (nessuna di quelle
  schermate viene toccata).

- [ ] **Step 1: Sostituire il contenuto di `app/(app)/gruppi/index.tsx`**

Spostare lì, verbatim (stesso componente, stessa logica, stesso import),
il corpo ATTUALE di `app/(app)/index.tsx` — leggerlo per intero prima di
copiare: intestazione (logo, campanella con badge non lette, profilo,
esci), saluto, `HeroBalanceCard` "I tuoi spazi condivisi", elenco gruppi
(`GroupPreviewCard`), stato vuoto, gestione errore caricamento gruppi.

**Un'unica modifica all'array `azioniRapide`**: rimuovere la quarta voce
("Le mie liste" → `/personale/liste`, aggiunta temporaneamente nella
fase precedente) e ripristinare il commento originale che giustificava
"tre scorciatoie, non quattro" — la quarta non serve più qui perché lo
switch di primo livello (Task 2) è ora l'ingresso a Personale.

Il nome del componente esportato (`export default function ...`) può
restare `Gruppi` o diventare un nome più descrittivo tipo `GruppiHome` —
scelta del builder, non influisce su nulla esternamente (Expo Router usa
il percorso del file, non il nome della funzione).

- [ ] **Step 2: Aggiornare la registrazione della rotta**

In `_layout.tsx`, la voce `<Stack.Screen name="gruppi/index" ... />`
guadagna `headerShown: false` (il contenuto spostato porta la sua
intestazione completa, un'intestazione nativa sopra sarebbe duplicata).
Il campo `options` può perdere `title: 'I miei gruppi'` se sostituito da
`headerShown: false` (l'intestazione nativa con titolo non serve più se
non è mostrata).

- [ ] **Step 3: Verificare**

Run: `npx tsc --noEmit`
Expected: 0 errori

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/gruppi/index.tsx" "app/(app)/_layout.tsx"
git commit -m "feat: /gruppi eredita il contenuto della vecchia Home"
```

---

### Task 2: Nuovo switch Personale/Gruppi come Home

**Files:**
- Modify: `app/(app)/index.tsx` (sostituzione completa del contenuto)

**Interfaces:**
- Consumes: nessuna nuova dipendenza — `useProfilo` (per il guard
  "serve un nome utente fisso", già presente nella vecchia Home — da
  mantenere identico, non rimuoverlo: è l'unico vero guard rimasto su
  questa rotta) e `router` da `expo-router`.
- Produces: rotta `/` con due ingressi, `/personale` e `/gruppi`.

- [ ] **Step 1: Riscrivere `app/(app)/index.tsx`**

Mantenere identico il guard iniziale già presente nella vecchia Home
(`profiloInCaricamento` → spinner; `profilo === null` → `<Redirect
href="/crea-profilo" />`) — questo resta l'unico controllo sulla nuova
Home, nessuna dipendenza da `gruppoAttivoId` o da `useGruppoAttivo*`
(Review Focus: deve restare raggiungibile senza nessun gruppo).

Contenuto: `BentoScreen senzaIntestazione`, un saluto breve ("Ciao,
{profilo.nome_utente}"), e due `GlassTile` grandi (o un componente
equivalente a piena larghezza, a scelta del builder in base a cosa rende
meglio con solo due voci — es. due `GlassCard` affiancate o impilate):
- "Personale" → `router.push('/personale')`
- "Gruppi" → `router.push('/gruppi')`

Nessun elenco gruppi, nessuna scorciatoia, nessuna campanella/profilo/
esci qui — tutto quello che prima era in questa schermata ora vive in
`/gruppi` (Task 1). Se serve un modo rapido di uscire/vedere il profilo
dal primo livello, è una scelta del builder se aggiungerlo qui o lasciarlo
raggiungibile solo da dentro "Gruppi" (dove già c'è) — non bloccante,
nota la scelta nel report.

- [ ] **Step 2: Verificare**

Run: `npx tsc --noEmit`
Expected: 0 errori

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/index.tsx"
git commit -m "feat: nuova Home, switch Personale/Gruppi"
```

---

### Task 3: Landing dell'area Personale

**Files:**
- Create: `app/(app)/personale/index.tsx`
- Modify: `app/(app)/_layout.tsx`

**Interfaces:**
- Consumes: nessuna nuova dipendenza.
- Produces: rotta `/personale`.

- [ ] **Step 1: Registrare la rotta**

In `_layout.tsx`, aggiungere (vicino a `personale/liste/index`):
```tsx
<Stack.Screen name="personale/index" options={{ headerShown: false }} />
```

- [ ] **Step 2: `app/(app)/personale/index.tsx`**

Stesso pattern a griglia di tile di `app/(app)/dashboard.tsx` (leggerlo
per lo stile esatto): `BentoScreen`, una riga di `GlassTile`:
- "Liste" (icona a scelta del builder, es. `bookmark` o `list`,
  `accento` un valore `accenti.*` a scelta) → `router.push('/personale/liste')`
- "Note" — stessa riga, `badge="Presto"`, **nessun** `onPress` (tile non
  interattiva, come documentato in `GlassTile`'s commento sulla prop)
- "Calendario" — stessa riga, `badge="Presto"`, nessun `onPress`

Un titolo/intestazione semplice in cima (es. "Personale", come testo, non
serve un header nativo dato che la rotta ha `headerShown: false`).

- [ ] **Step 3: Verificare**

Run: `npx tsc --noEmit`
Expected: 0 errori

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/personale/index.tsx" "app/(app)/_layout.tsx"
git commit -m "feat: landing dell'area Personale"
```

---

### Task 4: Rimuovere gli ingressi temporanei

**Files:**
- Modify: `app/(app)/dashboard.tsx`

**Interfaces:**
- Consumes: nessuna.

- [ ] **Step 1: Rimuovere la tile temporanea "Personale" dalla Dashboard**

In `app/(app)/dashboard.tsx`, cercare il commento "Tile temporanea:
punto d'accesso provvisorio all'area 'Personale'..." e rimuovere sia il
commento sia la `GlassTile` che lo segue (quella con `titolo="Personale"`,
`onPress={() => router.push('/personale/liste')}`). La riga della
griglia (`rigaGriglia`) che la conteneva insieme a "Scrivi" torna ad
avere la sola tile "Scrivi" (stesso aspetto di prima della fase
precedente — una tile sola che occupa tutta la riga, comportamento già
accettato in quella fase).

(La rimozione della scorciatoia "Le mie liste" sulla vecchia Home è già
avvenuta nel Task 1, quando il contenuto è stato spostato a `/gruppi` —
non ripeterla qui.)

- [ ] **Step 2: Verificare**

Run: `npx tsc --noEmit`
Expected: 0 errori

- [ ] **Step 3: Verificare manualmente**

Run: `npm start`
Expected: Home (`/`) mostra solo "Personale"/"Gruppi"; "Gruppi" porta
all'elenco gruppi di prima (stesso aspetto Bento, stesse scorciatoie);
"Personale" porta alla nuova landing con "Liste" funzionante e "Note"/
"Calendario" mostrate ma non cliccabili con badge "Presto"; aprire una
schermata di gruppo senza gruppo attivo (es. `/calendario` da un
deep-link) reindirizza ancora correttamente a `/gruppi`; la Dashboard di
gruppo non ha più la tile "Personale".

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/dashboard.tsx"
git commit -m "feat: rimossi gli ingressi temporanei a Personale"
```

---

## Self-Review

**Copertura dello spec:** la sezione "Fase 4 — Nuova Home" dello spec è
interamente coperta: switch di primo livello (Task 2), contenuto
esistente migrato senza perdita di funzionalità (Task 1), landing di
Personale con le tile segnaposto per le fasi non ancora costruite
(Task 3), pulizia degli ingressi provvisori (Task 4).

**Proporzione:** nessun blocco di codice completo pinnato — ogni task
descrive un comportamento da spostare/riusare (il contenuto esistente di
`index.tsx`, il pattern a griglia già in `dashboard.tsx`) o un pattern
già documentato nel componente stesso (`GlassTile`'s prop `badge`/
`onPress` opzionale), coerente con la proporzione delle fasi precedenti.
