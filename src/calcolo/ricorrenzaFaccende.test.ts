import {
  aggiungiGiorni,
  aggiungiMesi,
  calcolaPeriodiMancanti,
  dataLocaleISO,
  fineGiornoISO,
  fineMeseISO,
  fineSettimanaISO,
  giornoSettimanaISO,
  inizioMeseISO,
  inizioSettimanaISO,
  MAX_PERIODI_PER_SINCRONIZZAZIONE,
  type DefinizioneRicorrenza,
} from './ricorrenzaFaccende';

const FUSO_ROMA = 'Europe/Rome';

function definizione(parziale: Partial<DefinizioneRicorrenza>): DefinizioneRicorrenza {
  return {
    frequenza: 'giornaliera',
    intervalloRicorrenza: null,
    giorniSettimana: null,
    giornoMese: null,
    creatoIl: '2026-01-01T08:00:00.000Z',
    ...parziale,
  };
}

describe('utilità di calendario/fuso orario', () => {
  it('dataLocaleISO sposta la data di calendario a seconda del fuso orario', () => {
    // 23:30 UTC del 1 gennaio: a Los Angeles (UTC-8 d'inverno) è ancora
    // 1 gennaio pomeriggio, a Roma (UTC+1 d'inverno) è già 2 gennaio.
    const istante = new Date('2026-01-01T23:30:00.000Z');
    expect(dataLocaleISO(istante, 'America/Los_Angeles')).toBe('2026-01-01');
    expect(dataLocaleISO(istante, FUSO_ROMA)).toBe('2026-01-02');
  });

  it('fineGiornoISO calcola correttamente l\'offset invernale ed estivo di Roma (cambio d\'ora)', () => {
    // CET = UTC+1 (gennaio, ora solare)
    expect(fineGiornoISO('2026-01-15', FUSO_ROMA)).toBe('2026-01-15T22:59:59.000Z');
    // CEST = UTC+2 (luglio, ora legale)
    expect(fineGiornoISO('2026-07-15', FUSO_ROMA)).toBe('2026-07-15T21:59:59.000Z');
  });

  it('fineGiornoISO di uno stesso giorno di calendario differisce tra fusi orari diversi', () => {
    const fineRoma = new Date(fineGiornoISO('2026-06-01', FUSO_ROMA));
    const fineNewYork = new Date(fineGiornoISO('2026-06-01', 'America/New_York'));
    // Roma è più a est: la fine della sua giornata arriva prima in UTC.
    expect(fineRoma.getTime()).toBeLessThan(fineNewYork.getTime());
  });

  it('aggiungiGiorni attraversa correttamente i confini di mese e anno', () => {
    expect(aggiungiGiorni('2026-01-30', 3)).toBe('2026-02-02');
    expect(aggiungiGiorni('2026-12-30', 3)).toBe('2027-01-02');
  });

  it('giornoSettimanaISO: 1 = lunedì ... 7 = domenica', () => {
    // 2026-01-05 è un lunedì (2026-01-01 è giovedì).
    expect(giornoSettimanaISO('2026-01-05')).toBe(1);
    expect(giornoSettimanaISO('2026-01-11')).toBe(7); // domenica
  });

  it('inizioSettimanaISO/fineSettimanaISO individuano sempre lunedì e domenica', () => {
    expect(inizioSettimanaISO('2026-01-07')).toBe('2026-01-05'); // mercoledì -> lunedì della stessa settimana
    expect(fineSettimanaISO('2026-01-07')).toBe('2026-01-11'); // -> domenica della stessa settimana
  });

  it('fineMeseISO gestisce correttamente i mesi corti e gli anni bisestili', () => {
    expect(fineMeseISO('2026-04-01')).toBe('2026-04-30'); // aprile: 30 giorni
    expect(fineMeseISO('2026-02-01')).toBe('2026-02-28'); // 2026 non bisestile
    expect(fineMeseISO('2028-02-01')).toBe('2028-02-29'); // 2028 bisestile
  });

  it('aggiungiMesi attraversa correttamente il cambio di anno', () => {
    expect(aggiungiMesi('2026-12-01', 1)).toBe('2027-01-01');
    expect(inizioMeseISO('2026-03-17')).toBe('2026-03-01');
  });
});

describe('calcolaPeriodiMancanti - giornaliera', () => {
  it('genera un\'occorrenza per ogni giorno dalla creazione a oggi incluso', () => {
    const def = definizione({ frequenza: 'giornaliera', creatoIl: '2026-01-01T08:00:00.000Z' });
    const periodi = calcolaPeriodiMancanti(def, null, '2026-01-04', FUSO_ROMA);

    expect(periodi.map((p) => p.periodoInizio)).toEqual(['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04']);
    for (const p of periodi) {
      expect(p.periodoFine).toBe(p.periodoInizio);
    }
  });

  it('non genera duplicati: richiamata con l\'ultimo periodo già generato e nessun nuovo giorno trascorso', () => {
    const def = definizione({ frequenza: 'giornaliera' });
    const periodi = calcolaPeriodiMancanti(def, '2026-01-04', '2026-01-04', FUSO_ROMA);
    expect(periodi).toEqual([]);
  });

  it('riprende esattamente da dove si era fermata, senza rigenerare il passato', () => {
    const def = definizione({ frequenza: 'giornaliera' });
    const periodi = calcolaPeriodiMancanti(def, '2026-01-04', '2026-01-06', FUSO_ROMA);
    expect(periodi.map((p) => p.periodoInizio)).toEqual(['2026-01-05', '2026-01-06']);
  });

  it('rispetta il limite di sicurezza per sincronizzazione, senza generare arretrati illimitati', () => {
    const def = definizione({ frequenza: 'giornaliera', creatoIl: '2020-01-01T08:00:00.000Z' });
    const periodi = calcolaPeriodiMancanti(def, null, '2026-01-01', FUSO_ROMA);
    expect(periodi.length).toBe(MAX_PERIODI_PER_SINCRONIZZAZIONE);
  });
});

describe('calcolaPeriodiMancanti - settimanale', () => {
  it('genera un\'occorrenza per settimana (lunedì-domenica), con scadenza sempre a fine settimana', () => {
    // 2026-01-07 (creazione) è mercoledì; la settimana corrente parte lunedì 2026-01-05.
    const def = definizione({
      frequenza: 'settimanale',
      creatoIl: '2026-01-07T08:00:00.000Z',
      giorniSettimana: [2], // martedì
    });
    const periodi = calcolaPeriodiMancanti(def, null, '2026-01-20', FUSO_ROMA);

    expect(periodi.map((p) => p.periodoInizio)).toEqual(['2026-01-05', '2026-01-12', '2026-01-19']);
    expect(periodi.map((p) => p.periodoFine)).toEqual(['2026-01-11', '2026-01-18', '2026-01-25']);
    // La scadenza è sempre la domenica della settimana, MAI il giorno
    // preferito (martedì qui sopra): un giorno preferito già passato non
    // deve far scadere la faccenda a metà settimana (bug corretto in
    // questa revisione).
    expect(dataLocaleISO(new Date(periodi[0].scadenza), FUSO_ROMA)).toBe('2026-01-11');
    expect(dataLocaleISO(new Date(periodi[1].scadenza), FUSO_ROMA)).toBe('2026-01-18');
  });

  it('il giorno preferito è solo indicativo: con o senza, la scadenza resta la domenica della settimana', () => {
    const conGiornoPreferito = definizione({
      frequenza: 'settimanale',
      creatoIl: '2026-01-07T08:00:00.000Z',
      giorniSettimana: [1], // lunedì, già passato rispetto a "oggi" in questo test
    });
    const senzaGiornoPreferito = definizione({ frequenza: 'settimanale', creatoIl: '2026-01-07T08:00:00.000Z' });

    const [conGiorno] = calcolaPeriodiMancanti(conGiornoPreferito, null, '2026-01-07', FUSO_ROMA);
    const [senzaGiorno] = calcolaPeriodiMancanti(senzaGiornoPreferito, null, '2026-01-07', FUSO_ROMA);

    expect(dataLocaleISO(new Date(conGiorno.scadenza), FUSO_ROMA)).toBe('2026-01-11');
    expect(dataLocaleISO(new Date(senzaGiorno.scadenza), FUSO_ROMA)).toBe('2026-01-11');
  });

  it('non duplica la settimana già generata', () => {
    const def = definizione({ frequenza: 'settimanale' });
    const periodi = calcolaPeriodiMancanti(def, '2026-01-19', '2026-01-20', FUSO_ROMA);
    expect(periodi).toEqual([]);
  });
});

describe('calcolaPeriodiMancanti - mensile', () => {
  it('genera un\'occorrenza per mese di calendario, attraversando correttamente il cambio di mese', () => {
    const def = definizione({ frequenza: 'mensile', creatoIl: '2026-01-15T08:00:00.000Z', giornoMese: 10 });
    const periodi = calcolaPeriodiMancanti(def, null, '2026-04-10', FUSO_ROMA);

    expect(periodi.map((p) => p.periodoInizio)).toEqual([
      '2026-01-01',
      '2026-02-01',
      '2026-03-01',
      '2026-04-01',
    ]);
    expect(periodi.map((p) => p.periodoFine)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
  });

  it('attraversa correttamente il cambio di anno', () => {
    const def = definizione({ frequenza: 'mensile', creatoIl: '2026-11-01T08:00:00.000Z' });
    const periodi = calcolaPeriodiMancanti(def, null, '2027-01-01', FUSO_ROMA);
    expect(periodi.map((p) => p.periodoInizio)).toEqual(['2026-11-01', '2026-12-01', '2027-01-01']);
  });

  it('il giorno del mese scelto è solo indicativo: la scadenza è sempre l\'ultimo giorno del mese, anche se il giorno preferito è già passato o non esiste in un mese corto', () => {
    // Aprile ha solo 30 giorni: un giorno preferito "31" non deve mai far
    // scadere la faccenda prima della fine del mese, né farla sconfinare a
    // maggio.
    const def = definizione({ frequenza: 'mensile', creatoIl: '2026-04-01T08:00:00.000Z', giornoMese: 31 });
    const [periodoAprile] = calcolaPeriodiMancanti(def, null, '2026-04-01', FUSO_ROMA);
    expect(dataLocaleISO(new Date(periodoAprile.scadenza), FUSO_ROMA)).toBe('2026-04-30');

    // Un giorno preferito "1", già passato se generato a metà mese, non
    // deve far scadere la faccenda a inizio mese (bug corretto in questa
    // revisione): resta completabile fino alla fine del mese.
    const defGiornoPassato = definizione({
      frequenza: 'mensile',
      creatoIl: '2026-04-01T08:00:00.000Z',
      giornoMese: 1,
    });
    const [periodoGiornoPassato] = calcolaPeriodiMancanti(defGiornoPassato, null, '2026-04-17', FUSO_ROMA);
    expect(dataLocaleISO(new Date(periodoGiornoPassato.scadenza), FUSO_ROMA)).toBe('2026-04-30');
  });

  it('non duplica il mese già generato', () => {
    const def = definizione({ frequenza: 'mensile' });
    const periodi = calcolaPeriodiMancanti(def, '2026-04-01', '2026-04-15', FUSO_ROMA);
    expect(periodi).toEqual([]);
  });
});

describe('calcolaPeriodiMancanti - personalizzata', () => {
  it('genera un\'occorrenza ogni N giorni', () => {
    const def = definizione({
      frequenza: 'personalizzata',
      intervalloRicorrenza: 3,
      creatoIl: '2026-01-01T08:00:00.000Z',
    });
    const periodi = calcolaPeriodiMancanti(def, null, '2026-01-10', FUSO_ROMA);
    expect(periodi.map((p) => p.periodoInizio)).toEqual(['2026-01-01', '2026-01-04', '2026-01-07', '2026-01-10']);
  });

  it('riprende dall\'ultimo periodo generato mantenendo lo stesso passo', () => {
    const def = definizione({ frequenza: 'personalizzata', intervalloRicorrenza: 3 });
    const periodi = calcolaPeriodiMancanti(def, '2026-01-07', '2026-01-13', FUSO_ROMA);
    expect(periodi.map((p) => p.periodoInizio)).toEqual(['2026-01-10', '2026-01-13']);
  });
});

describe('calcolaPeriodiMancanti - una tantum', () => {
  it('genera esattamente una sola occorrenza, il giorno della creazione', () => {
    const def = definizione({ frequenza: 'una_tantum', creatoIl: '2026-03-10T08:00:00.000Z' });
    const periodi = calcolaPeriodiMancanti(def, null, '2026-03-20', FUSO_ROMA);
    expect(periodi).toHaveLength(1);
    expect(periodi[0].periodoInizio).toBe('2026-03-10');
  });

  it('non genera mai una seconda occorrenza', () => {
    const def = definizione({ frequenza: 'una_tantum' });
    const periodi = calcolaPeriodiMancanti(def, '2026-03-10', '2026-12-31', FUSO_ROMA);
    expect(periodi).toEqual([]);
  });
});
