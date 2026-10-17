import { contributoClassifica, pesoAttivita, stimaPunti, suggerisciSforzo } from './puntiFaccende';

describe('suggerisciSforzo', () => {
  it('è "basso" per durate brevi (<= 10 min)', () => {
    expect(suggerisciSforzo(5)).toBe('basso');
    expect(suggerisciSforzo(10)).toBe('basso');
  });

  it('è "medio" per durate intermedie (11-30 min)', () => {
    expect(suggerisciSforzo(11)).toBe('medio');
    expect(suggerisciSforzo(30)).toBe('medio');
  });

  it('è "alto" per durate lunghe (> 30 min)', () => {
    expect(suggerisciSforzo(31)).toBe('alto');
    expect(suggerisciSforzo(90)).toBe('alto');
  });
});

describe('stimaPunti', () => {
  it('cresce con la durata, a parità di sforzo', () => {
    const breve = stimaPunti(10, 'basso');
    const lunga = stimaPunti(30, 'basso');
    expect(lunga).toBeGreaterThan(breve);
  });

  it('cresce con lo sforzo, a parità di durata', () => {
    const basso = stimaPunti(30, 'basso');
    const medio = stimaPunti(30, 'medio');
    const alto = stimaPunti(30, 'alto');
    expect(medio).toBeGreaterThan(basso);
    expect(alto).toBeGreaterThan(medio);
  });

  it('è sempre un intero', () => {
    expect(Number.isInteger(stimaPunti(17, 'medio'))).toBe(true);
    expect(Number.isInteger(stimaPunti(1, 'alto'))).toBe(true);
  });

  it('non scende mai sotto 1 punto, anche per durate minime', () => {
    expect(stimaPunti(1, 'basso')).toBeGreaterThanOrEqual(1);
    expect(stimaPunti(0, 'basso')).toBeGreaterThanOrEqual(1);
  });

  it('è deterministica: stesso input, stesso risultato', () => {
    expect(stimaPunti(20, 'medio')).toBe(stimaPunti(20, 'medio'));
  });
});

describe('pesoAttivita / contributoClassifica (normalizzazione percentuali)', () => {
  it('calcola una percentuale semplice', () => {
    expect(pesoAttivita(20, 100)).toBe(20);
    expect(contributoClassifica(56, 100)).toBe(56);
  });

  it('arrotonda all\'intero più vicino', () => {
    expect(pesoAttivita(1, 3)).toBe(33); // 33.33... -> 33
    expect(pesoAttivita(2, 3)).toBe(67); // 66.66... -> 67
  });

  it('è 0 quando il totale è zero, mai NaN o Infinity', () => {
    expect(pesoAttivita(0, 0)).toBe(0);
    expect(pesoAttivita(10, 0)).toBe(0);
    expect(contributoClassifica(5, 0)).toBe(0);
  });

  it('è 100 quando parte e totale coincidono', () => {
    expect(contributoClassifica(42, 42)).toBe(100);
  });

  it('resta distinta per nome/uso anche se la matematica è la stessa (peso attività vs contributo classifica)', () => {
    // Stesso calcolo, significati diversi: punti previsti di un'attività sul
    // totale previsto del periodo, vs. punti guadagnati di un membro sul
    // totale guadagnato dal gruppo. Qui si verifica solo che le due
    // funzioni restino intercambiabili matematicamente quando usate con lo
    // stesso tipo di dato, non che abbiano lo stesso significato.
    expect(pesoAttivita(25, 50)).toBe(contributoClassifica(25, 50));
  });
});
