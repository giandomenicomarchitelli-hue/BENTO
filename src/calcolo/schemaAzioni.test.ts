import { SchemaRisposta } from './schemaAzioni';

describe('SchemaRisposta - nuovi tipi di azione', () => {
  test('accetta aggiungi_voce_lista valido', () => {
    const risultato = SchemaRisposta.safeParse({
      azioni: [{ tipo: 'aggiungi_voce_lista', nomeLista: 'film', voci: ['Inception'] }],
      ambiguo: false,
      domanda_chiarimento: null,
    });
    expect(risultato.success).toBe(true);
  });

  test('accetta crea_impegno valido con assegnatoA null', () => {
    const risultato = SchemaRisposta.safeParse({
      azioni: [
        { tipo: 'crea_impegno', titolo: 'Dentista', dataInizio: '2026-11-02', ora: '18:00', assegnatoA: null },
      ],
      ambiguo: false,
      domanda_chiarimento: null,
    });
    expect(risultato.success).toBe(true);
  });

  test('accetta crea_impegno valido con assegnatoA valorizzato e ora null', () => {
    const risultato = SchemaRisposta.safeParse({
      azioni: [
        { tipo: 'crea_impegno', titolo: 'Dentista', dataInizio: '2026-11-02', ora: null, assegnatoA: 'Marco' },
      ],
      ambiguo: false,
      domanda_chiarimento: null,
    });
    expect(risultato.success).toBe(true);
  });

  test('rifiuta crea_impegno con dataInizio in formato sbagliato', () => {
    const risultato = SchemaRisposta.safeParse({
      azioni: [
        { tipo: 'crea_impegno', titolo: 'Dentista', dataInizio: '2/11/2026', ora: null, assegnatoA: null },
      ],
      ambiguo: false,
      domanda_chiarimento: null,
    });
    expect(risultato.success).toBe(false);
  });

  test('accetta un array con tipi misti nella stessa risposta', () => {
    const risultato = SchemaRisposta.safeParse({
      azioni: [
        { tipo: 'aggiungi_articolo', articoli: ['latte'] },
        { tipo: 'crea_impegno', titolo: 'Dentista', dataInizio: '2026-11-02', ora: null, assegnatoA: null },
      ],
      ambiguo: false,
      domanda_chiarimento: null,
    });
    expect(risultato.success).toBe(true);
  });

  test('rifiuta un tipo di azione sconosciuto', () => {
    const risultato = SchemaRisposta.safeParse({
      azioni: [{ tipo: 'cancella_tutto', qualcosa: true }],
      ambiguo: false,
      domanda_chiarimento: null,
    });
    expect(risultato.success).toBe(false);
  });
});
