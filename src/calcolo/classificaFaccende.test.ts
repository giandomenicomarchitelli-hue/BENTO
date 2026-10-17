import { calcolaClassifica } from './classificaFaccende';
import { inizioSettimanaISO } from './ricorrenzaFaccende';

describe('calcolaClassifica', () => {
  it('con due o più partecipanti, ordina per punti decrescenti e calcola la percentuale corretta', () => {
    const classifica = calcolaClassifica(
      [
        { membroId: 'giando', punti: 60 },
        { membroId: 'giando', punti: 64 },
        { membroId: 'vale', punti: 98 },
      ],
      ['giando', 'vale']
    );

    expect(classifica).toEqual([
      { membroId: 'giando', punti: 124, faccendeCompletate: 2, percentuale: 56, posizione: 1 },
      { membroId: 'vale', punti: 98, faccendeCompletate: 1, percentuale: 44, posizione: 2 },
    ]);
  });

  it('a zero punti, mostra zero per tutti i membri (nessuno escluso)', () => {
    const classifica = calcolaClassifica([], ['giando', 'vale']);

    expect(classifica).toEqual([
      { membroId: 'giando', punti: 0, faccendeCompletate: 0, percentuale: 0, posizione: 1 },
      { membroId: 'vale', punti: 0, faccendeCompletate: 0, percentuale: 0, posizione: 2 },
    ]);
  });

  it('un membro senza completamenti compare comunque, con zero punti', () => {
    const classifica = calcolaClassifica([{ membroId: 'giando', punti: 10 }], ['giando', 'vale']);
    const vale = classifica.find((v) => v.membroId === 'vale');
    expect(vale).toEqual({ membroId: 'vale', punti: 0, faccendeCompletate: 0, percentuale: 0, posizione: 2 });
  });

  it('annullare un completamento (rimuoverlo dalle occorrenze completate) ricalcola punti e percentuali', () => {
    const conEntrambi = calcolaClassifica(
      [
        { membroId: 'giando', punti: 10 },
        { membroId: 'vale', punti: 10 },
      ],
      ['giando', 'vale']
    );
    expect(conEntrambi.find((v) => v.membroId === 'giando')?.percentuale).toBe(50);

    // L'annullamento di un completamento di Giando riporta l'occorrenza a
    // "da_fare": per il calcolo della classifica è come se quel
    // completamento non esistesse più (vedi classificaFaccende.ts).
    const dopoAnnullamento = calcolaClassifica([{ membroId: 'vale', punti: 10 }], ['giando', 'vale']);
    expect(dopoAnnullamento).toEqual([
      { membroId: 'vale', punti: 10, faccendeCompletate: 1, percentuale: 100, posizione: 1 },
      { membroId: 'giando', punti: 0, faccendeCompletate: 0, percentuale: 0, posizione: 2 },
    ]);
  });

  it('un membro non più nell\'elenco (es. uscito dal gruppo) non fa sparire i suoi punti storici dal totale', () => {
    const classifica = calcolaClassifica(
      [
        { membroId: 'ex-membro', punti: 20 },
        { membroId: 'giando', punti: 20 },
      ],
      ['giando'] // "ex-membro" non è più tra i membri attivi passati
    );
    const exMembro = classifica.find((v) => v.membroId === 'ex-membro');
    expect(exMembro?.punti).toBe(20);
    // Il totale del gruppo include comunque i suoi punti: 20/40 = 50%.
    expect(classifica.find((v) => v.membroId === 'giando')?.percentuale).toBe(50);
  });

  it('a parità di punti, chi ha completato più faccende viene prima', () => {
    const classifica = calcolaClassifica(
      [
        { membroId: 'giando', punti: 10 },
        { membroId: 'vale', punti: 5 },
        { membroId: 'vale', punti: 5 },
      ],
      ['giando', 'vale']
    );
    expect(classifica[0]).toMatchObject({ membroId: 'vale', punti: 10, faccendeCompletate: 2 });
    expect(classifica[1]).toMatchObject({ membroId: 'giando', punti: 10, faccendeCompletate: 1 });
  });
});

describe('isolamento settimanale (reset settimanale, storico conservato)', () => {
  it('occorrenze completate in settimane diverse restano distinte quando filtrate per settimana', () => {
    // Stessa logica che userà il livello API: bucket per inizioSettimanaISO
    // della data di completamento, non un contatore separato da azzerare.
    const completamenti = [
      { membroId: 'giando', punti: 10, completataIl: '2026-01-06' }, // settimana del 5 gennaio
      { membroId: 'giando', punti: 10, completataIl: '2026-01-14' }, // settimana del 12 gennaio
    ];

    const settimana1 = completamenti.filter(
      (c) => inizioSettimanaISO(c.completataIl) === inizioSettimanaISO('2026-01-06')
    );
    const settimana2 = completamenti.filter(
      (c) => inizioSettimanaISO(c.completataIl) === inizioSettimanaISO('2026-01-14')
    );

    expect(calcolaClassifica(settimana1, ['giando'])).toEqual([
      { membroId: 'giando', punti: 10, faccendeCompletate: 1, percentuale: 100, posizione: 1 },
    ]);
    expect(calcolaClassifica(settimana2, ['giando'])).toEqual([
      { membroId: 'giando', punti: 10, faccendeCompletate: 1, percentuale: 100, posizione: 1 },
    ]);
    // La settimana 1 non "eredita" nulla dalla settimana 2 e viceversa: lo
    // storico resta interamente consultabile (qui: entrambi i completamenti
    // restano nell'array originale), ma ogni classifica settimanale è
    // calcolata solo sul proprio sottoinsieme.
    expect(completamenti).toHaveLength(2);
  });
});
