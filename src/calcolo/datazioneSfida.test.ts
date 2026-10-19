import { dataLocaleISO } from './ricorrenzaFaccende';
import { risolviQuando, formattaConGiorno } from './datazioneSfida';

// adesso fisso per tutti i test: 2026-10-19T10:00:00.000Z è un lunedì
// (2026-01-01 è giovedì, già verificato in ricorrenzaFaccende.test.ts;
// 291 giorni dopo cade di lunedì).
const ADESSO = new Date('2026-10-19T10:00:00.000Z');
const FUSO = 'Europe/Rome';

describe('risolviQuando - scelte rapide', () => {
  it('oggi: precisione giorno, oggi stesso', () => {
    const r = risolviQuando({ tipo: 'rapida', valore: 'oggi' }, ADESSO, FUSO);
    expect(r.precisione).toBe('giorno');
    expect(dataLocaleISO(new Date(r.inizioISO), FUSO)).toBe('2026-10-19');
    expect(dataLocaleISO(new Date(r.fineISO as string), FUSO)).toBe('2026-10-19');
  });

  it('domani: precisione giorno, il giorno successivo', () => {
    const r = risolviQuando({ tipo: 'rapida', valore: 'domani' }, ADESSO, FUSO);
    expect(r.precisione).toBe('giorno');
    expect(dataLocaleISO(new Date(r.inizioISO), FUSO)).toBe('2026-10-20');
  });

  it('stasera: precisione fascia, 19:00-23:59 di oggi', () => {
    const r = risolviQuando({ tipo: 'rapida', valore: 'stasera' }, ADESSO, FUSO);
    expect(r.precisione).toBe('fascia');
    expect(dataLocaleISO(new Date(r.inizioISO), FUSO)).toBe('2026-10-19');
    const oraInizio = new Intl.DateTimeFormat('it-IT', {
      timeZone: FUSO,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(r.inizioISO));
    expect(oraInizio).toBe('19:00');
    expect(dataLocaleISO(new Date(r.fineISO as string), FUSO)).toBe('2026-10-19');
  });

  it('domani_sera: precisione fascia, 19:00-23:59 di domani', () => {
    const r = risolviQuando({ tipo: 'rapida', valore: 'domani_sera' }, ADESSO, FUSO);
    expect(r.precisione).toBe('fascia');
    expect(dataLocaleISO(new Date(r.inizioISO), FUSO)).toBe('2026-10-20');
  });

  it('venerdi: il prossimo venerdì da oggi incluso', () => {
    const r = risolviQuando({ tipo: 'rapida', valore: 'venerdi' }, ADESSO, FUSO);
    expect(dataLocaleISO(new Date(r.inizioISO), FUSO)).toBe('2026-10-23');
  });

  it('sabato: il prossimo sabato da oggi incluso', () => {
    const r = risolviQuando({ tipo: 'rapida', valore: 'sabato' }, ADESSO, FUSO);
    expect(dataLocaleISO(new Date(r.inizioISO), FUSO)).toBe('2026-10-24');
  });

  it('domenica: la prossima domenica da oggi incluso', () => {
    const r = risolviQuando({ tipo: 'rapida', valore: 'domenica' }, ADESSO, FUSO);
    expect(dataLocaleISO(new Date(r.inizioISO), FUSO)).toBe('2026-10-25');
  });

  it('venerdi: se oggi è già venerdì, resta oggi (oggi incluso)', () => {
    const unVenerdi = new Date('2026-10-23T10:00:00.000Z');
    const r = risolviQuando({ tipo: 'rapida', valore: 'venerdi' }, unVenerdi, FUSO);
    expect(dataLocaleISO(new Date(r.inizioISO), FUSO)).toBe('2026-10-23');
  });

  it('questo_weekend: se oggi è un giorno feriale, il sabato-domenica successivi', () => {
    const r = risolviQuando({ tipo: 'rapida', valore: 'questo_weekend' }, ADESSO, FUSO);
    expect(r.precisione).toBe('giorno');
    expect(dataLocaleISO(new Date(r.inizioISO), FUSO)).toBe('2026-10-24');
    expect(dataLocaleISO(new Date(r.fineISO as string), FUSO)).toBe('2026-10-25');
  });

  it('questo_weekend: se oggi è già sabato, il weekend corrente (non quello dopo)', () => {
    const unSabato = new Date('2026-10-31T10:00:00.000Z');
    const r = risolviQuando({ tipo: 'rapida', valore: 'questo_weekend' }, unSabato, FUSO);
    expect(dataLocaleISO(new Date(r.inizioISO), FUSO)).toBe('2026-10-31');
    expect(dataLocaleISO(new Date(r.fineISO as string), FUSO)).toBe('2026-11-01');
  });

  it('questo_weekend: se oggi è già domenica, il weekend corrente (non quello dopo)', () => {
    const unaDomenica = new Date('2026-11-01T10:00:00.000Z');
    const r = risolviQuando({ tipo: 'rapida', valore: 'questo_weekend' }, unaDomenica, FUSO);
    expect(dataLocaleISO(new Date(r.inizioISO), FUSO)).toBe('2026-10-31');
    expect(dataLocaleISO(new Date(r.fineISO as string), FUSO)).toBe('2026-11-01');
  });

  it('prossimo_weekend: sempre il weekend successivo a "questo_weekend"', () => {
    const r = risolviQuando({ tipo: 'rapida', valore: 'prossimo_weekend' }, ADESSO, FUSO);
    expect(dataLocaleISO(new Date(r.inizioISO), FUSO)).toBe('2026-10-31');
    expect(dataLocaleISO(new Date(r.fineISO as string), FUSO)).toBe('2026-11-01');
  });

  it('prossimo_weekend: salta alla settimana dopo anche se oggi è già nel weekend corrente', () => {
    const unSabato = new Date('2026-10-31T10:00:00.000Z');
    const r = risolviQuando({ tipo: 'rapida', valore: 'prossimo_weekend' }, unSabato, FUSO);
    expect(dataLocaleISO(new Date(r.inizioISO), FUSO)).toBe('2026-11-07');
    expect(dataLocaleISO(new Date(r.fineISO as string), FUSO)).toBe('2026-11-08');
  });
});

describe('risolviQuando - scelte esplicite', () => {
  it('data: precisione giorno sulla data fornita', () => {
    const r = risolviQuando({ tipo: 'data', dataISO: '2026-12-25' }, ADESSO, FUSO);
    expect(r.precisione).toBe('giorno');
    expect(dataLocaleISO(new Date(r.inizioISO), FUSO)).toBe('2026-12-25');
    expect(dataLocaleISO(new Date(r.fineISO as string), FUSO)).toBe('2026-12-25');
  });

  it('data_ora: precisione orario, inizioISO coincide con l\'istante fornito, fineISO nullo', () => {
    const r = risolviQuando({ tipo: 'data_ora', dataOraISO: '2026-12-25T20:30:00.000Z' }, ADESSO, FUSO);
    expect(r.precisione).toBe('orario');
    expect(r.inizioISO).toBe('2026-12-25T20:30:00.000Z');
    expect(r.fineISO).toBeNull();
  });
});

describe('formattaConGiorno', () => {
  it('formatta un giorno come "Sabato 24 ottobre"', () => {
    const r = risolviQuando({ tipo: 'rapida', valore: 'sabato' }, ADESSO, FUSO);
    expect(formattaConGiorno(r, FUSO)).toBe('Sabato 24 ottobre');
  });

  it('aggiunge "sera" per una fascia', () => {
    const r = risolviQuando({ tipo: 'rapida', valore: 'stasera' }, ADESSO, FUSO);
    expect(formattaConGiorno(r, FUSO)).toBe('Lunedì 19 ottobre sera');
  });

  it('aggiunge l\'orario per una precisione orario', () => {
    const r = risolviQuando({ tipo: 'data_ora', dataOraISO: '2026-12-25T19:30:00.000Z' }, ADESSO, FUSO);
    // dicembre: CET = UTC+1, 19:30 UTC -> 20:30 locali
    expect(formattaConGiorno(r, FUSO)).toBe('Venerdì 25 dicembre alle 20:30');
  });
});
