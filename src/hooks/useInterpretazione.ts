import { useMutation, useQueryClient } from '@tanstack/react-query';

import { eseguiAzioniConfermate, interpretaAzione, type AzioneRisolta } from '@/api/interpretazione';
import type { RispostaInterpretazione } from '@/calcolo/schemaAzioni';
import { useGruppoAttivo } from '@/hooks/useGruppoAttivo';
import { useListe } from '@/hooks/useListe';
import { useAuthStore } from '@/store/authStore';

/** Interpreta frasi in linguaggio naturale e esegue le azioni confermate. */
export function useInterpretazione(gruppoId: string | null) {
  const queryClient = useQueryClient();
  const utenteId = useAuthStore((stato) => stato.session?.user.id);
  const { membriAttivi } = useGruppoAttivo();
  // Nomi delle liste già esistenti: fatti vedere all'AI (come i nomi dei
  // membri) così può riconoscere "ristoranti" come la lista "Ristorante"
  // già creata, invece di crearne una seconda quasi identica.
  const { liste } = useListe(gruppoId);

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
        listeNomi: liste.map((l) => l.nome),
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
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['articoli-spesa', gruppoId] });
      queryClient.invalidateQueries({ queryKey: ['spese', gruppoId] });
      queryClient.invalidateQueries({ queryKey: ['liste', gruppoId] });
      queryClient.invalidateQueries({ queryKey: ['impegni', gruppoId] });
      queryClient.invalidateQueries({ queryKey: ['occorrenze-impegni', gruppoId] });
      // prefisso senza listaId: non sappiamo quale lista è stata toccata,
      // ma invalida comunque ogni query voci-lista aperta/in cache
      queryClient.invalidateQueries({ queryKey: ['voci-lista'] });
    },
  });

  return { interpreta, conferma };
}
