import { normalizzaTesto } from './normalizzazioneTesto';

describe('normalizzaTesto', () => {
  it('rimuove spazi iniziali/finali e collassa spazi multipli', () => {
    expect(normalizzaTesto('  Sushi   bar  ')).toBe(normalizzaTesto('Sushi bar'));
  });
  it('ignora maiuscole/minuscole', () => {
    expect(normalizzaTesto('PIZZA')).toBe(normalizzaTesto('pizza'));
  });
  it('tratta forme Unicode equivalenti come uguali (NFKC)', () => {
    expect(normalizzaTesto('café')).toBe(normalizzaTesto('café'));
  });
  it('NON fonde termini semanticamente diversi', () => {
    expect(normalizzaTesto('pizza')).not.toBe(normalizzaTesto('pizze'));
    expect(normalizzaTesto('Pizza')).not.toBe(normalizzaTesto('Pizzeria'));
  });
});
