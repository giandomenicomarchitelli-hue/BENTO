import { dataFinePiano, doseRimanenti, giornoDellaCura, scortaInEsaurimento } from './pianoTerapeutico';

describe('dataFinePiano', () => {
  it('una cura di 10 giorni dal 20 novembre finisce il 29 (il primo giorno conta)', () => {
    expect(dataFinePiano('2026-11-20', 10)).toBe('2026-11-29');
  });

  it('una cura di 1 giorno finisce lo stesso giorno in cui inizia', () => {
    expect(dataFinePiano('2026-11-20', 1)).toBe('2026-11-20');
  });
});

describe('giornoDellaCura', () => {
  it('il primo giorno di cura è il giorno 1', () => {
    expect(giornoDellaCura('2026-11-20', '2026-11-20', 10)).toBe(1);
  });

  it('conta i giorni trascorsi', () => {
    expect(giornoDellaCura('2026-11-20', '2026-11-23', 10)).toBe(4);
  });

  it('non supera mai la durata totale, anche a cura conclusa', () => {
    expect(giornoDellaCura('2026-11-20', '2026-12-15', 10)).toBe(10);
  });

  it('resta al giorno 1 se la cura non è ancora iniziata', () => {
    expect(giornoDellaCura('2026-11-20', '2026-11-10', 10)).toBe(1);
  });
});

describe('doseRimanenti', () => {
  it('sottrae le dosi assunte dalla confezione', () => {
    expect(doseRimanenti(20, 6)).toBe(14);
  });

  it('non va mai sotto zero anche con più dosi assunte del previsto', () => {
    expect(doseRimanenti(20, 25)).toBe(0);
  });
});

describe('scortaInEsaurimento', () => {
  it('è in esaurimento quando restano dosi per meno di un giorno', () => {
    expect(scortaInEsaurimento(2, 2)).toBe(true);
    expect(scortaInEsaurimento(1, 2)).toBe(true);
  });

  it('non è in esaurimento con scorta per più di un giorno', () => {
    expect(scortaInEsaurimento(4, 2)).toBe(false);
  });
});
