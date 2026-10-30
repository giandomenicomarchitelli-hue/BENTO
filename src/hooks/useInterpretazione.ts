import { useMutation, useQueryClient } from '@tanstack/react-query';

import { eseguiAzioniConfermate, interpretaAzione, type AzioneRisolta } from '@/api/interpretazione';
import type { RispostaInterpretazione } from '@/calcolo/schemaAzioni';
import { useGruppoAttivo } from '@/hooks/useGruppoAttivo';
import { useAuthStore } from '@/store/authStore';

/** Interpreta frasi in linguaggio naturale e esegue le azioni confermate. */
export function useInterpretazione(gruppoId: string | null) {
  const queryClient = useQueryClient();
  const utenteId = useAuthStore((stato) => stato.session?.user.id);
  const { membriAttivi } = useGruppoAttivo();

  const interpreta = useMutation({
    mutationFn: async (testo: string): Promise<RispostaInterpretazione> => {
      if (gruppoId === null) {
        throw new Error('Nessun gruppo attivo selezionato.');
      }
      const mittente = membriAttivi.find((m) => m.utente_id === utenteId);
      if (!mittente) {
        throw new Error('Impossibile risolvere l\'utente corrente a un membro del gruppo.');
      }
      return interpretaAzione({
        gruppoId,
        membriNomi: membriAttivi.map((m) => m.nome),
        nomeMittente: mittente.nome,
        testo,
      });
    },
  });

  const conferma = useMutation({
    mutationFn: async (azioni: AzioneRisolta[]): Promise<void> => {
      if (gruppoId === null) {
        throw new Error('Nessun gruppo attivo selezionato.');
      }
      const autore = membriAttivi.find((m) => m.utente_id === utenteId);
      if (!autore) {
        throw new Error('Impossibile risolvere l\'utente corrente a un membro del gruppo.');
      }
      await eseguiAzioniConfermate(
        gruppoId,
        autore.id,
        membriAttivi.map((m) => m.id),
        azioni
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articoli-spesa', gruppoId] });
      queryClient.invalidateQueries({ queryKey: ['spese', gruppoId] });
    },
  });

  return { interpreta, conferma };
}
