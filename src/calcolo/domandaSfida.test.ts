import { risolviQuando } from './datazioneSfida';
import { deduciCategoria, generaDomanda } from './domandaSfida';

describe('deduciCategoria', () => {
  it.each([
    ['Cosa mangiamo', 'cibo'],
    ['Ricette della settimana', 'cibo'],
    ['Ristoranti preferiti', 'ristoranti'],
    ['Pizzerie in zona', 'ristoranti'],
    ['Film da vedere', 'film'],
    ['Serie TV', 'film'],
    ['Cose da fare', 'attivita'],
    ['Weekend fuori porta', 'viaggi'],
    ['Giochi da tavolo', 'giochi'],
  ])('"%s" -> %s', (nome, attesa) => {
    expect(deduciCategoria(nome)).toBe(attesa);
  });

  it('nessuna parola chiave riconosciuta -> null', () => {
    expect(deduciCategoria('Lista della nonna')).toBeNull();
  });
});

describe('generaDomanda', () => {
  // adesso fisso, stesso usato in datazioneSfida.test.ts: lunedì 2026-10-19.
  const ADESSO = new Date('2026-10-19T10:00:00.000Z');
  const FUSO = 'Europe/Rome';

  it('cibo + stasera -> "Cosa vuoi mangiare stasera?"', () => {
    const esito = risolviQuando({ tipo: 'rapida', valore: 'stasera' }, ADESSO, FUSO);
    expect(generaDomanda('cibo', esito, ADESSO, FUSO)).toBe('Cosa vuoi mangiare stasera?');
  });

  it('cibo + sabato -> "Cosa vuoi mangiare sabato?"', () => {
    const esito = risolviQuando({ tipo: 'rapida', valore: 'sabato' }, ADESSO, FUSO);
    expect(generaDomanda('cibo', esito, ADESSO, FUSO)).toBe('Cosa vuoi mangiare sabato?');
  });

  it('ristoranti + stasera -> "Dove vuoi andare a cena stasera?"', () => {
    const esito = risolviQuando({ tipo: 'rapida', valore: 'stasera' }, ADESSO, FUSO);
    expect(generaDomanda('ristoranti', esito, ADESSO, FUSO)).toBe('Dove vuoi andare a cena stasera?');
  });

  it('ristoranti + sabato -> "Dove vuoi mangiare sabato?"', () => {
    const esito = risolviQuando({ tipo: 'rapida', valore: 'sabato' }, ADESSO, FUSO);
    expect(generaDomanda('ristoranti', esito, ADESSO, FUSO)).toBe('Dove vuoi mangiare sabato?');
  });

  it('film + venerdì sera -> "Che film vuoi vedere venerdì sera?"', () => {
    // Nessuna scelta rapida produce direttamente "venerdì sera" (il brief
    // §4 non la elenca tra le scelte rapide, solo §5 la usa come esempio):
    // si costruisce l'EsitoDatazione a mano, stessa identica forma che
    // "Scegli data e ora" produrrebbe per venerdì 23 ottobre ore 19-24.
    const esito = {
      inizioISO: '2026-10-23T17:00:00.000Z', // 19:00 locali (CEST, UTC+2 in ottobre)
      fineISO: '2026-10-23T21:59:59.000Z',
      precisione: 'fascia' as const,
    };
    expect(generaDomanda('film', esito, ADESSO, FUSO)).toBe('Che film vuoi vedere venerdì sera?');
  });

  it('film + stasera -> "Che film vuoi guardare stasera?"', () => {
    const esito = risolviQuando({ tipo: 'rapida', valore: 'stasera' }, ADESSO, FUSO);
    expect(generaDomanda('film', esito, ADESSO, FUSO)).toBe('Che film vuoi guardare stasera?');
  });

  it('attività + weekend -> "Cosa vuoi fare nel weekend?"', () => {
    const esito = risolviQuando({ tipo: 'rapida', valore: 'questo_weekend' }, ADESSO, FUSO);
    expect(generaDomanda('attivita', esito, ADESSO, FUSO)).toBe('Cosa vuoi fare nel weekend?');
  });

  it('viaggi + prossimo weekend -> "Dove vuoi andare il prossimo weekend?"', () => {
    const esito = risolviQuando({ tipo: 'rapida', valore: 'prossimo_weekend' }, ADESSO, FUSO);
    expect(generaDomanda('viaggi', esito, ADESSO, FUSO)).toBe('Dove vuoi andare il prossimo weekend?');
  });

  it('giochi + stasera -> "A cosa vuoi giocare stasera?"', () => {
    const esito = risolviQuando({ tipo: 'rapida', valore: 'stasera' }, ADESSO, FUSO);
    expect(generaDomanda('giochi', esito, ADESSO, FUSO)).toBe('A cosa vuoi giocare stasera?');
  });

  it('categoria null -> domanda generica "Quale opzione scegliamo per <quando>?"', () => {
    const esito = risolviQuando({ tipo: 'rapida', valore: 'sabato' }, ADESSO, FUSO);
    expect(generaDomanda(null, esito, ADESSO, FUSO)).toBe('Quale opzione scegliamo per sabato?');
  });
});
