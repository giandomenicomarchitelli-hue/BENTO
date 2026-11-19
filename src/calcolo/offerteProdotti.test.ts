import { trovaOfferteCorrispondenti } from './offerteProdotti';
import type { OffertaProdotto } from './tipi';

function offerta(parziale: Partial<OffertaProdotto> & Pick<OffertaProdotto, 'nome'>): OffertaProdotto {
  return { id: parziale.nome, marca: null, prezzoCentesimi: 100, catena: 'Test', ...parziale };
}

describe('trovaOfferteCorrispondenti', () => {
  it('trova un prodotto il cui nome contiene la parola cercata', () => {
    const offerte = [offerta({ nome: 'Latte Intero UHT 1L' })];
    expect(trovaOfferteCorrispondenti('latte', offerte)).toEqual(offerte);
  });

  it('ignora maiuscole, spazi e accenti grazie alla normalizzazione', () => {
    const offerte = [offerta({ nome: '  LATTE   Intero  ' })];
    expect(trovaOfferteCorrispondenti('Latte', offerte)).toEqual(offerte);
  });

  it('richiede tutte le parole dell\'articolo, non una sola', () => {
    const offerte = [offerta({ nome: 'Latte Intero UHT 1L' })];
    expect(trovaOfferteCorrispondenti('latte scremato', offerte)).toEqual([]);
  });

  it('non fa match su un prefisso: "aranc" non trova "aranciata"', () => {
    const offerte = [offerta({ nome: 'Aranciata San Pellegrino' })];
    expect(trovaOfferteCorrispondenti('aranc', offerte)).toEqual([]);
  });

  it('non trova un ingrediente citato a metà nome di un prodotto diverso: "olio" non deve trovare "Tonno in Olio di Oliva"', () => {
    const tonno = offerta({ nome: 'Tonno in Olio di Oliva 80g x8', marca: 'Rio Mare' });
    const olio = offerta({ nome: 'Olio Extra Vergine di Oliva 1L' });
    expect(trovaOfferteCorrispondenti('olio', [tonno, olio])).toEqual([olio]);
  });

  it('restituisce array vuoto se nessuna offerta corrisponde', () => {
    const offerte = [offerta({ nome: 'Pasta di semola' })];
    expect(trovaOfferteCorrispondenti('detersivo', offerte)).toEqual([]);
  });

  it('ordina i risultati per prezzo crescente', () => {
    const cara = offerta({ nome: 'Pasta Barilla 500g', prezzoCentesimi: 150 });
    const economica = offerta({ nome: 'Pasta Divella 500g', prezzoCentesimi: 89 });
    expect(trovaOfferteCorrispondenti('pasta', [cara, economica])).toEqual([economica, cara]);
  });
});
