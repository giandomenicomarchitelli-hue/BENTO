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

// COPIA GEMELLA in supabase/functions/interpreta-azione/index.ts (Task 2):
// se cambi questo schema, cambia anche quello.
export const SchemaRisposta = z.object({
  azioni: z.array(z.discriminatedUnion('tipo', [AzioneAggiungiArticolo, AzioneAcquisto])),
  ambiguo: z.boolean(),
  domanda_chiarimento: z.string().nullable(),
});

export type RispostaInterpretazione = z.infer<typeof SchemaRisposta>;
