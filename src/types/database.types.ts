/**
 * Tipi del database, scritti a mano per rispecchiare esattamente le migration
 * in supabase/migrations/. Quando esiste un progetto Supabase collegato
 * (locale o cloud), questo file può essere rigenerato con:
 *
 *   supabase gen types typescript --local > src/types/database.types.ts
 *
 * La forma (Row/Insert/Update, Functions) è compatibile con l'output di
 * quel comando, così lo switch al file generato non richiede altre modifiche.
 */

export interface Database {
  public: {
    Tables: {
      gruppi: {
        Row: {
          id: string;
          nome: string;
          tipo: 'casa' | 'viaggio' | 'ufficio' | 'altro';
          codice_invito: string;
          creato_da: string;
          creato_il: string;
        };
        Insert: {
          id?: string;
          nome: string;
          tipo?: 'casa' | 'viaggio' | 'ufficio' | 'altro';
          codice_invito?: string;
          creato_da: string;
          creato_il?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          tipo?: 'casa' | 'viaggio' | 'ufficio' | 'altro';
          codice_invito?: string;
          creato_da?: string;
          creato_il?: string;
        };
        Relationships: [];
      };
      membri: {
        Row: {
          id: string;
          gruppo_id: string;
          utente_id: string;
          nome: string;
          creato_il: string;
        };
        Insert: {
          id?: string;
          gruppo_id: string;
          utente_id: string;
          nome: string;
          creato_il?: string;
        };
        Update: {
          id?: string;
          gruppo_id?: string;
          utente_id?: string;
          nome?: string;
          creato_il?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'membri_gruppo_id_fkey';
            columns: ['gruppo_id'];
            isOneToOne: false;
            referencedRelation: 'gruppi';
            referencedColumns: ['id'];
          },
        ];
      };
      articoli_spesa: {
        Row: {
          id: string;
          gruppo_id: string;
          nome: string;
          stato: 'da_comprare' | 'comprato';
          creato_da: string | null;
          creato_il: string;
          aggiornato_il: string;
        };
        Insert: {
          id?: string;
          gruppo_id: string;
          nome: string;
          stato?: 'da_comprare' | 'comprato';
          creato_da?: string | null;
          creato_il?: string;
          aggiornato_il?: string;
        };
        Update: {
          id?: string;
          gruppo_id?: string;
          nome?: string;
          stato?: 'da_comprare' | 'comprato';
          creato_da?: string | null;
          creato_il?: string;
          aggiornato_il?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'articoli_spesa_gruppo_id_fkey';
            columns: ['gruppo_id'];
            isOneToOne: false;
            referencedRelation: 'gruppi';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'articoli_spesa_creato_da_fkey';
            columns: ['creato_da'];
            isOneToOne: false;
            referencedRelation: 'membri';
            referencedColumns: ['id'];
          },
        ];
      };
      spese: {
        Row: {
          id: string;
          gruppo_id: string;
          pagato_da: string;
          importo_centesimi: number;
          descrizione: string;
          data: string;
          annullata: boolean;
          creato_il: string;
        };
        Insert: {
          id?: string;
          gruppo_id: string;
          pagato_da: string;
          importo_centesimi: number;
          descrizione?: string;
          data?: string;
          annullata?: boolean;
          creato_il?: string;
        };
        Update: {
          id?: string;
          gruppo_id?: string;
          pagato_da?: string;
          importo_centesimi?: number;
          descrizione?: string;
          data?: string;
          annullata?: boolean;
          creato_il?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'spese_gruppo_id_fkey';
            columns: ['gruppo_id'];
            isOneToOne: false;
            referencedRelation: 'gruppi';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'spese_pagato_da_fkey';
            columns: ['pagato_da'];
            isOneToOne: false;
            referencedRelation: 'membri';
            referencedColumns: ['id'];
          },
        ];
      };
      quote_spesa: {
        Row: {
          spesa_id: string;
          membro_id: string;
          quota_centesimi: number;
        };
        Insert: {
          spesa_id: string;
          membro_id: string;
          quota_centesimi: number;
        };
        Update: {
          spesa_id?: string;
          membro_id?: string;
          quota_centesimi?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'quote_spesa_spesa_id_fkey';
            columns: ['spesa_id'];
            isOneToOne: false;
            referencedRelation: 'spese';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quote_spesa_membro_id_fkey';
            columns: ['membro_id'];
            isOneToOne: false;
            referencedRelation: 'membri';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      crea_spesa: {
        Args: {
          p_gruppo_id: string;
          p_pagato_da: string;
          p_importo_centesimi: number;
          p_descrizione: string | null;
          p_data: string | null;
          p_quote: { membro_id: string; quota_centesimi: number }[];
        };
        Returns: string;
      };
      unisciti_a_gruppo: {
        Args: {
          p_codice_invito: string;
          p_nome: string;
        };
        Returns: string;
      };
    };
  };
}
