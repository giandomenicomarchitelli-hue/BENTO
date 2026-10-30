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

export const AzioneCreaImpegno = z.object({
  tipo: z.literal('crea_impegno'),
  titolo: z.string().min(1),
  dataInizio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ora: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  assegnatoA: z.string().nullable(),
});

// COPIA GEMELLA in supabase/functions/interpreta-azione/index.ts (Task 2):
// se cambi questo schema, cambia anche quello.
export const SchemaRisposta = z.object({
  azioni: z.array(z.discriminatedUnion('tipo', [AzioneAggiungiArticolo, AzioneAcquisto, AzioneAggiungiVoceLista, AzioneCreaImpegno])),
  ambiguo: z.boolean(),
  domanda_chiarimento: z.string().nullable(),
});

export type RispostaInterpretazione = z.infer<typeof SchemaRisposta>;
