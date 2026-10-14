/**
 * Design token centrali dell'app: colori, tipografia, spaziature, raggi.
 *
 * Il tema "Hybrid Liquid Glass" (bento, accenti, semantica, gradienti,
 * vetro, elevazione, movimento, più le aggiunte a raggio/tipografia) è
 * additivo: nessuno dei token esistenti sopra è stato rimosso o
 * rinominato, le schermate già migrate (dashboard, gruppo, lista-spesa,
 * saldi) continuano a usare `colori` invariato. Le nuove schermate in
 * stile Bento (componenti in src/components/Glass*.tsx, Bento*.tsx,
 * Hero/Group/QuickAction/ecc.) usano invece i token qui sotto.
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
 * Tema "Hybrid Liquid Glass": sfondi off-white, superfici bianche/
 * translucide, bordi sottili, ombre morbide. Non sostituisce `colori`
 * (usato dalle schermate già esistenti: dashboard, gruppo, lista-spesa,
 * saldi) - è la palette delle nuove schermate in stile Bento.
 */
export const bento = {
  sfondo: '#F6F8FC',
  sfondoAlt: '#EEF3FA',
  superficieForte: '#FFFFFF',
  superficieTranslucida: 'rgba(255,255,255,0.78)',
  superficieMuta: 'rgba(255,255,255,0.62)',

  bordoSoft: 'rgba(148,163,184,0.16)',
  bordoForte: 'rgba(148,163,184,0.24)',

  testoPrimario: '#0F172A',
  testoSecondario: '#475569',
  testoMuto: '#94A3B8',
  // Per testo/icone su una superficie scura (es. dentro la hero card col
  // gradiente) - l'unico punto dove su questo tema chiaro serve testo chiaro.
  testoSuScuro: '#F8FAFC',
} as const;

/**
 * Sei colori d'accento del brand. Solo identità visiva (badge, icone,
 * dettagli decorativi) - MAI per indicare un importo a credito/debito:
 * quello usa sempre `semantica.successo`/`semantica.pericolo` qui sotto
 * (o, nelle schermate non ancora migrate, `colori.verde700`/`rosso600`),
 * così "verde = mi deve, rosso = devo" non si confonde mai con un colore
 * puramente decorativo.
 */
export const accenti = {
  oro: '#F5BF42',
  viola: '#A98CF4',
  ciano: '#44BFEA',
  menta: '#48CDA4',
  rosa: '#F35BA6',
  indaco: '#6D6AF8',
} as const;

/**
 * Colori semantici (stato/esito), ognuno con una variante "soft" per
 * sfondi di badge/pillole. `successo`/`pericolo` sono la semantica
 * finanziaria del tema Bento (mi deve / devo) - stesso significato di
 * `colori.verde700`/`rosso600`, tonalità leggermente diversa perché
 * pensata per stare su superfici chiare translucide.
 */
export const semantica = {
  successo: '#16A34A',
  successoSoft: '#DCFCE7',
  pericolo: '#DC2626',
  pericoloSoft: '#FEE2E2',
  avviso: '#D97706',
  avvisoSoft: '#FEF3C7',
  info: '#2563EB',
  infoSoft: '#DBEAFE',
} as const;

/**
 * Gradienti di marchio. `gradienteHero` (viola→magenta, 2 toni) esiste
 * già e resta invariato per il componente GradientCard; questi sono i
 * nuovi gradienti a 3 toni del tema Hybrid Liquid Glass.
 */
export const gradienti = {
  hero: ['#6D6AF8', '#A98CF4', '#F35BA6'],
  menta: ['#67E8C8', '#48CDA4'],
  ciano: ['#67D8F4', '#44BFEA'],
} as const;

/**
 * Superfici "vetro" per il tema chiaro: colore di base translucido da
 * mettere sotto un BlurView (`bento.superficieTranslucida`/`superficieMuta`
 * sono già pensate per questo) più i livelli di intensità del blur.
 * Bordo sottile a parte in `bento.bordoSoft` - il contorno è ciò che
 * separa davvero una card vetro dallo sfondo quando il blur non è
 * disponibile o è molto leggero, com'è voluto su un tema chiaro.
 */
export const vetro = {
  intensitaBassa: 15,
  intensitaMedia: 30,
  intensitaAlta: 50,
} as const;

/**
 * Ombre/elevazione cross-platform: iOS legge shadowColor/Offset/
 * Opacity/Radius, Android legge solo `elevation`, web (react-native-web)
 * traduce entrambe approssimativamente in box-shadow. Pensate per il
 * tema chiaro: ombre morbide e poco opache, altrimenti su sfondo
 * off-white risultano pesanti invece che eleganti.
 */
export const elevazione = {
  bassa: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  media: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5,
  },
  alta: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 9,
  },
} as const;

/** Durate di transizione in ms, per le poche animazioni misurate che usiamo (fade/scale al tocco, comparsa contenuti). */
export const movimento = {
  veloce: 120,
  normale: 220,
  lenta: 360,
} as const;
