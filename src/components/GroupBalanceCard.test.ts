import { calcolaPosizionePersonale, etichettaPosizione } from './GroupBalanceCard';

describe('calcolaPosizionePersonale', () => {
  it('è positiva quando il membro è il creditore (a) di una transazione', () => {
    const transazioni = [{ da: 'b', a: 'io', importoCentesimi: 150 }];
    expect(calcolaPosizionePersonale(transazioni, 'io')).toBe(150);
  });

  it('è negativa quando il membro è il debitore (da) di una transazione', () => {
    const transazioni = [{ da: 'io', a: 'b', importoCentesimi: 150 }];
    expect(calcolaPosizionePersonale(transazioni, 'io')).toBe(-150);
  });

  it('è zero quando il membro non compare in nessuna transazione', () => {
    const transazioni = [{ da: 'a', a: 'b', importoCentesimi: 500 }];
    expect(calcolaPosizionePersonale(transazioni, 'io')).toBe(0);
  });

  it('è zero quando non ci sono transazioni', () => {
    expect(calcolaPosizionePersonale([], 'io')).toBe(0);
  });

  it('somma crediti e debiti con più controparti nella stessa direzione netta', () => {
    // "io" è creditore con b (200) e con c (100): totale a credito 300.
    const transazioni = [
      { da: 'b', a: 'io', importoCentesimi: 200 },
      { da: 'c', a: 'io', importoCentesimi: 100 },
    ];
    expect(calcolaPosizionePersonale(transazioni, 'io')).toBe(300);
  });

  it('nessuna inversione tra crediti e debiti quando entrambi sono presenti', () => {
    // "io" deve 100 a b, ma c deve 250 a "io": netto a credito di 150.
    const transazioni = [
      { da: 'io', a: 'b', importoCentesimi: 100 },
      { da: 'c', a: 'io', importoCentesimi: 250 },
    ];
    expect(calcolaPosizionePersonale(transazioni, 'io')).toBe(150);
  });

  it('il risultato può restare negativo anche con più controparti', () => {
    // "io" deve 100 a b e 50 a c: netto a debito di 150.
    const transazioni = [
      { da: 'io', a: 'b', importoCentesimi: 100 },
      { da: 'io', a: 'c', importoCentesimi: 50 },
    ];
    expect(calcolaPosizionePersonale(transazioni, 'io')).toBe(-150);
  });

  it('crediti e debiti di pari importo si annullano a zero', () => {
    const transazioni = [
      { da: 'io', a: 'b', importoCentesimi: 300 },
      { da: 'c', a: 'io', importoCentesimi: 300 },
    ];
    expect(calcolaPosizionePersonale(transazioni, 'io')).toBe(0);
  });
});

describe('etichettaPosizione', () => {
  it('un netto positivo è "Ti devono" ed è a credito', () => {
    expect(etichettaPosizione(99)).toEqual({ testo: 'Ti devono 0,99 €', aCredito: true });
  });

  it('un netto negativo è "Devi" e NON è a credito', () => {
    expect(etichettaPosizione(-99)).toEqual({ testo: 'Devi 0,99 €', aCredito: false });
  });

  it('usa sempre il valore assoluto nell\'importo mostrato', () => {
    expect(etichettaPosizione(-1250).testo).toBe('Devi 12,50 €');
    expect(etichettaPosizione(1250).testo).toBe('Ti devono 12,50 €');
  });
});
