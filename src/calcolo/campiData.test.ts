import { campoNumericoSicuro, dataSicura } from './campiData';

describe('campoNumericoSicuro', () => {
  it('restituisce il valore su 2 cifre quando è dentro il range', () => {
    expect(campoNumericoSicuro('7', 1, 1, 31)).toBe('07');
  });

  it('ricade sul fallback quando il testo non è un numero', () => {
    expect(campoNumericoSicuro('', 15, 1, 31)).toBe('15');
    expect(campoNumericoSicuro('abc', 15, 1, 31)).toBe('15');
  });

  it('aggancia al massimo un valore troppo alto (mese 13 non deve propagarsi)', () => {
    expect(campoNumericoSicuro('13', 1, 1, 12)).toBe('12');
  });

  it('aggancia al minimo un valore troppo basso o negativo', () => {
    expect(campoNumericoSicuro('-5', 1, 1, 31)).toBe('01');
  });

  it('accetta 0 quando è dentro il range (ore/minuti), non lo scambia per "assente"', () => {
    expect(campoNumericoSicuro('0', 12, 0, 23)).toBe('00');
  });

  it('aggancia un orario fuori range (25:75) dentro 0-23/0-59', () => {
    expect(campoNumericoSicuro('25', 12, 0, 23)).toBe('23');
    expect(campoNumericoSicuro('75', 0, 0, 59)).toBe('59');
  });
});

describe('dataSicura', () => {
  it('restituisce un Date per un istante valido', () => {
    const d = dataSicura('2026-11-05T12:00');
    expect(d).not.toBeNull();
    expect(d?.getFullYear()).toBe(2026);
  });

  it('restituisce null per un calendario impossibile (30 febbraio)', () => {
    // new Date('2026-02-30T12:00') normalizza al 2 marzo invece di lanciare,
    // quindi il controllo deve confrontare il giorno/mese richiesti con
    // quelli effettivamente ottenuti - non limitarsi a Number.isNaN.
    expect(dataSicura('2026-02-30T12:00')).toBeNull();
  });

  it('restituisce null per una stringa non parsabile', () => {
    expect(dataSicura('non-una-data')).toBeNull();
  });
});
