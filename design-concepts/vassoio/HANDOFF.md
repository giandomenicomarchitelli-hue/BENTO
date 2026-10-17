# Handoff: progetto di design "il vassoio" su tutte le schermate → implementazione

Questa cartella contiene il concept visivo completo disegnato nel canvas (Artifact "Bento — concept
vassoio") per **tutte le ~20 schermate reali dell'app**, nello stile del primo concept ("il vassoio"):
scomparto con gradiente viola→rosa per i numeri in evidenza, comparti colorati pastello, etichette
maiuscole tracciate, righe bianche bordate, chip a pillola, bottoni con ombra colorata.

Sono **markup statico**, non codice React Native: servono come riferimento esatto di colori, spaziature
e layout quando si scrive il vero componente. Ogni schermata è stata disegnata leggendo il vero file
`.tsx` corrispondente — stessi testi, stessi campi, stesso comportamento — mai inventata. Non sostituiscono
CLAUDE.md / PRODUCT.md — li applicano a questo concept specifico.

## 1. Schermate coinvolte

| File di riferimento | Rotta reale | Note |
|---|---|---|
| `home.html` | `app/(app)/dashboard.tsx` | la schermata di un singolo gruppo (card saldo, lista spesa, gruppo, faccende, liste) — **non** la home dopo il login |
| `racconta-cosa-hai-fatto.html` | nuovo bottom sheet, aperto dalla barra persistente in fondo a `dashboard.tsx` | fase 1: input di solo testo |
| `accedi.html` | `app/(auth)/accedi.tsx` | form di login |
| `registrati.html` | `app/(auth)/registrati.tsx` | form di registrazione (non copre lo stato "controlla la tua email" dopo l'invio) |
| `crea-profilo.html` | `app/(app)/crea-profilo.tsx` | scelta nome utente, una tantum |
| `homepage.html` | `app/(app)/index.tsx` | la vera home dopo il login: elenco dei gruppi dell'utente, diversa da `home.html`/`dashboard.tsx` |
| `onboarding-crea-gruppo.html` | `app/(app)/onboarding/crea-gruppo.tsx` | nome gruppo + tipo (casa/viaggio/ufficio/altro) |
| `onboarding-unisciti-a-gruppo.html` | `app/(app)/onboarding/unisciti-a-gruppo.tsx` | inserimento codice invito |
| `lista-spesa.html` | `app/(app)/lista-spesa.tsx` | sezioni "da comprare"/"comprati" |
| `liste-index.html` | `app/(app)/liste/index.tsx` | creazione lista + elenco liste del gruppo |
| `liste-dettaglio.html` | `app/(app)/liste/[id].tsx` | voci di una lista, qui nello stato "con prezzi" (mostra anche il campo nota e la voce fatta è bloccata al tap) |
| `modifica-acquisto.html` | `app/(app)/articoli/[id].tsx` **e** `app/(app)/voci/[id].tsx` | componente condiviso `ModificaAcquisto` — stesso schermo per entrambe le rotte |
| `gruppo-impostazioni.html` | `app/(app)/gruppo/index.tsx` | nome gruppo, codice invito, membri, uscita dal gruppo |
| `gruppi-index.html` | `app/(app)/gruppi/index.tsx` | elenco di tutti i gruppi dell'utente |
| `profilo.html` | `app/(app)/profilo.tsx` | nome utente fisso + codice utente |
| `saldi-gruppo.html` | `app/(app)/saldi/index.tsx` | saldi e spese di un gruppo |
| `saldi-salda.html` | `app/(app)/saldi/salda.tsx` | form "chi paga / a chi / importo" |
| `saldi-personali-index.html` | `app/(app)/saldi-personali/index.tsx` | saldo netto per persona, su tutti i gruppi in comune |
| `saldi-personali-dettaglio.html` | `app/(app)/saldi-personali/[utenteId].tsx` | dettaglio saldo con una persona + "salda tutto" |
| `nuova-spesa.html` | `app/(app)/spese/nuova.tsx` | form manuale di registrazione spesa (qui nello stato "arrivo da un articolo della lista della spesa", il più ricco) |

## 2. Colori: usare i token reali, non gli hex del mockup

Il mockup ha gli hex scritti a mano perché è stato disegnato fuori dal progetto. Nel codice vero vanno
sostituiti con i token di `src/theme/tokens.ts`. Verifica i nomi esatti prima di scrivere — qui sotto la
mappatura con cui abbiamo disegnato il concept:

- sfondo pagina `#F6F8FC` → `bento.sfondo`
- testo primario `#0F172A` → `bento.testoPrimario`; testo secondario `#3A4150`/`#64748B` → vicino a
  `colori.inchiostro700`/`bento.testoSecondario` (verificare quale delle due scale sta usando la rotta:
  le schermate non ancora migrate usano `colori`, non `bento`)
- il gradiente dello scomparto in evidenza (`#6D6AF8 → #A98CF4 → #F35BA6`) → **è già `gradienti.hero`**,
  lo stesso token usato in `dashboard.tsx`/`index.tsx` migrati: non va reinventato
- testo/icone bianchi sopra il gradiente → `bento.testoSuScuro` o semplicemente `#fff`/rgba bianco
- bottone pieno indaco con ombra (`#6D6AF8`, shadow `rgba(109,106,248,0.3)`) → `accenti.indaco` + una
  resa shadow coerente con `elevazione.media` (verificare che il colore d'ombra segua l'accento e non
  `elevazione` di default, che è neutro)
- riga bordata translucida (`rgba(255,255,255,0.72)` bg, `rgba(148,163,184,0.18)` bordo) → `bento.bordoSoft`
  per il bordo; per lo sfondo non c'è un token "translucido chiaro" pronto, verificare se
  `bento.superficieTranslucida`/`superficieMuta` (pensati per stare sopra un BlurView) rendono bene anche
  senza blur, altrimenti serve un nuovo token più chiaro
- chip pillola selezionato (`#6D6AF8` bg bianco testo) / non selezionato (`#F1F3F6` bg, `#3A4150` testo) →
  `accenti.indaco` + un grigio chiaro vicino a `colori.inchiostro100`
- credito/debito reale (verde/rosso in saldi, liste con prezzi) → **sempre** `semantica.successo`/
  `semantica.pericolo` (o `colori.verde700`/`rosso600` nelle rotte non migrate) — mai un colore decorativo

### Famiglie di colore pastello per i comparti (DA AGGIUNGERE a tokens.ts)

Il "vassoio" usa, per ogni categoria, tre toni della stessa famiglia: uno sfondo molto chiaro per la
card, uno leggermente più scuro per lo sfondo dell'icona, e un colore scuro per il tratto dell'icona
stessa. Oggi `tokens.ts` ha solo il tono singolo (`accenti.ciano`, `.indaco`, `.menta`, `.oro`, `.rosa`),
non queste varianti chiare — andrebbero aggiunte, sul modello di `semantica.successoSoft` ecc.:

| Famiglia | Sfondo card | Sfondo icona | Tratto icona | Usata per |
|---|---|---|---|---|
| ciano | `#E3F6FC` | `#CFEFFA` | `#0E7490` | lista della spesa |
| indaco/viola | `#ECEBFE` | `#DAD8FD` | `#4C46D1` | gruppo, membri, profilo |
| menta | `#E3FBF2` | `#CFF5E4` | `#0F9D71` | faccende, "PRESTO" |
| oro | `#FFF6E0` | `#FBEBC2` | `#B9780A` | liste, saldi personali |
| rosa | `#FDE7F1` | — | `#C2267F` | voce "in evidenza" secondaria / gruppi di viaggio |

Proposta: aggiungere un oggetto tipo `accentiTenue` (o `accenti.ciano.tenue`/`.chip`/`.tratto` se si
preferisce annidare) in `tokens.ts`, seguendo esattamente questi hex — sono presi dal concept, non
inventati ora, ma vanno rivisti insieme a chi scrive il codice prima di fissarli.

## 3. Comportamento, non solo aspetto — regole non negoziabili del progetto

- Soldi sempre interi in centesimi internamente (es. 3,20 € → 320), anche se il mockup mostra l'euro
  formattato.
- Il saldo è sempre derivato dalla cronologia delle spese, mai salvato a mano.
- Lo split tra le persone lo calcola **sempre il codice** (es. `dividiEqualmente`), mai un modello
  linguistico — l'eventuale interpretazione AI (barra "Dimmi cosa hai fatto…") capisce solo importo/chi
  ha pagato/cosa è successo, il calcolo resta deterministico.
- Ogni movimento di denaro richiede conferma esplicita prima di essere registrato, ed è reversibile e
  loggato (vedi `modifica-acquisto.html` → "Annulla acquisto", `saldi-gruppo.html` → "x" per annullare
  una spesa).
- `liste-dettaglio.html`: una voce fatta appartenente a una lista "con prezzi" si modifica solo tramite
  l'icona "⋮", non con un tap diretto sulla riga — per non togliere la spunta per sbaglio. Le liste senza
  prezzi restano un tap diretto (non illustrato qui, vedi `app/(app)/liste/[id].tsx`).
- `nuova-spesa.html`: quando si arriva da un articolo/voce, "chi l'ha comprato" è chi ha pagato la spesa,
  non necessariamente chi sta compilando il form; esiste anche un percorso "segna fatto senza registrare
  la spesa" che non crea alcun movimento di denaro.
- `gruppo-impostazioni.html`: non si può uscire da un gruppo con un saldo aperto — l'app blocca l'azione
  con un messaggio, non la nasconde e basta (non illustrato visivamente qui, ma va riprodotto).

## 4. Cosa è davvero nuovo rispetto a oggi

- Il layout "vassoio" per le rotte di gruppo (`dashboard.tsx`) e per la nuova Homepage (`index.tsx`)
- Una barra di input persistente in linguaggio naturale (nuovo componente, es. `NaturalInputBar`) e il
  bottom sheet di conferma generato da testo libero
- Le varianti pastello dei token colore descritte sopra (§2), oggi assenti
- Tutto il resto (form di auth, liste, saldi, impostazioni gruppo) **riveste** schermate che esistono già
  nel codice — il comportamento e i campi non cambiano, cambia solo l'aspetto

## 5. Un prompt pronto per Claude Code

Il lavoro è grande (18 schermate più le due già consegnate in precedenza): conviene farlo a tappe
invece che in un colpo solo, così puoi rivedere ogni tappa prima di passare alla successiva.

```
Ho un progetto di design completo per l'app, in design-concepts/vassoio/ (18 file .html più home.html e
racconta-cosa-hai-fatto.html già consegnati prima, e HANDOFF.md — leggi prima HANDOFF.md, contiene la
mappatura schermata→rotta e colore→token). Voglio implementarlo un gruppo di schermate alla volta, nelle
rotte reali sotto app/(auth)/ e app/(app)/, usando i token di src/theme/tokens.ts al posto degli hex nel
mockup (HANDOFF.md propone anche alcune nuove varianti pastello da aggiungere ai token: proponimele prima
di scriverle, non deciderle da solo) e i componenti esistenti in src/components dove possibile. Rispetta
CLAUDE.md e PRODUCT.md: soldi sempre interi in centesimi, saldo sempre derivato dalla cronologia delle
spese, split calcolato sempre dal codice e mai dal modello, conferma esplicita obbligatoria prima di
registrare un movimento di denaro, ogni operazione reversibile e loggata, verde/rosso riservati solo a
credito/debito reale.

Inizia da questo gruppo: accedi.html, registrati.html, crea-profilo.html, homepage.html,
onboarding-crea-gruppo.html, onboarding-unisciti-a-gruppo.html (l'imbuto di ingresso). Fammi prima un
piano di cosa tocchi e perché, poi implementa solo questo gruppo e fermati lì: voglio rivedere prima di
andare avanti con liste/saldi/gruppo.
```

Gruppi successivi, da proporre a Claude Code uno alla volta allo stesso modo:

1. **Ingresso**: accedi, registrati, crea-profilo, homepage, onboarding-crea-gruppo, onboarding-unisciti-a-gruppo
2. **Liste**: lista-spesa, liste-index, liste-dettaglio, modifica-acquisto
3. **Gruppo**: gruppo-impostazioni, gruppi-index, profilo
4. **Saldi**: saldi-gruppo, saldi-salda, saldi-personali-index, saldi-personali-dettaglio
5. **Spesa manuale**: nuova-spesa

## 6. Da decidere insieme, non da indovinare

- Questo handoff copre la direzione "il vassoio" originale (gradiente, comparti pastello, etichette
  maiuscole). Nello stesso canvas esiste anche un audit di gusto con una versione corretta — un solo
  colore d'accento, niente gradiente, il vassoio come forma asimmetrica invece di quattro card uguali.
  Se a metà implementazione cambi idea su quale direzione preferisci, fermati e dimmelo prima di
  continuare: le due versioni non si mischiano bene a metà.
- Il Mac è collegato a questa sessione: se in un punto qualsiasi preferisci che implementi direttamente
  qui invece di passare da Claude Code in locale, dimmelo — ma resta comunque la regola di non toccare
  mai `app/`/`src/` senza che tu lo chieda esplicitamente.
