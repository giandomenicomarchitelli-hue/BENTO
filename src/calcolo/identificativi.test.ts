import { generaIdRichiesta } from './identificativi';

describe('generaIdRichiesta', () => {
  it('produce un id in forma UUID v4 valida (Postgres uuid lo rifiuterebbe altrimenti)', () => {
    const id = generaIdRichiesta();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('non produce due id uguali su chiamate successive', () => {
    const id1 = generaIdRichiesta();
    const id2 = generaIdRichiesta();
    expect(id1).not.toBe(id2);
  });

  it('non dipende da crypto.randomUUID (assente su React Native/Hermes)', () => {
    const globale = globalThis as { crypto?: unknown };
    const originale = globale.crypto;
    globale.crypto = undefined;
    try {
      expect(() => generaIdRichiesta()).not.toThrow();
    } finally {
      globale.crypto = originale;
    }
  });
});
