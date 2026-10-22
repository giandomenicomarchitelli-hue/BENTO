import { calcolaRisultatoTurno, percentualeOpzione } from './risultatoSfida';

describe('calcolaRisultatoTurno - turni a 3 scelte (iniziale/nuovo_tentativo)', () => {
  it("Caso A del brief: una scelta comune su 2 persone -> vince quell'opzione", () => {
    // Giando: pizza, sushi, hamburger. Vale: pasta, pizza, messicano.
    const voti = [
      { opzioneId: 'pizza', membroId: 'giando' },
      { opzioneId: 'sushi', membroId: 'giando' },
      { opzioneId: 'hamburger', membroId: 'giando' },
      { opzioneId: 'pasta', membroId: 'vale' },
      { opzioneId: 'pizza', membroId: 'vale' },
      { opzioneId: 'messicano', membroId: 'vale' },
    ];
    const r = calcolaRisultatoTurno(voti, 'iniziale');
    expect(r).toMatchObject({ esito: 'vincitore', opzioneVincenteId: 'pizza' });
  });

  it('Caso B del brief: nessuna scelta comune -> nessun_accordo, mai pareggio', () => {
    // Giando: pizza, sushi, hamburger. Vale: pasta, messicano, insalata.
    const voti = [
      { opzioneId: 'pizza', membroId: 'giando' },
      { opzioneId: 'sushi', membroId: 'giando' },
      { opzioneId: 'hamburger', membroId: 'giando' },
      { opzioneId: 'pasta', membroId: 'vale' },
      { opzioneId: 'messicano', membroId: 'vale' },
      { opzioneId: 'insalata', membroId: 'vale' },
    ];
    const r = calcolaRisultatoTurno(voti, 'iniziale');
    expect(r.esito).toBe('nessun_accordo');
  });

  it('Caso C del brief: due scelte comuni -> pareggio tra le due', () => {
    // Giando: pizza, sushi, hamburger. Vale: pizza, sushi, pasta.
    const voti = [
      { opzioneId: 'pizza', membroId: 'giando' },
      { opzioneId: 'sushi', membroId: 'giando' },
      { opzioneId: 'hamburger', membroId: 'giando' },
      { opzioneId: 'pizza', membroId: 'vale' },
      { opzioneId: 'sushi', membroId: 'vale' },
      { opzioneId: 'pasta', membroId: 'vale' },
    ];
    const r = calcolaRisultatoTurno(voti, 'iniziale');
    expect(r.esito).toBe('pareggio');
    expect(r.opzioniInParita.sort()).toEqual(['pizza', 'sushi'].sort());
  });

  it('Caso D del brief: le stesse identiche 3 opzioni -> pareggio tra tutte e 3, non la prima', () => {
    const voti = [
      { opzioneId: 'pizza', membroId: 'giando' },
      { opzioneId: 'sushi', membroId: 'giando' },
      { opzioneId: 'hamburger', membroId: 'giando' },
      { opzioneId: 'pizza', membroId: 'vale' },
      { opzioneId: 'sushi', membroId: 'vale' },
      { opzioneId: 'hamburger', membroId: 'vale' },
    ];
    const r = calcolaRisultatoTurno(voti, 'iniziale');
    expect(r.esito).toBe('pareggio');
    expect(r.opzioniInParita.sort()).toEqual(['hamburger', 'pizza', 'sushi'].sort());
  });

  it("3+ partecipanti, un'opzione con 2 voti unica al massimo -> vince anche se non unanime", () => {
    const voti = [
      { opzioneId: 'pizza', membroId: 'giando' },
      { opzioneId: 'sushi', membroId: 'giando' },
      { opzioneId: 'hamburger', membroId: 'giando' },
      { opzioneId: 'pizza', membroId: 'vale' },
      { opzioneId: 'pasta', membroId: 'vale' },
      { opzioneId: 'messicano', membroId: 'vale' },
      { opzioneId: 'insalata', membroId: 'marco' },
      { opzioneId: 'tacos', membroId: 'marco' },
      { opzioneId: 'couscous', membroId: 'marco' },
    ];
    const r = calcolaRisultatoTurno(voti, 'iniziale');
    expect(r).toMatchObject({ esito: 'vincitore', opzioneVincenteId: 'pizza' });
  });

  it('nessun voto -> nessun_accordo, conteggi tutti a 0, mai un errore', () => {
    const r = calcolaRisultatoTurno([], 'iniziale');
    expect(r.esito).toBe('nessun_accordo');
    expect(r.conteggi).toEqual({});
    expect(r.opzioneVincenteId).toBeNull();
  });
});

describe('calcolaRisultatoTurno - turno di spareggio (1 scelta)', () => {
  it("un'unica opzione al massimo vince anche con un solo voto", () => {
    const r = calcolaRisultatoTurno(
      [
        { opzioneId: 'pizza', membroId: 'giando' },
        { opzioneId: 'pizza', membroId: 'vale' },
        { opzioneId: 'sushi', membroId: 'marco' },
      ],
      'spareggio'
    );
    expect(r).toMatchObject({ esito: 'vincitore', opzioneVincenteId: 'pizza' });
  });

  it('ancora in parità -> nessun_accordo, MAI un altro pareggio/spareggio implicito', () => {
    const r = calcolaRisultatoTurno(
      [
        { opzioneId: 'pizza', membroId: 'giando' },
        { opzioneId: 'sushi', membroId: 'vale' },
      ],
      'spareggio'
    );
    expect(r.esito).toBe('nessun_accordo');
  });
});

describe('percentualeOpzione', () => {
  it('calcola una percentuale semplice', () => expect(percentualeOpzione(3, 4)).toBe(75));
  it('0 quando il totale è 0', () => expect(percentualeOpzione(0, 0)).toBe(0));
  it('le percentuali delle diverse opzioni non devono sommare a 100 (ogni persona vota 3 opzioni)', () => {
    // 4 partecipanti, ognuno vota 3 opzioni su 5 disponibili: somma dei "voti totali" = 12, non 4
    expect(percentualeOpzione(4, 4) + percentualeOpzione(4, 4) + percentualeOpzione(4, 4)).toBeGreaterThan(100);
  });
});
