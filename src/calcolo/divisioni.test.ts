import { dividiEqualmente } from './divisioni';

describe('dividiEqualmente', () => {
  it('somma esatta e differenza massima di 1 centesimo tra i valori', () => {
    const quote = dividiEqualmente(100, 3);
    expect(quote.reduce((acc, v) => acc + v, 0)).toBe(100);
    expect(Math.max(...quote) - Math.min(...quote)).toBeLessThanOrEqual(1);
    expect(quote).toEqual([34, 33, 33]);
  });

  it('divisione esatta senza resto', () => {
    expect(dividiEqualmente(900, 3)).toEqual([300, 300, 300]);
  });

  it('una sola persona riceve tutto l\'importo', () => {
    expect(dividiEqualmente(777, 1)).toEqual([777]);
  });

  it('lancia un errore se numPersone non è positivo', () => {
    expect(() => dividiEqualmente(100, 0)).toThrow();
  });
});
