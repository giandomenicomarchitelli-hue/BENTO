import { z } from 'zod';

export const AzioneAggiungiArticolo = z.object({
  tipo: z.literal('aggiungi_articolo'),
  articoli: z.array(z.string().min(1)).min(1),
});

export const AzioneAcquisto = z.object({
  tipo: z.literal('acquisto'),
  articoli: z.array(z.string()),
  importo_euro: z.number().positive(),
  pagato_da: z.string().min(1),
  diviso_tra: z.array(z.string()).optional(),
});

export const AzioneAggiungiVoceLista = z.object({
  tipo: z.literal('aggiungi_voce_lista'),
  nomeLista: z.string().min(1),
  voci: z.array(z.string().min(1)).min(1),
});

/**
 * L'LLM a volte scrive "9:00" invece di "09:00" nonostante le istruzioni
 * nel prompt: l'output strutturato di Claude non applica il vincolo di
 * formato della regex lato server, solo lo schema lo rivalida qui - se
 * non normalizzassimo prima, un'ora scritta bene ma senza zero iniziale
 * farebbe scartare l'intera risposta (anche le altre azioni corrette
 * nella stessa frase) invece di essere semplicemente corretta.
 */
function normalizzaOra(valore: string | null): string | null {
  if (valore === null) {
    return valore;
  }
  const corrispondenza = valore.match(/^(\d{1,2}):(\d{1,2})$/);
  if (corrispondenza === null) {
    return valore;
  }
  return `${corrispondenza[1].padStart(2, '0')}:${corrispondenza[2].padStart(2, '0')}`;
}

export const AzioneCreaImpegno = z.object({
  tipo: z.literal('crea_impegno'),
  titolo: z.string().min(1),
  dataInizio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ora: z
    .string()
    .nullable()
    .transform(normalizzaOra)
    .pipe(z.string().regex(/^\d{2}:\d{2}$/).nullable()),
  // .min(1): un assegnatario vuoto non è "nessuno" (null), è un dato
  // malformato - va scartato come il resto della risposta, non trattato
  // come un nome da risolvere a un membro.
  assegnatoA: z.string().min(1).nullable(),
});

// COPIA GEMELLA in supabase/functions/interpreta-azione/index.ts (Task 2):
// se cambi questo schema, cambia anche quello.
export const SchemaRisposta = z.object({
  azioni: z.array(z.discriminatedUnion('tipo', [AzioneAggiungiArticolo, AzioneAcquisto, AzioneAggiungiVoceLista, AzioneCreaImpegno])),
  ambiguo: z.boolean(),
  domanda_chiarimento: z.string().nullable(),
});

export type RispostaInterpretazione = z.infer<typeof SchemaRisposta>;
