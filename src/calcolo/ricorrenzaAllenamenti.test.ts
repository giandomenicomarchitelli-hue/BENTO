import { giorniDellaSettimana, schedeDelGiorno } from './ricorrenzaAllenamenti';

describe('giorniDellaSettimana', () => {
  it('restituisce i 7 giorni da lunedì a domenica della settimana che contiene la data', () => {
    // 2026-11-26 è un giovedì.
    expect(giorniDellaSettimana('2026-11-26')).toEqual([
      '2026-11-23',
      '2026-11-24',
      '2026-11-25',
      '2026-11-26',
      '2026-11-27',
      '2026-11-28',
      '2026-11-29',
    ]);
  });

  it('funziona anche se la data è già un lunedì', () => {
    expect(giorniDellaSettimana('2026-11-23')[0]).toBe('2026-11-23');
  });

  it('funziona anche se la data è già una domenica', () => {
    expect(giorniDellaSettimana('2026-11-29')[6]).toBe('2026-11-29');
  });
});

describe('schedeDelGiorno', () => {
  it('trova le schede il cui giorno della settimana include la data (mercoledì)', () => {
    const palestra = { id: 'palestra', giorniSettimana: [3, 6] }; // mer, sab
    const corsa = { id: 'corsa', giorniSettimana: [1, 4] }; // lun, gio
    // 2026-11-25 è un mercoledì.
    expect(schedeDelGiorno([palestra, corsa], '2026-11-25')).toEqual([palestra]);
  });

  it('restituisce array vuoto se nessuna scheda cade in quel giorno', () => {
    const palestra = { id: 'palestra', giorniSettimana: [3, 6] };
    // 2026-11-24 è un martedì.
    expect(schedeDelGiorno([palestra], '2026-11-24')).toEqual([]);
  });

  it('una scheda su più giorni compare in ciascuno', () => {
    const palestra = { id: 'palestra', giorniSettimana: [3, 6] };
    expect(schedeDelGiorno([palestra], '2026-11-25')).toEqual([palestra]); // mer
    expect(schedeDelGiorno([palestra], '2026-11-28')).toEqual([palestra]); // sab
  });
});
