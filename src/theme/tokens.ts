/**
 * Design token centrali dell'app: colori, tipografia, spaziature, raggi.
 *
 * Il tema scuro "Liquid Glass" (coloriScuri, accenti, vetro, elevazione,
 * movimento) è additivo: nessuno dei token esistenti sopra è stato
 * rimosso o rinominato, le schermate già migrate (dashboard, gruppo,
 * lista-spesa, saldi, la vecchia home) continuano a funzionare invariate.
 * Le nuove schermate "Bento" (componenti in src/components/Glass*.tsx,
 * Bento*.tsx) usano invece i token scuri qui sotto.
 */

export const colori = {
  blu600: '#2d6cdf',
  blu700: '#2558bb',
  blu100: '#dbe6fb',
  blu50: '#eef3fd',

  inchiostro900: '#14181f',
  inchiostro700: '#3a4150',
  inchiostro500: '#4b5563',
  inchiostro300: '#c7ccd4',
  inchiostro150: '#e6e9ee',
  inchiostro100: '#f1f3f6',

  superficie: '#ffffff',
  sfondoApp: '#f5f6f8',

  // Semantica finanziaria: rosso = devo, verde = mi deve. Restano questi,
  // ovunque nell'app, anche nelle schermate col tema scuro - non vanno mai
  // sostituiti da `accenti.finanza` (quello è branding di sezione, non un
  // segnale di credito/debito).
  rosso600: '#c0392b',
  verde700: '#2e7d32',

  // Gradiente "hero": per le card in evidenza (es. saldo aggregato in
  // Homepage), non per l'uso diffuso - il blu resta il colore primario
  // dell'app.
  viola600: '#7c3aed',
  magenta600: '#db2777',
} as const;

export const gradienteHero = ['#7c3aed', '#db2777'] as const;

export const spaziatura = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;

export const raggio = {
  sm: 10,
  md: 14,
  lg: 20,
  // Raggi estesi per le superfici "Liquid Glass" (card/tile grandi, pillole).
  xl: 28,
  xxl: 36,
  pillola: 999,
} as const;

export const tipografia = {
  titolo: { fontSize: 26, fontWeight: '700' as const, letterSpacing: -0.2 },
  etichetta: { fontSize: 13, fontWeight: '600' as const },
  corpo: { fontSize: 15, fontWeight: '600' as const },
  corpoSecondario: { fontSize: 12.5, fontWeight: '500' as const },
  // Scala estesa per il tema scuro: un titolo più grande per gli hero
  // (es. saluto in home) e una didascalia più piccola per le etichette
  // minime dentro le card vetro.
  display: { fontSize: 34, fontWeight: '800' as const, letterSpacing: -0.4 },
  titoloSezione: { fontSize: 20, fontWeight: '700' as const, letterSpacing: -0.2 },
  didascalia: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.3 },
};

/**
 * Tema scuro "Liquid Glass": palette navy profonda, superfici translucide,
 * quattro colori d'accento legati alle quattro aree dell'app (finanza,
 * attività, liste, gruppi - lo stesso schema dell'icona a quattro
 * quadranti). Non sostituisce `colori` (chiaro, usato dalle schermate già
 * esistenti) - è il tema delle nuove schermate in stile Bento.
 */
export const coloriScuri = {
  sfondo: '#101827',
  // Leggermente più profondo del background, per gradienti/zone di
  // transizione (es. dietro una card vetro, in fondo a uno scroll).
  sfondoProfondo: '#0B111C',
  superficie: '#1D2A40',
  superficieAlta: '#26354F',

  testoPrimario: '#F8FAFC',
  testoSecondario: '#AAB9D0',
  // Per testo/icone disabilitati o puramente decorativi sul tema scuro.
  testoTerziario: '#6B7A94',

  bordo: 'rgba(248,250,252,0.10)',
  bordoForte: 'rgba(248,250,252,0.18)',
} as const;

/**
 * Colori d'accento delle quattro aree dell'app. Solo identità visiva /
 * branding (icone, badge di sezione, tinte decorative) - MAI per indicare
 * un importo a credito/debito: quello resta sempre `colori.verde700` /
 * `colori.rosso600` (vedi nota in cima al file), così il significato di
 * "verde = mi deve, rosso = devo" non si confonde mai con un colore di
 * sezione che non ha nulla a che fare coi saldi.
 */
export const accenti = {
  finanza: '#F5BF42',
  attivita: '#A98CF4',
  liste: '#44BFEA',
  gruppi: '#48CDA4',
} as const;

/**
 * Superfici "vetro": colore di base translucido da mettere sotto un
 * BlurView (il blur da solo non porta la tinta navy del brand) più i
 * livelli di intensità del blur stesso. Bordo sottile a parte in
 * `coloriScuri.bordo` - il contorno è ciò che separa davvero una card
 * vetro dallo sfondo quando il blur non è disponibile.
 */
export const vetro = {
  superficie: 'rgba(29,42,64,0.55)',
  superficieAlta: 'rgba(38,53,79,0.65)',
  // Overlay chiaro per un effetto vetro "a specchio" su una superficie
  // scura (bordo superiore luminoso, tipico del liquid glass).
  riflesso: 'rgba(248,250,252,0.06)',

  intensitaBassa: 25,
  intensitaMedia: 45,
  intensitaAlta: 70,
} as const;

/**
 * Ombre/elevazione cross-platform: iOS legge shadowColor/Offset/
 * Opacity/Radius, Android legge solo `elevation`, web (react-native-web)
 * traduce entrambe approssimativamente in box-shadow. Pensate per il
 * tema scuro (ombre più profonde, altrimenti invisibili su sfondo navy).
 */
export const elevazione = {
  bassa: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  media: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  alta: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 10,
  },
} as const;

/** Durate di transizione in ms, per le poche animazioni misurate che usiamo (fade/scale al tocco, comparsa contenuti). */
export const movimento = {
  veloce: 120,
  normale: 220,
  lenta: 360,
} as const;
