import { supabase } from '@/lib/supabase';
import { SchemaRisposta, type RispostaInterpretazione } from '@/calcolo/schemaAzioni';
import { aggiornaArticolo, aggiungiArticolo, listaArticoli } from '@/api/articoliSpesa';
import { creaSpesa } from '@/api/spese';
import { creaLista, listaListe } from '@/api/liste';
import { aggiungiVoce } from '@/api/vociLista';
import { creaImpegno, leggiFusoOrarioGruppo, sincronizzaOccorrenzeImpegni } from '@/api/impegni';
import { calcolaQuoteAcquisto, ordinaSecondoMembriAttivi } from '@/calcolo/risoluzioneAzioni';

export async function interpretaAzione(params: {
  gruppoId: string;
  membriNomi: string[];
  nomeMittente: string;
  testo: string;
}): Promise<RispostaInterpretazione> {
  const fallbackAmbiguo: RispostaInterpretazione = {
    azioni: [],
    ambiguo: true,
    domanda_chiarimento: 'Non ho capito bene, puoi riscriverla?',
  };

  try {
    const { data, error } = await supabase.functions.invoke('interpreta-azione', { body: params });
    if (error) {
      return fallbackAmbiguo;
    }

    const risultato = SchemaRisposta.safeParse(data);
    return risultato.success ? risultato.data : fallbackAmbiguo;
  } catch {
    return fallbackAmbiguo;
  }
}

/**
 * Una singola azione interpretata, con i nomi già risolti a id di membri
 * (confermati/corretti dall'utente nella schermata di conferma).
 * `idPerNome` mappa il nome esatto come appare nell'azione al membroId
 * risolto per quel nome.
 */
export type AzioneRisolta = {
  azione: RispostaInterpretazione['azioni'][number];
  idPerNome: Map<string, string>;
};

/**
 * Esegue in ordine le azioni confermate dall'utente. La divisione delle
 * spese resta a codice deterministico (calcolaQuoteAcquisto), mai all'LLM.
 */
export async function eseguiAzioniConfermate(
  gruppoId: string,
  creatoDaMembroId: string,
  ordineCanonicoMembriIds: string[],
  azioni: AzioneRisolta[]
): Promise<void> {
  for (const { azione, idPerNome } of azioni) {
    if (azione.tipo === 'aggiungi_articolo') {
      for (const nome of azione.articoli) {
        await aggiungiArticolo(gruppoId, nome, creatoDaMembroId);
      }
      continue;
    }

    if (azione.tipo === 'acquisto') {
      const pagatoDaId = idPerNome.get(azione.pagato_da);
      if (!pagatoDaId) {
        throw new Error(`Impossibile risolvere chi ha pagato ("${azione.pagato_da}") a un membro del gruppo.`);
      }

      const nomiDivisoTra = azione.diviso_tra && azione.diviso_tra.length > 0 ? azione.diviso_tra : null;
      const idsDivisoTra = nomiDivisoTra
        ? nomiDivisoTra.map((nome) => {
            const id = idPerNome.get(nome);
            if (!id) {
              throw new Error(`Impossibile risolvere "${nome}" (in "diviso_tra") a un membro del gruppo.`);
            }
            return id;
          })
        : ordineCanonicoMembriIds;

      const idsOrdinati = ordinaSecondoMembriAttivi(idsDivisoTra, ordineCanonicoMembriIds);
      if (idsOrdinati.length === 0) {
        throw new Error(
          `Impossibile dividere l'acquisto pagato da "${azione.pagato_da}": nessun membro risolto per "diviso_tra".`
        );
      }

      const importoCentesimi = Math.round(azione.importo_euro * 100);
      const quote = calcolaQuoteAcquisto(importoCentesimi, idsOrdinati);
      await creaSpesa({ gruppoId, pagatoDa: pagatoDaId, importoCentesimi, quote });

      try {
        for (const nomeArticolo of azione.articoli) {
          const articoli = await listaArticoli(gruppoId);
          const trovato = articoli.find(
            (a) => a.stato === 'da_comprare' && a.nome.trim().toLowerCase() === nomeArticolo.trim().toLowerCase()
          );
          if (trovato) {
            await aggiornaArticolo(trovato.id, { stato: 'comprato', compratoDa: pagatoDaId });
          }
        }
      } catch {
        // marcare gli articoli è best-effort: la spesa è già registrata
      }
      continue;
    }

    if (azione.tipo === 'aggiungi_voce_lista') {
      const liste = await listaListe(gruppoId);
      const nomeNormalizzato = azione.nomeLista.trim().toLowerCase();
      const trovata = liste.find((l) => l.nome.trim().toLowerCase() === nomeNormalizzato);
      const lista = trovata ?? (await creaLista({
        gruppoId,
        nome: azione.nomeLista.trim(),
        creatoDaMembroId,
        mostraInHome: false,
        conPrezzi: false,
      }));

      for (const voce of azione.voci) {
        await aggiungiVoce(lista.id, voce, creatoDaMembroId);
      }
      continue;
    }

    if (azione.tipo === 'crea_impegno') {
      let idAssegnatoRisolto: string | null = null;
      if (azione.assegnatoA !== null) {
        const id = idPerNome.get(azione.assegnatoA);
        if (!id) {
          throw new Error(`Impossibile risolvere "${azione.assegnatoA}" (assegnatario) a un membro del gruppo.`);
        }
        idAssegnatoRisolto = id;
      }

      await creaImpegno({
        gruppoId,
        membroId: creatoDaMembroId,
        titolo: azione.titolo,
        descrizione: null,
        dataInizio: azione.dataInizio,
        ora: azione.ora,
        frequenza: 'una_tantum',
        intervalloRicorrenza: null,
        promemoriaMinutiPrima: null,
        modificabileDaTutti: true,
        assegnatoA: idAssegnatoRisolto,
      });

      const fusoOrario = await leggiFusoOrarioGruppo(gruppoId);
      await sincronizzaOccorrenzeImpegni(gruppoId, fusoOrario);
      continue;
    }
  }
}
