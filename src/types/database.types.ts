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
 * migration 00000000000013/00000000000014: le migration non sono ancora
 * state applicate al progetto Supabase collegato in questa sessione (nessun
 * Docker/Supabase locale disponibile per verificarle prima). Dopo averle
 * applicate, rigenerare questo file con il comando sopra e verificare che
 * coincida con quanto scritto a mano (stessi nomi, stessi tipi) - gli altri
 * campi/stato restano invariati.
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
          uscito_il: string | null
          utente_id: string
        }
        Insert: {
          creato_il?: string
          gruppo_id: string
          id?: string
          nome: string
          uscito_il?: string | null
          utente_id: string
        }
        Update: {
          creato_il?: string
          gruppo_id?: string
          id?: string
          nome?: string
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
      [_ in never]: never
    }
    Functions: {
      annulla_completamento_occorrenza: {
        Args: { p_occorrenza_id: string }
        Returns: undefined
      }
      completa_occorrenza: {
        Args: { p_occorrenza_id: string }
        Returns: undefined
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
