/**
 * Generato da `supabase gen types typescript --project-id iajucwiivgjguyowywwb`
 * contro il progetto Supabase collegato. Per rigenerare dopo nuove migration:
 *
 *   supabase gen types typescript --project-id iajucwiivgjguyowywwb > src/types/database.types.ts
 *
 * Modifiche manuali: i campi `tipo` (gruppi) e `stato` (articoli_spesa) sono
 * ristretti alle union letterali corrispondenti ai CHECK del DB — il
 * generatore li tipizza come `string` perché non sono enum Postgres reali.
 *
 * Le tabelle/funzioni del modulo Faccende (`faccende`, `occorrenze_faccende`,
 * `storico_faccende`, `impostazioni_faccende`, `completa_occorrenza`,
 * `annulla_completamento_occorrenza`, `importa_faccende_suggerite`) sono
 * state aggiunte qui a mano, scritte per corrispondere esattamente alle
 * migration 00000000000013/00000000000014, e le tabelle/funzioni del modulo
 * Sfida delle scelte (`sfide_scelta`, `sfide_partecipanti`, `sfide_opzioni`,
 * `sfide_turni`, `sfide_voti`, `sfide_turno_risultati`, `notifiche`,
 * `crea_sfida`, `conferma_voti`, `ripeti_sfida`, `scadi_turni_sfida`,
 * `annulla_sfida`, `_chiudi_turno_se_completo`, `rispondi_invito_sfida`,
 * più le viste `sfide_turni_progresso`/`sfide_mia_partecipazione`) sono
 * state scritte/aggiornate a mano per corrispondere esattamente alle
 * migration 00000000000015-00000000000025, verificate con `supabase gen
 * types` dopo ogni applicazione al progetto Supabase collegato.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      articoli_spesa: {
        Row: {
          aggiornato_il: string
          comprato_da: string | null
          creato_da: string | null
          creato_il: string
          gruppo_id: string
          id: string
          nome: string
          note: string | null
          prezzo_centesimi: number | null
          stato: "da_comprare" | "comprato"
        }
        Insert: {
          aggiornato_il?: string
          comprato_da?: string | null
          creato_da?: string | null
          creato_il?: string
          gruppo_id: string
          id?: string
          nome: string
          note?: string | null
          prezzo_centesimi?: number | null
          stato?: "da_comprare" | "comprato"
        }
        Update: {
          aggiornato_il?: string
          comprato_da?: string | null
          creato_da?: string | null
          creato_il?: string
          gruppo_id?: string
          id?: string
          nome?: string
          note?: string | null
          prezzo_centesimi?: number | null
          stato?: "da_comprare" | "comprato"
        }
        Relationships: [
          {
            foreignKeyName: "articoli_spesa_comprato_da_fkey"
            columns: ["comprato_da"]
            isOneToOne: false
            referencedRelation: "membri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articoli_spesa_creato_da_fkey"
            columns: ["creato_da"]
            isOneToOne: false
            referencedRelation: "membri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articoli_spesa_gruppo_id_fkey"
            columns: ["gruppo_id"]
            isOneToOne: false
            referencedRelation: "gruppi"
            referencedColumns: ["id"]
          },
        ]
      }
      faccende: {
        Row: {
          aggiornata_il: string
          assegnata_a: string | null
          attiva: boolean
          creato_da: string | null
          creato_il: string
          descrizione: string | null
          durata_stimata_minuti: number | null
          frequenza: "giornaliera" | "settimanale" | "mensile" | "personalizzata" | "una_tantum"
          gruppo_id: string
          id: string
          intervallo_ricorrenza: number | null
          nome: string
          origine_punteggio: "stima_automatica" | "manuale"
          parametri_ricorrenza: Json
          punti: number
          sforzo: "basso" | "medio" | "alto"
        }
        Insert: {
          aggiornata_il?: string
          assegnata_a?: string | null
          attiva?: boolean
          creato_da?: string | null
          creato_il?: string
          descrizione?: string | null
          durata_stimata_minuti?: number | null
          frequenza: "giornaliera" | "settimanale" | "mensile" | "personalizzata" | "una_tantum"
          gruppo_id: string
          id?: string
          intervallo_ricorrenza?: number | null
          nome: string
          origine_punteggio?: "stima_automatica" | "manuale"
          parametri_ricorrenza?: Json
          punti: number
          sforzo?: "basso" | "medio" | "alto"
        }
        Update: {
          aggiornata_il?: string
          assegnata_a?: string | null
          attiva?: boolean
          creato_da?: string | null
          creato_il?: string
          descrizione?: string | null
          durata_stimata_minuti?: number | null
          frequenza?: "giornaliera" | "settimanale" | "mensile" | "personalizzata" | "una_tantum"
          gruppo_id?: string
          id?: string
          intervallo_ricorrenza?: number | null
          nome?: string
          origine_punteggio?: "stima_automatica" | "manuale"
          parametri_ricorrenza?: Json
          punti?: number
          sforzo?: "basso" | "medio" | "alto"
        }
        Relationships: [
          {
            foreignKeyName: "faccende_assegnata_a_fkey"
            columns: ["assegnata_a"]
            isOneToOne: false
            referencedRelation: "membri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faccende_creato_da_fkey"
            columns: ["creato_da"]
            isOneToOne: false
            referencedRelation: "membri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faccende_gruppo_id_fkey"
            columns: ["gruppo_id"]
            isOneToOne: false
            referencedRelation: "gruppi"
            referencedColumns: ["id"]
          },
        ]
      }
      gruppi: {
        Row: {
          codice_invito: string
          creato_da: string
          creato_il: string
          id: string
          nome: string
          tipo: "casa" | "viaggio" | "ufficio" | "altro"
        }
        Insert: {
          codice_invito?: string
          creato_da: string
          creato_il?: string
          id?: string
          nome: string
          tipo?: "casa" | "viaggio" | "ufficio" | "altro"
        }
        Update: {
          codice_invito?: string
          creato_da?: string
          creato_il?: string
          id?: string
          nome?: string
          tipo?: "casa" | "viaggio" | "ufficio" | "altro"
        }
        Relationships: []
      }
      impegni: {
        Row: {
          aggiornato_il: string
          attiva: boolean
          creato_da: string | null
          creato_il: string
          data_inizio: string
          descrizione: string | null
          frequenza: "giornaliera" | "settimanale" | "mensile" | "personalizzata" | "una_tantum"
          gruppo_id: string
          id: string
          intervallo_ricorrenza: number | null
          modificabile_da_tutti: boolean
          ora: string | null
          promemoria_minuti_prima: number | null
          titolo: string
        }
        Insert: {
          aggiornato_il?: string
          attiva?: boolean
          creato_da?: string | null
          creato_il?: string
          data_inizio: string
          descrizione?: string | null
          frequenza: "giornaliera" | "settimanale" | "mensile" | "personalizzata" | "una_tantum"
          gruppo_id: string
          id?: string
          intervallo_ricorrenza?: number | null
          modificabile_da_tutti?: boolean
          ora?: string | null
          promemoria_minuti_prima?: number | null
          titolo: string
        }
        Update: {
          aggiornato_il?: string
          attiva?: boolean
          creato_da?: string | null
          creato_il?: string
          data_inizio?: string
          descrizione?: string | null
          frequenza?: "giornaliera" | "settimanale" | "mensile" | "personalizzata" | "una_tantum"
          gruppo_id?: string
          id?: string
          intervallo_ricorrenza?: number | null
          modificabile_da_tutti?: boolean
          ora?: string | null
          promemoria_minuti_prima?: number | null
          titolo?: string
        }
        Relationships: [
          {
            foreignKeyName: "impegni_creato_da_fkey"
            columns: ["creato_da"]
            isOneToOne: false
            referencedRelation: "membri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impegni_gruppo_id_fkey"
            columns: ["gruppo_id"]
            isOneToOne: false
            referencedRelation: "gruppi"
            referencedColumns: ["id"]
          },
        ]
      }
      impostazioni_faccende: {
        Row: {
          creato_il: string
          fuso_orario: string
          gruppo_id: string
        }
        Insert: {
          creato_il?: string
          fuso_orario?: string
          gruppo_id: string
        }
        Update: {
          creato_il?: string
          fuso_orario?: string
          gruppo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "impostazioni_faccende_gruppo_id_fkey"
            columns: ["gruppo_id"]
            isOneToOne: true
            referencedRelation: "gruppi"
            referencedColumns: ["id"]
          },
        ]
      }
      liste: {
        Row: {
          con_prezzi: boolean
          creato_da: string | null
          creato_il: string
          gruppo_id: string
          id: string
          mostra_in_home: boolean
          nome: string
        }
        Insert: {
          con_prezzi?: boolean
          creato_da?: string | null
          creato_il?: string
          gruppo_id: string
          id?: string
          mostra_in_home?: boolean
          nome: string
        }
        Update: {
          con_prezzi?: boolean
          creato_da?: string | null
          creato_il?: string
          gruppo_id?: string
          id?: string
          mostra_in_home?: boolean
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "liste_creato_da_fkey"
            columns: ["creato_da"]
            isOneToOne: false
            referencedRelation: "membri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liste_gruppo_id_fkey"
            columns: ["gruppo_id"]
            isOneToOne: false
            referencedRelation: "gruppi"
            referencedColumns: ["id"]
          },
        ]
      }
      membri: {
        Row: {
          creato_il: string
          gruppo_id: string
          id: string
          nome: string
          notifiche_silenziate: boolean
          uscito_il: string | null
          utente_id: string
        }
        Insert: {
          creato_il?: string
          gruppo_id: string
          id?: string
          nome: string
          notifiche_silenziate?: boolean
          uscito_il?: string | null
          utente_id: string
        }
        Update: {
          creato_il?: string
          gruppo_id?: string
          id?: string
          nome?: string
          notifiche_silenziate?: boolean
          uscito_il?: string | null
          utente_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membri_gruppo_id_fkey"
            columns: ["gruppo_id"]
            isOneToOne: false
            referencedRelation: "gruppi"
            referencedColumns: ["id"]
          },
        ]
      }
      notifiche: {
        Row: {
          corpo: string
          creata_il: string
          destinatario_membro_id: string
          evento_idempotenza: string
          gruppo_id: string
          id: string
          impegno_id: string | null
          letta_il: string | null
          sfida_id: string | null
          tipo:
            | "sfida_invito"
            | "sfida_promemoria"
            | "sfida_tutti_votato"
            | "sfida_spareggio"
            | "sfida_vincitore"
            | "sfida_senza_accordo"
            | "sfida_scaduta"
            | "sfida_rifiutata"
            | "impegno_promemoria"
          titolo: string
        }
        Insert: {
          corpo?: string
          creata_il?: string
          destinatario_membro_id: string
          evento_idempotenza: string
          gruppo_id: string
          id?: string
          impegno_id?: string | null
          letta_il?: string | null
          sfida_id?: string | null
          tipo:
            | "sfida_invito"
            | "sfida_promemoria"
            | "sfida_tutti_votato"
            | "sfida_spareggio"
            | "sfida_vincitore"
            | "sfida_senza_accordo"
            | "sfida_scaduta"
            | "sfida_rifiutata"
            | "impegno_promemoria"
          titolo: string
        }
        Update: {
          corpo?: string
          creata_il?: string
          destinatario_membro_id?: string
          evento_idempotenza?: string
          gruppo_id?: string
          id?: string
          impegno_id?: string | null
          letta_il?: string | null
          sfida_id?: string | null
          tipo?:
            | "sfida_invito"
            | "sfida_promemoria"
            | "sfida_tutti_votato"
            | "sfida_spareggio"
            | "sfida_vincitore"
            | "sfida_senza_accordo"
            | "sfida_scaduta"
            | "sfida_rifiutata"
            | "impegno_promemoria"
          titolo?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifiche_destinatario_membro_id_fkey"
            columns: ["destinatario_membro_id"]
            isOneToOne: false
            referencedRelation: "membri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifiche_gruppo_id_fkey"
            columns: ["gruppo_id"]
            isOneToOne: false
            referencedRelation: "gruppi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifiche_impegno_id_fkey"
            columns: ["impegno_id"]
            isOneToOne: false
            referencedRelation: "impegni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifiche_sfida_id_fkey"
            columns: ["sfida_id"]
            isOneToOne: false
            referencedRelation: "sfide_scelta"
            referencedColumns: ["id"]
          },
        ]
      }
      occorrenze_faccende: {
        Row: {
          completata_da: string | null
          completata_il: string | null
          creato_il: string
          faccenda_id: string
          gruppo_id: string
          id: string
          periodo_fine: string
          periodo_inizio: string
          punti_previsti: number
          scadenza: string
          stato: "da_fare" | "completata" | "scaduta"
        }
        Insert: {
          completata_da?: string | null
          completata_il?: string | null
          creato_il?: string
          faccenda_id: string
          gruppo_id: string
          id?: string
          periodo_fine: string
          periodo_inizio: string
          punti_previsti: number
          scadenza: string
          stato?: "da_fare" | "completata" | "scaduta"
        }
        Update: {
          completata_da?: string | null
          completata_il?: string | null
          creato_il?: string
          faccenda_id?: string
          gruppo_id?: string
          id?: string
          periodo_fine?: string
          periodo_inizio?: string
          punti_previsti?: number
          scadenza?: string
          stato?: "da_fare" | "completata" | "scaduta"
        }
        Relationships: [
          {
            foreignKeyName: "occorrenze_faccende_completata_da_fkey"
            columns: ["completata_da"]
            isOneToOne: false
            referencedRelation: "membri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "occorrenze_faccende_faccenda_id_fkey"
            columns: ["faccenda_id"]
            isOneToOne: false
            referencedRelation: "faccende"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "occorrenze_faccende_gruppo_id_fkey"
            columns: ["gruppo_id"]
            isOneToOne: false
            referencedRelation: "gruppi"
            referencedColumns: ["id"]
          },
        ]
      }
      occorrenze_impegni: {
        Row: {
          creato_il: string
          data_ora: string
          gruppo_id: string
          id: string
          impegno_id: string
        }
        Insert: {
          creato_il?: string
          data_ora: string
          gruppo_id: string
          id?: string
          impegno_id: string
        }
        Update: {
          creato_il?: string
          data_ora?: string
          gruppo_id?: string
          id?: string
          impegno_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "occorrenze_impegni_gruppo_id_fkey"
            columns: ["gruppo_id"]
            isOneToOne: false
            referencedRelation: "gruppi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "occorrenze_impegni_impegno_id_fkey"
            columns: ["impegno_id"]
            isOneToOne: false
            referencedRelation: "impegni"
            referencedColumns: ["id"]
          },
        ]
      }
      profili: {
        Row: {
          codice_utente: string
          creato_il: string
          nome_utente: string
          utente_id: string
        }
        Insert: {
          codice_utente?: string
          creato_il?: string
          nome_utente: string
          utente_id: string
        }
        Update: {
          codice_utente?: string
          creato_il?: string
          nome_utente?: string
          utente_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          creato_il: string
          endpoint: string
          id: string
          p256dh: string
          utente_id: string
        }
        Insert: {
          auth: string
          creato_il?: string
          endpoint: string
          id?: string
          p256dh: string
          utente_id: string
        }
        Update: {
          auth?: string
          creato_il?: string
          endpoint?: string
          id?: string
          p256dh?: string
          utente_id?: string
        }
        Relationships: []
      }
      quote_spesa: {
        Row: {
          membro_id: string
          quota_centesimi: number
          spesa_id: string
        }
        Insert: {
          membro_id: string
          quota_centesimi: number
          spesa_id: string
        }
        Update: {
          membro_id?: string
          quota_centesimi?: number
          spesa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_spesa_membro_id_fkey"
            columns: ["membro_id"]
            isOneToOne: false
            referencedRelation: "membri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_spesa_spesa_id_fkey"
            columns: ["spesa_id"]
            isOneToOne: false
            referencedRelation: "spese"
            referencedColumns: ["id"]
          },
        ]
      }
      sfide_opzioni: {
        Row: {
          creata_il: string
          id: string
          personalizzata: boolean
          proposta_da: string | null
          sfida_id: string
          testo_normalizzato: string
          testo_opzione: string
          turno_proposto_id: string | null
          voce_lista_id: string | null
        }
        Insert: {
          creata_il?: string
          id?: string
          personalizzata?: boolean
          proposta_da?: string | null
          sfida_id: string
          testo_normalizzato: string
          testo_opzione: string
          turno_proposto_id?: string | null
          voce_lista_id?: string | null
        }
        Update: {
          creata_il?: string
          id?: string
          personalizzata?: boolean
          proposta_da?: string | null
          sfida_id?: string
          testo_normalizzato?: string
          testo_opzione?: string
          turno_proposto_id?: string | null
          voce_lista_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sfide_opzioni_proposta_da_fkey"
            columns: ["proposta_da"]
            isOneToOne: false
            referencedRelation: "membri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sfide_opzioni_sfida_id_fkey"
            columns: ["sfida_id"]
            isOneToOne: false
            referencedRelation: "sfide_scelta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sfide_opzioni_turno_proposto_id_fkey"
            columns: ["turno_proposto_id"]
            isOneToOne: false
            referencedRelation: "sfide_turni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sfide_opzioni_voce_lista_id_fkey"
            columns: ["voce_lista_id"]
            isOneToOne: false
            referencedRelation: "voci_lista"
            referencedColumns: ["id"]
          },
        ]
      }
      sfide_partecipanti: {
        Row: {
          id: string
          membro_id: string
          sfida_id: string
          stato: "in_attesa" | "accettata" | "rifiutata"
        }
        Insert: {
          id?: string
          membro_id: string
          sfida_id: string
          stato?: "in_attesa" | "accettata" | "rifiutata"
        }
        Update: {
          id?: string
          membro_id?: string
          sfida_id?: string
          stato?: "in_attesa" | "accettata" | "rifiutata"
        }
        Relationships: [
          {
            foreignKeyName: "sfide_partecipanti_membro_id_fkey"
            columns: ["membro_id"]
            isOneToOne: false
            referencedRelation: "membri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sfide_partecipanti_sfida_id_fkey"
            columns: ["sfida_id"]
            isOneToOne: false
            referencedRelation: "sfide_scelta"
            referencedColumns: ["id"]
          },
        ]
      }
      sfide_scelta: {
        Row: {
          attivita_fine: string | null
          attivita_inizio: string
          attivita_precisione: "giorno" | "fascia" | "orario"
          categoria: string | null
          conclusa_il: string | null
          creata_da: string
          creata_il: string
          gruppo_id: string
          id: string
          lista_id: string
          opzione_vincente_id: string | null
          richiesta_id: string | null
          stato:
            | "in_corso"
            | "conclusa_vincitore"
            | "conclusa_senza_accordo"
            | "conclusa_scaduta"
            | "annullata"
          titolo: string
          votazione_scade_il: string
        }
        Insert: {
          attivita_fine?: string | null
          attivita_inizio: string
          attivita_precisione: "giorno" | "fascia" | "orario"
          categoria?: string | null
          conclusa_il?: string | null
          creata_da: string
          creata_il?: string
          gruppo_id: string
          id?: string
          lista_id: string
          opzione_vincente_id?: string | null
          richiesta_id?: string | null
          stato?:
            | "in_corso"
            | "conclusa_vincitore"
            | "conclusa_senza_accordo"
            | "conclusa_scaduta"
            | "annullata"
          titolo: string
          votazione_scade_il: string
        }
        Update: {
          attivita_fine?: string | null
          attivita_inizio?: string
          attivita_precisione?: "giorno" | "fascia" | "orario"
          categoria?: string | null
          conclusa_il?: string | null
          creata_da?: string
          creata_il?: string
          gruppo_id?: string
          id?: string
          lista_id?: string
          opzione_vincente_id?: string | null
          richiesta_id?: string | null
          stato?:
            | "in_corso"
            | "conclusa_vincitore"
            | "conclusa_senza_accordo"
            | "conclusa_scaduta"
            | "annullata"
          titolo?: string
          votazione_scade_il?: string
        }
        Relationships: [
          {
            foreignKeyName: "sfide_scelta_creata_da_fkey"
            columns: ["creata_da"]
            isOneToOne: false
            referencedRelation: "membri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sfide_scelta_gruppo_id_fkey"
            columns: ["gruppo_id"]
            isOneToOne: false
            referencedRelation: "gruppi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sfide_scelta_lista_id_fkey"
            columns: ["lista_id"]
            isOneToOne: false
            referencedRelation: "liste"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sfide_scelta_opzione_vincente_id_fkey"
            columns: ["opzione_vincente_id"]
            isOneToOne: false
            referencedRelation: "sfide_opzioni"
            referencedColumns: ["id"]
          },
        ]
      }
      sfide_turni: {
        Row: {
          concluso_il: string | null
          id: string
          iniziato_il: string
          numero_turno: number
          opzioni_in_gara: string[]
          scadenza: string
          sfida_id: string
          stato:
            | "in_corso"
            | "concluso_vincitore"
            | "concluso_pareggio"
            | "concluso_senza_accordo"
            | "scaduto_incompleto"
          tipo_turno: "iniziale" | "spareggio" | "nuovo_tentativo"
        }
        Insert: {
          concluso_il?: string | null
          id?: string
          iniziato_il?: string
          numero_turno: number
          opzioni_in_gara?: string[]
          scadenza: string
          sfida_id: string
          stato?:
            | "in_corso"
            | "concluso_vincitore"
            | "concluso_pareggio"
            | "concluso_senza_accordo"
            | "scaduto_incompleto"
          tipo_turno: "iniziale" | "spareggio" | "nuovo_tentativo"
        }
        Update: {
          concluso_il?: string | null
          id?: string
          iniziato_il?: string
          numero_turno?: number
          opzioni_in_gara?: string[]
          scadenza?: string
          sfida_id?: string
          stato?:
            | "in_corso"
            | "concluso_vincitore"
            | "concluso_pareggio"
            | "concluso_senza_accordo"
            | "scaduto_incompleto"
          tipo_turno?: "iniziale" | "spareggio" | "nuovo_tentativo"
        }
        Relationships: [
          {
            foreignKeyName: "sfide_turni_sfida_id_fkey"
            columns: ["sfida_id"]
            isOneToOne: false
            referencedRelation: "sfide_scelta"
            referencedColumns: ["id"]
          },
        ]
      }
      sfide_turno_risultati: {
        Row: {
          opzione_id: string
          turno_id: string
          voti_ricevuti: number
        }
        Insert: {
          opzione_id: string
          turno_id: string
          voti_ricevuti: number
        }
        Update: {
          opzione_id?: string
          turno_id?: string
          voti_ricevuti?: number
        }
        Relationships: [
          {
            foreignKeyName: "sfide_turno_risultati_opzione_id_fkey"
            columns: ["opzione_id"]
            isOneToOne: false
            referencedRelation: "sfide_opzioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sfide_turno_risultati_turno_id_fkey"
            columns: ["turno_id"]
            isOneToOne: false
            referencedRelation: "sfide_turni"
            referencedColumns: ["id"]
          },
        ]
      }
      sfide_voti: {
        Row: {
          creato_il: string
          id: string
          membro_id: string
          opzione_id: string
          turno_id: string
        }
        Insert: {
          creato_il?: string
          id?: string
          membro_id: string
          opzione_id: string
          turno_id: string
        }
        Update: {
          creato_il?: string
          id?: string
          membro_id?: string
          opzione_id?: string
          turno_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sfide_voti_membro_id_fkey"
            columns: ["membro_id"]
            isOneToOne: false
            referencedRelation: "membri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sfide_voti_opzione_id_fkey"
            columns: ["opzione_id"]
            isOneToOne: false
            referencedRelation: "sfide_opzioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sfide_voti_turno_id_fkey"
            columns: ["turno_id"]
            isOneToOne: false
            referencedRelation: "sfide_turni"
            referencedColumns: ["id"]
          },
        ]
      }
      spese: {
        Row: {
          annullata: boolean
          creato_il: string
          data: string
          descrizione: string
          gruppo_id: string
          id: string
          importo_centesimi: number
          pagato_da: string
        }
        Insert: {
          annullata?: boolean
          creato_il?: string
          data?: string
          descrizione?: string
          gruppo_id: string
          id?: string
          importo_centesimi: number
          pagato_da: string
        }
        Update: {
          annullata?: boolean
          creato_il?: string
          data?: string
          descrizione?: string
          gruppo_id?: string
          id?: string
          importo_centesimi?: number
          pagato_da?: string
        }
        Relationships: [
          {
            foreignKeyName: "spese_gruppo_id_fkey"
            columns: ["gruppo_id"]
            isOneToOne: false
            referencedRelation: "gruppi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spese_pagato_da_fkey"
            columns: ["pagato_da"]
            isOneToOne: false
            referencedRelation: "membri"
            referencedColumns: ["id"]
          },
        ]
      }
      storico_faccende: {
        Row: {
          creato_il: string
          gruppo_id: string
          id: string
          membro_id: string | null
          occorrenza_id: string
          punti: number
          tipo_evento: "completata" | "annullata"
        }
        Insert: {
          creato_il?: string
          gruppo_id: string
          id?: string
          membro_id?: string | null
          occorrenza_id: string
          punti: number
          tipo_evento: "completata" | "annullata"
        }
        Update: {
          creato_il?: string
          gruppo_id?: string
          id?: string
          membro_id?: string | null
          occorrenza_id?: string
          punti?: number
          tipo_evento?: "completata" | "annullata"
        }
        Relationships: [
          {
            foreignKeyName: "storico_faccende_gruppo_id_fkey"
            columns: ["gruppo_id"]
            isOneToOne: false
            referencedRelation: "gruppi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storico_faccende_membro_id_fkey"
            columns: ["membro_id"]
            isOneToOne: false
            referencedRelation: "membri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storico_faccende_occorrenza_id_fkey"
            columns: ["occorrenza_id"]
            isOneToOne: false
            referencedRelation: "occorrenze_faccende"
            referencedColumns: ["id"]
          },
        ]
      }
      voci_lista: {
        Row: {
          aggiornato_il: string
          creato_da: string | null
          creato_il: string
          fatto: boolean
          id: string
          lista_id: string
          note: string | null
          prezzo_centesimi: number | null
          testo: string
        }
        Insert: {
          aggiornato_il?: string
          creato_da?: string | null
          creato_il?: string
          fatto?: boolean
          id?: string
          lista_id: string
          note?: string | null
          prezzo_centesimi?: number | null
          testo: string
        }
        Update: {
          aggiornato_il?: string
          creato_da?: string | null
          creato_il?: string
          fatto?: boolean
          id?: string
          lista_id?: string
          note?: string | null
          prezzo_centesimi?: number | null
          testo?: string
        }
        Relationships: [
          {
            foreignKeyName: "voci_lista_creato_da_fkey"
            columns: ["creato_da"]
            isOneToOne: false
            referencedRelation: "membri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voci_lista_lista_id_fkey"
            columns: ["lista_id"]
            isOneToOne: false
            referencedRelation: "liste"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      sfide_turni_progresso: {
        Row: {
          // Postgres non può garantire staticamente che le colonne di una
          // vista siano non-null (anche se qui, nella pratica, lo sono
          // sempre: count(*) non è mai null, turno_id viene da una chiave
          // primaria) - confermato da `supabase gen types` dopo aver
          // applicato la migration, che le marca tutte nullable.
          partecipanti_totali: number | null
          partecipanti_votanti: number | null
          turno_id: string | null
        }
        Relationships: []
      }
      sfide_mia_partecipazione: {
        Row: {
          // Stesso motivo di sfide_turni_progresso: supabase gen types
          // marca sempre nullable le colonne di una vista.
          sfida_id: string | null
          stato: "in_attesa" | "accettata" | "rifiutata" | null
        }
        Relationships: []
      }
    }
    Functions: {
      _chiudi_turno_se_completo: {
        Args: { p_turno_id: string }
        Returns: undefined
      }
      annulla_completamento_occorrenza: {
        Args: { p_occorrenza_id: string }
        Returns: undefined
      }
      annulla_sfida: {
        Args: { p_sfida_id: string }
        Returns: undefined
      }
      completa_occorrenza: {
        Args: { p_occorrenza_id: string }
        Returns: undefined
      }
      conferma_voti: {
        Args: {
          p_opzioni_scelte: string[]
          p_proposta_personalizzata: string | null
          p_turno_id: string
        }
        Returns: undefined
      }
      crea_sfida: {
        Args: {
          p_attivita_fine: string | null
          p_attivita_inizio: string
          p_attivita_precisione: string
          p_categoria: string | null
          p_lista_id: string
          p_opzioni_scelte: string[]
          p_proposta_personalizzata: string | null
          p_richiesta_id: string
          p_titolo: string
          p_votazione_scade_il: string
        }
        Returns: string
      }
      crea_spesa: {
        Args: {
          p_data: string
          p_descrizione: string
          p_gruppo_id: string
          p_importo_centesimi: number
          p_pagato_da: string
          p_quote: Json
        }
        Returns: string
      }
      e_membro_di: { Args: { p_gruppo_id: string }; Returns: boolean }
      importa_faccende_suggerite: {
        Args: { p_gruppo_id: string }
        Returns: number
      }
      ripeti_sfida: {
        Args: { p_sfida_id: string }
        Returns: string
      }
      rispondi_invito_sfida: {
        Args: { p_accetta: boolean; p_sfida_id: string }
        Returns: undefined
      }
      scadi_turni_sfida: {
        Args: { p_gruppo_id: string }
        Returns: undefined
      }
      unisciti_a_gruppo: {
        Args: { p_codice_invito: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
