import { celleGrigliaMese } from './griglioMensile';

describe('celleGrigliaMese', () => {
  // Novembre 2026: il 1° è domenica, il 30 è lunedì - mese scelto apposta
  // perché nessuno dei due estremi cade di lunedì/domenica, così la
  // griglia deve davvero aggiungere giorni di ottobre e dicembre.
  it('copre tutto novembre 2026 con settimane complete lun-dom', () => {
    const celle = celleGrigliaMese('2026-11-01');
    expect(celle[0].dataISO).toBe('2026-10-26'); // lunedì della settimana che contiene il 1 novembre
    expect(celle[celle.length - 1].dataISO).toBe('2026-12-06'); // domenica della settimana che contiene il 30 novembre
    expect(celle.length % 7).toBe(0);
  });

  it('marca correttamente i giorni fuori dal mese corrente', () => {
    const celle = celleGrigliaMese('2026-11-01');
    expect(celle.find((c) => c.dataISO === '2026-11-01')?.delMeseCorrente).toBe(true);
    expect(celle.find((c) => c.dataISO === '2026-11-30')?.delMeseCorrente).toBe(true);
    expect(celle[0].delMeseCorrente).toBe(false); // 2026-10-26, ottobre
    expect(celle[celle.length - 1].delMeseCorrente).toBe(false); // 2026-12-06, dicembre
  });
});
