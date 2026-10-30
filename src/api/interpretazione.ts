import { supabase } from '@/lib/supabase';
import { SchemaRisposta, type RispostaInterpretazione } from '@/calcolo/schemaAzioni';

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

  const { data, error } = await supabase.functions.invoke('interpreta-azione', { body: params });
  if (error) {
    return fallbackAmbiguo;
  }

  const risultato = SchemaRisposta.safeParse(data);
  return risultato.success ? risultato.data : fallbackAmbiguo;
}
