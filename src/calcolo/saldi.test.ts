import { calcolaSaldi, calcolaSaldiNetti, semplificaDebiti } from './saldi';
import type { Spesa, Transazione } from './tipi';

describe('calcolaSaldiNetti', () => {
  it('nessuna spesa: tutti i membri passati hanno saldo 0', () => {
    const saldi = calcolaSaldiNetti([], ['a', 'b', 'c']);
    expect(saldi.get('a')).toBe(0);
    expect(saldi.get('b')).toBe(0);
    expect(saldi.get('c')).toBe(0);
    expect(saldi.size).toBe(3);
  });

  it('spesa singola divisa equamente tra 2 membri', () => {
    const spese: Spesa[] = [
      {
        id: 's1',
        pagatoDa: 'a',
        importoCentesimi: 1000,
        quote: [
          { membroId: 'a', quotaCentesimi: 500 },
          { membroId: 'b', quotaCentesimi: 500 },
        ],
      },
    ];
    const saldi = calcolaSaldiNetti(spese, ['a', 'b']);
    expect(saldi.get('a')).toBe(500);
    expect(saldi.get('b')).toBe(-500);
  });

  it('chi paga non è tra le quote (es. un regalo)', () => {
    const spese: Spesa[] = [
      {
        id: 's1',
        pagatoDa: 'a',
        importoCentesimi: 1000,
        quote: [{ membroId: 'b', quotaCentesimi: 1000 }],
      },
    ];
    const saldi = calcolaSaldiNetti(spese, ['a', 'b']);
    expect(saldi.get('a')).toBe(1000);
    expect(saldi.get('b')).toBe(-1000);
  });

  it('più spese nel tempo con pagatori diversi si accumulano correttamente', () => {
    const spese: Spesa[] = [
      {
        id: 's1',
        pagatoDa: 'a',
        importoCentesimi: 1000,
        quote: [
          { membroId: 'a', quotaCentesimi: 500 },
          { membroId: 'b', quotaCentesimi: 500 },
        ],
      },
      {
        id: 's2',
        pagatoDa: 'b',
        importoCentesimi: 400,
        quote: [
          { membroId: 'a', quotaCentesimi: 200 },
          { membroId: 'b', quotaCentesimi: 200 },
        ],
      },
    ];
    const saldi = calcolaSaldiNetti(spese, ['a', 'b']);
    // a: +1000 -500 -200 = +300 ; b: -500 +400 -200 = -300
    expect(saldi.get('a')).toBe(300);
    expect(saldi.get('b')).toBe(-300);
  });

  it('quote non uniformi (70/30) senza errori di arrotondamento', () => {
    const spese: Spesa[] = [
      {
        id: 's1',
        pagatoDa: 'a',
        importoCentesimi: 1000,
        quote: [
          { membroId: 'a', quotaCentesimi: 700 },
          { membroId: 'b', quotaCentesimi: 300 },
        ],
      },
    ];
    const saldi = calcolaSaldiNetti(spese, ['a', 'b']);
    expect(saldi.get('a')).toBe(300);
    expect(saldi.get('b')).toBe(-300);
  });

  it('invariante: la somma di tutti i saldi netti è sempre 0', () => {
    const scenari: { spese: Spesa[]; membriIds: string[] }[] = [
      { spese: [], membriIds: ['a', 'b'] },
      {
        spese: [
          {
            id: 's1',
            pagatoDa: 'a',
            importoCentesimi: 1234,
            quote: [
              { membroId: 'a', quotaCentesimi: 617 },
              { membroId: 'b', quotaCentesimi: 617 },
            ],
          },
        ],
        membriIds: ['a', 'b'],
      },
      {
        spese: [
          {
            id: 's1',
            pagatoDa: 'a',
            importoCentesimi: 900,
            quote: [
              { membroId: 'a', quotaCentesimi: 300 },
              { membroId: 'b', quotaCentesimi: 300 },
              { membroId: 'c', quotaCentesimi: 300 },
            ],
          },
          {
            id: 's2',
            pagatoDa: 'c',
            importoCentesimi: 500,
            quote: [
              { membroId: 'a', quotaCentesimi: 250 },
              { membroId: 'd', quotaCentesimi: 250 },
            ],
          },
        ],
        membriIds: ['a', 'b', 'c', 'd'],
      },
    ];

    for (const { spese, membriIds } of scenari) {
      const saldi = calcolaSaldiNetti(spese, membriIds);
      const somma = [...saldi.values()].reduce((acc, v) => acc + v, 0);
      expect(somma).toBe(0);
    }
  });

  it('membri senza alcuna spesa restano a 0', () => {
    const spese: Spesa[] = [
      {
        id: 's1',
        pagatoDa: 'a',
        importoCentesimi: 1000,
        quote: [
          { membroId: 'a', quotaCentesimi: 500 },
          { membroId: 'b', quotaCentesimi: 500 },
        ],
      },
    ];
    const saldi = calcolaSaldiNetti(spese, ['a', 'b', 'c']);
    expect(saldi.get('c')).toBe(0);
  });
});

describe('semplificaDebiti', () => {
  it('tutti i saldi a 0: nessuna transazione', () => {
    const saldi = new Map([
      ['a', 0],
      ['b', 0],
    ]);
    expect(semplificaDebiti(saldi)).toEqual([]);
  });

  it('caso 2 membri (scenario principale fase 1)', () => {
    const saldi = new Map([
      ['a', 500],
      ['b', -500],
    ]);
    const transazioni = semplificaDebiti(saldi);
    expect(transazioni).toEqual([{ da: 'b', a: 'a', importoCentesimi: 500 }]);
  });

  it('3 membri, 1 debitore e 2 creditori: al massimo 2 transazioni', () => {
    const saldi = new Map([
      ['a', 300],
      ['b', 200],
      ['c', -500],
    ]);
    const transazioni = semplificaDebiti(saldi);
    expect(transazioni.length).toBeLessThanOrEqual(2);
    // Il creditore maggiore (a, +300) viene servito per primo dal greedy.
    expect(transazioni[0]).toEqual({ da: 'c', a: 'a', importoCentesimi: 300 });
    expect(transazioni[1]).toEqual({ da: 'c', a: 'b', importoCentesimi: 200 });
  });

  it('5+ membri: applicando le transazioni ai saldi iniziali, tutti tornano a 0', () => {
    const saldiIniziali = new Map([
      ['a', 1000],
      ['b', -400],
      ['c', 250],
      ['d', -600],
      ['e', -250],
    ]);
    const transazioni = semplificaDebiti(new Map(saldiIniziali));

    const saldiFinali = new Map(saldiIniziali);
    for (const t of transazioni) {
      saldiFinali.set(t.da, (saldiFinali.get(t.da) ?? 0) + t.importoCentesimi);
      saldiFinali.set(t.a, (saldiFinali.get(t.a) ?? 0) - t.importoCentesimi);
    }

    for (const saldo of saldiFinali.values()) {
      expect(saldo).toBe(0);
    }
  });

  it('numero di transazioni <= membri con saldo diverso da zero - 1', () => {
    const saldi = new Map([
      ['a', 1000],
      ['b', -400],
      ['c', 250],
      ['d', -600],
      ['e', -250],
    ]);
    const membriConSaldo = [...saldi.values()].filter((v) => v !== 0).length;
    const transazioni = semplificaDebiti(saldi);
    expect(transazioni.length).toBeLessThanOrEqual(membriConSaldo - 1);
  });

  it('nessuna transazione con importo <= 0', () => {
    const saldi = new Map([
      ['a', 300],
      ['b', -300],
    ]);
    const transazioni = semplificaDebiti(saldi);
    for (const t of transazioni) {
      expect(t.importoCentesimi).toBeGreaterThan(0);
    }
  });

  it('nessuna transazione con da === a', () => {
    const saldi = new Map([
      ['a', 300],
      ['b', -300],
    ]);
    const transazioni = semplificaDebiti(saldi);
    for (const t of transazioni) {
      expect(t.da).not.toBe(t.a);
    }
  });
});

describe('calcolaSaldi (end-to-end)', () => {
  it('scenario coppia: 2 membri, spese alternate', () => {
    const spese: Spesa[] = [
      {
        id: 's1',
        pagatoDa: 'marito',
        importoCentesimi: 4000,
        quote: [
          { membroId: 'marito', quotaCentesimi: 2000 },
          { membroId: 'moglie', quotaCentesimi: 2000 },
        ],
      },
      {
        id: 's2',
        pagatoDa: 'moglie',
        importoCentesimi: 1000,
        quote: [
          { membroId: 'marito', quotaCentesimi: 500 },
          { membroId: 'moglie', quotaCentesimi: 500 },
        ],
      },
    ];
    const transazioni = calcolaSaldi(spese, ['marito', 'moglie']);
    // marito: +4000 -2000 -500 = +1500 ; moglie: -4000 +1000... -> -1500
    expect(transazioni).toEqual([
      { da: 'moglie', a: 'marito', importoCentesimi: 1500 },
    ]);
  });

  it('scenario gruppo N (4 membri, viaggio) con quote e pagatori diversi', () => {
    const spese: Spesa[] = [
      {
        id: 's1',
        pagatoDa: 'anna',
        importoCentesimi: 4000,
        quote: [
          { membroId: 'anna', quotaCentesimi: 1000 },
          { membroId: 'bruno', quotaCentesimi: 1000 },
          { membroId: 'carla', quotaCentesimi: 1000 },
          { membroId: 'dino', quotaCentesimi: 1000 },
        ],
      },
      {
        id: 's2',
        pagatoDa: 'bruno',
        importoCentesimi: 1200,
        quote: [
          { membroId: 'carla', quotaCentesimi: 600 },
          { membroId: 'dino', quotaCentesimi: 600 },
        ],
      },
    ];
    const membriIds = ['anna', 'bruno', 'carla', 'dino'];
    const transazioni = calcolaSaldi(spese, membriIds);

    const saldiIniziali = calcolaSaldiNetti(spese, membriIds);
    const saldiFinali = new Map(saldiIniziali);
    for (const t of transazioni as Transazione[]) {
      saldiFinali.set(t.da, (saldiFinali.get(t.da) ?? 0) + t.importoCentesimi);
      saldiFinali.set(t.a, (saldiFinali.get(t.a) ?? 0) - t.importoCentesimi);
    }
    for (const saldo of saldiFinali.values()) {
      expect(saldo).toBe(0);
    }
  });

  it('tutti i valori restituiti sono interi, mai float', () => {
    const spese: Spesa[] = [
      {
        id: 's1',
        pagatoDa: 'a',
        importoCentesimi: 1001,
        quote: [
          { membroId: 'a', quotaCentesimi: 501 },
          { membroId: 'b', quotaCentesimi: 500 },
        ],
      },
    ];
    const transazioni = calcolaSaldi(spese, ['a', 'b']);
    for (const t of transazioni) {
      expect(Number.isInteger(t.importoCentesimi)).toBe(true);
    }
  });
});
