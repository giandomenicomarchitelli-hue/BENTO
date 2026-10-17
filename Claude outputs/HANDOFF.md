# Handoff: concept "Home — il vassoio" → implementazione

Questo file e i due `.html` in questa cartella sono il concept visivo che abbiamo disegnato nel canvas
(Artifact "Bento — concept vassoio", pagina 2: "Home — il vassoio copy" e "Racconta cosa hai fatto copy").
Sono **markup statico**, non codice React Native: servono come riferimento esatto di colori, spaziature e
layout quando si scrive il vero componente. Non sostituiscono CLAUDE.md / PRODUCT.md — li applicano a questo
concept specifico.

## 1. Schermate coinvolte

| File di riferimento | Cosa diventa nell'app | Note |
|---|---|---|
| `home.html` | la home dopo il login (probabilmente `app/(app)/index.tsx` o `app/(app)/dashboard.tsx` — verificare quale dei due renderizza oggi questa rotta prima di scegliere dove lavorare) | sostituisce/riorganizza la pila di card attuale in un layout "vassoio" |
| `racconta-cosa-hai-fatto.html` | un nuovo bottom sheet, aperto dalla barra persistente in fondo alla home | oggi probabilmente non esiste un flusso equivalente generico — verificare se c'è già qualcosa in `app/(app)/lista-spesa.tsx` o simili da riusare |

## 2. Colori: usare i token reali, non gli hex del mockup

Il mockup ha gli hex scritti a mano perché è stato disegnato fuori dal progetto. Nel codice vero vanno
tutti sostituiti con i token di `src/theme/tokens.ts`:

- sfondo pagina `#F6F8FC` → `bento.sfondo`
- il gradiente della card del saldo (`#6D6AF8 → #A98CF4 → #F35BA6`) → **è già `gradienti.hero`**, lo stesso
  token usato altrove nelle schermate migrate (dashboard, homepage): non va reinventato, va solo applicato qui
- chip avatar (`#ECEBFE` bg, `#5B55E8` testo) e card "gruppo" (`#ECEBFE`/`#DAD8FD`/`#4C46D1`) → famiglia `accenti.indaco`
- card "lista spesa" (`#E3F6FC`/`#CFEFFA`/`#0E7490`) → famiglia `accenti.ciano`
- card "faccende" (`#E3FBF2`/`#CFF5E4`/`#0F9D71`) → famiglia `accenti.menta`
- card "liste" (`#FFF6E0`/`#FBEBC2`/`#B9780A`) → famiglia `accenti.oro`
- barra inferiore scura (`#0F172A`) + bottone microfono (`#6D6AF8`) → ink scuro del tema + `accenti.indaco`

Verifica i nomi esatti nel file: i valori sopra sono quelli con cui abbiamo disegnato il concept, presi
dalla stessa tavolozza del progetto, non inventati — ma conviene far controllare a Claude Code i nomi correnti
prima di scrivere, nel caso i token siano cambiati da quando li ho letti.

## 3. Comportamento, non solo aspetto

- La barra "Dimmi cosa hai fatto…" in fondo alla home è un **campo di testo** in questa fase: il tap apre il
  foglio con un input a cui si digita, non un microfono già attivo. L'icona del microfono resta visibile —
  coerente col principio del progetto di non precludere la fase vocale futura — ma in fase 1 può restare
  presente e disabilitata, o mostrare un piccolo avviso "Arriva con la voce, presto" al tocco.
- Le "scorciatoie di frase" (i chip "Ho pagato le bollette", ecc.) **popolano il campo di testo**, non eseguono
  l'azione direttamente: passano comunque dall'interpretazione e dalla conferma sotto.
- La card di conferma mostra uno split 50/50 già calcolato: per regola del progetto, **lo split e il saldo li
  calcola sempre il codice, mai il modello linguistico** — l'AI interpreta solo cosa è successo (importo,
  chi ha pagato, cosa è stato comprato), il codice fa il calcolo e lo rende deterministico.
- "Conferma spesa" deve passare dalla stessa conferma esplicita richiesta prima di registrare qualunque
  movimento di denaro, ed essere un'operazione reversibile e loggata come tutte le altre.
- Gli importi sono sempre interi in centesimi internamente (3,20 € → 320), anche se il mockup li mostra
  formattati in euro.

## 4. Cosa è davvero nuovo rispetto a oggi

- Una barra di input persistente in linguaggio naturale (nuovo componente, es. `NaturalInputBar`)
- Un bottom sheet di conferma spesa/azione generato da testo libero (verificare cosa esiste già)
- Il layout "vassoio" della home: probabilmente riorganizza `HeroBalanceCard` + `GroupBalanceCard` e aggiunge
  le nuove card "faccende" (non ancora costruita, fase 3) e "liste"

## 5. Un prompt pronto per Claude Code

```
Ho un concept di design per la home dell'app, in design-concepts/vassoio/ (home.html,
racconta-cosa-hai-fatto.html, HANDOFF.md — leggi prima HANDOFF.md). Voglio implementarlo nella rotta
giusta sotto app/(app)/, usando i token reali di src/theme/tokens.ts al posto degli hex nel mockup e i
componenti esistenti in src/components dove possibile; nuovi componenti solo dove non c'è equivalente
(la barra di input persistente, il bottom sheet di conferma). Rispetta CLAUDE.md e PRODUCT.md: soldi
sempre interi in centesimi, saldo sempre derivato dalla cronologia delle spese (mai salvato a mano),
split calcolato sempre dal codice e mai dal modello, conferma esplicita obbligatoria prima di registrare
un movimento di denaro, ogni operazione reversibile e loggata. In questa fase l'input è solo testo: il
microfono resta visibile nell'interfaccia ma non attivo. Prima fammi un piano di cosa tocchi e perché,
poi implementa.
```

## 6. Da decidere insieme, non da indovinare

- Questo è il concept originale ("il vassoio"). Nello stesso canvas esiste anche un audit di gusto con una
  versione corretta — stesso impianto ma un solo colore d'accento e il vassoio disegnato come una vera forma
  asimmetrica invece di quattro card uguali. Se preferisci partire da quella, dimmelo e rifaccio questo
  handoff sulla revisione.
- Il Mac è collegato a questa sessione: se preferisci che implementi direttamente qui invece di passare da
  Claude Code in locale, posso farlo — dimmi quale dei due modi preferisci.
