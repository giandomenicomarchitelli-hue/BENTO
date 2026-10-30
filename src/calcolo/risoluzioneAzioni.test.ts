import { risolviNome, ordinaSecondoMembriAttivi, calcolaQuoteAcquisto } from './risoluzioneAzioni';

const membri = [
  { id: 'm1', nome: 'Marco' },
  { id: 'm2', nome: 'Giulia' },
];

describe('risolviNome', () => {
  it('risolve case-insensitive', () => {
    expect(risolviNome('marco', membri)).toEqual({ stato: 'risolto', membroId: 'm1' });
  });

  it('non risolve un nome che non corrisponde a nessun membro', () => {
    expect(risolviNome('Paolo', membri)).toEqual({ stato: 'non_risolto' });
  });

  it('non risolve se il nome corrisponde a più di un membro (omonimia)', () => {
    const conOmonimi = [...membri, { id: 'm3', nome: 'marco' }];
    expect(risolviNome('Marco', conOmonimi)).toEqual({ stato: 'non_risolto' });
  });

  it('ignora spazi iniziali/finali', () => {
    expect(risolviNome('  Giulia  ', membri)).toEqual({ stato: 'risolto', membroId: 'm2' });
  });
});

describe('ordinaSecondoMembriAttivi', () => {
  it('riordina secondo l\'ordine canonico, indipendentemente dall\'ordine di input', () => {
    const ordineCanonico = ['m1', 'm2', 'm3'];
    expect(ordinaSecondoMembriAttivi(['m3', 'm1'], ordineCanonico)).toEqual(['m1', 'm3']);
    expect(ordinaSecondoMembriAttivi(['m1', 'm3'], ordineCanonico)).toEqual(['m1', 'm3']);
  });
});

describe('calcolaQuoteAcquisto', () => {
  it('la stessa persona riceve il resto indipendentemente dall\'ordine con cui Claude ha elencato i nomi', () => {
    const ordineCanonico = ['m1', 'm2', 'm3'];
    const idsA = ordinaSecondoMembriAttivi(['m2', 'm3', 'm1'], ordineCanonico);
    const idsB = ordinaSecondoMembriAttivi(['m1', 'm2', 'm3'], ordineCanonico);
    expect(calcolaQuoteAcquisto(1000, idsA)).toEqual(calcolaQuoteAcquisto(1000, idsB));
  });

  it('le quote sommano all\'importo totale', () => {
    const quote = calcolaQuoteAcquisto(1000, ['m1', 'm2', 'm3']);
    expect(quote.reduce((tot, q) => tot + q.quotaCentesimi, 0)).toBe(1000);
  });
});
