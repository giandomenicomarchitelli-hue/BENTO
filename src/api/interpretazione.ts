import { supabase } from '@/lib/supabase';
import { SchemaRisposta, type RispostaInterpretazione } from '@/calcolo/schemaAzioni';
import { aggiornaArticolo, aggiungiArticolo, listaArticoli } from '@/api/articoliSpesa';
import { creaSpesa } from '@/api/spese';
import { creaLista, listaListe } from '@/api/liste';
import { aggiungiVoce } from '@/api/vociLista';
import { creaImpegno, leggiFusoOrarioGruppo, sincronizzaOccorrenzeImpegni } from '@/api/impegni';
import { calcolaQuoteAcquisto, ordinaSecondoMembriAttivi } from '@/calcolo/risoluzioneAzioni';
import { normalizzaTesto } from '@/calcolo/normalizzazioneTesto';
import { dataSicura } from '@/calcolo/campiData';

export async function interpretaAzione(params: {
  gruppoId: string;
  membriNomi: string[];
  listeNomi: string[];
  nomeMittente: string;
  testo: string;
}): Promise<RispostaInterpretazione> {
  const fallbackAmbiguo: RispostaInterpretazione = {
    azioni: [],
    ambiguo: true,
    domanda_chiarimento: 'Non ho capito bene, puoi riscriverla?',
  };
  // Stesso risultato "ambiguo" dell'utente nell'app (non vogliamo che la UI
  // debba gestire un terzo stato), ma un messaggio diverso: un problema di
  // rete/server non si risolve riscrivendo la frase, va distinto da una
  // frase genuinamente incomprensibile - altrimenti l'utente riscrive la
  // stessa frase più volte senza che possa mai funzionare.
  const fallbackProblemaServer: RispostaInterpretazione = {
    azioni: [],
    ambiguo: true,
    domanda_chiarimento: 'Si è verificato un problema di connessione. Riprova tra poco.',
  };

  try {
    const { data, error } = await supabase.functions.invoke('interpreta-azione', { body: params });
    if (error) {
      console.error('interpretaAzione: errore dalla Edge Function', error);
      return fallbackProblemaServer;
    }

    const risultato = SchemaRisposta.safeParse(data);
    return risultato.success ? risultato.data : fallbackAmbiguo;
  } catch (errore) {
    console.error('interpretaAzione: eccezione nella chiamata', errore);
    return fallbackProblemaServer;
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
        // Una sola lettura per l'intera azione: gli articoli marcati qui
        // non vengono creati da questa stessa azione, quindi non c'è
        // rischio di perdere un articolo appena aggiunto leggendo una
        // volta sola invece che per ogni nome.
        const articoli = await listaArticoli(gruppoId);
        for (const nomeArticolo of azione.articoli) {
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
      const nomeNormalizzato = normalizzaTesto(azione.nomeLista);
      const trovata = liste.find((l) => normalizzaTesto(l.nome) === nomeNormalizzato);
      const lista =
        trovata ??
        (await creaLista({
          gruppoId,
          nome: azione.nomeLista.trim(),
          creatoDaMembroId,
          mostraInHome: false,
          conPrezzi: false,
        }).catch(async (erroreCreazione) => {
          // Un'altra richiesta concorrente potrebbe aver creato questa
          // stessa lista nel frattempo (vincolo unico su gruppo_id + nome
          // normalizzato, migration 00000000000033): ricontrolla invece
          // di far fallire l'intera azione con un errore del database.
          const listeAggiornate = await listaListe(gruppoId);
          const trovataOra = listeAggiornate.find((l) => normalizzaTesto(l.nome) === nomeNormalizzato);
          if (trovataOra) {
            return trovataOra;
          }
          throw erroreCreazione;
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

      // La regex dello schema valida solo la forma (4 cifre-2 cifre-2
      // cifre), non che la data esista davvero (es. "2026-02-30") - stessa
      // verifica già usata lato schermata di conferma, qui a protezione
      // della scrittura effettiva sul database.
      if (dataSicura(`${azione.dataInizio}T00:00:00`) === null) {
        throw new Error(`"${azione.dataInizio}" non è una data valida.`);
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

      try {
        const fusoOrario = await leggiFusoOrarioGruppo(gruppoId);
        await sincronizzaOccorrenzeImpegni(gruppoId, fusoOrario);
      } catch {
        // sincronizzare le occorrenze è best-effort: l'impegno è già creato,
        // e useImpegni le rigenera comunque ad ogni apertura del Calendario
      }
      continue;
    }
  }
}
