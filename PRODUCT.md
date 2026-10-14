# Product

<!-- impeccable:product-schema 1 -->

## Platform

ios

Bento è un'app React Native/Expo cross-platform (iOS + Android), con un design system unico e completamente custom condiviso su entrambe le piattaforme — non adatta l'aspetto alle convenzioni native per OS. iOS è la piattaforma primaria di sviluppo/test (icona home screen, Expo Go).

## Users

Gruppi di persone che condividono la vita quotidiana e le spese/faccende di casa: coppie conviventi, coinquilini, colleghi d'ufficio, gruppi di amici in viaggio. Fase attuale (fase 1 della roadmap): un gruppo di 2 persone, caso d'uso principale "coppia convivente che gestisce spesa e conti di casa".

## Product Purpose

Gestire in un unico posto la vita condivisa di un gruppo: lista della spesa condivisa, spese condivise con calcolo automatico di chi deve cosa a chi, faccende di casa con peso/punteggio. Successo = il gruppo smette di litigare o tenere il conto a mente di chi ha pagato/comprato cosa.

## Positioning

A differenza di un'app di spese generica, Bento è pensata per essere usata mentre si fa la cosa reale (si va a fare la spesa, si torna a casa) con input in linguaggio naturale — anche vocale in futuro — che l'AI interpreta ma il cui effetto (divisioni, saldi) è sempre calcolato da codice deterministico, mai dal modello. L'utente non "apre un form di spesa": dice/scrive cosa ha fatto.

## Operating Context

- Il gruppo (casa, viaggio, ufficio) è l'unità base; ha N membri, mai assunti "sempre 2".
- Roadmap a fasi, una alla volta: (1) gruppo da 2 persone, lista spesa + spese/saldo, solo testo — fase attuale; (2) input vocale + interpretazione AI; (3) faccende/punteggi/sfida; (4) gruppi N membri e altri scenari (viaggio, coinquilini, ufficio).
- Backend Supabase (Postgres/Auth/Realtime/Edge Functions); l'interpretazione linguaggio naturale passa SOLO da Edge Function server-side, mai dall'app.

## Capabilities and Constraints

- Le divisioni di spesa, i saldi e i punteggi sono sempre calcolati da codice deterministico, mai dall'LLM.
- Importi sempre in centesimi (interi), mai float.
- I saldi si calcolano dalle spese (storico = fonte di verità), non si salvano a mano.
- Operazioni ambigue o che riguardano soldi richiedono conferma esplicita dell'utente prima di essere registrate.
- Ogni operazione è annullabile e tracciata nello storico.
- Privacy: audio cancellato dopo trascrizione, nessun dato personale nei log, chiave API Claude solo lato server.
- TypeScript strict, niente `any`.

## Brand Commitments

Nome: **Bento** (gioco di parole intenzionale: il "bento box" è letteralmente un contenitore a scomparti colorati — coerente con un linguaggio visivo a blocchi di colore). Icona app già esistente per la home screen iPhone. Testi dell'interfaccia in italiano.

## Evidence on Hand

Codebase esistente con 18 schermate funzionanti (auth, dashboard, lista spesa, saldi, gruppo, liste personalizzate). Nessun asset di marketing, nessun contenuto reale di terzi da preservare: tutto il copy visibile è generato dall'app stessa (nomi gruppi, importi, liste).

## Product Principles

1. Il codice calcola, l'AI interpreta — mai il contrario, nemmeno nella UI (niente stime "a occhio" mostrate come fatti).
2. Il gruppo è sempre N persone: nessun layout/componente deve assumere "coppia" o "due colonne fisse".
3. L'input naturale (fase 2) è la direzione strategica: la UI di fase 1 non deve chiudere la porta a flussi conversazionali futuri.
4. Ogni azione con impatto economico è reversibile e visibile nello storico — mai un'azione distruttiva silenziosa.
