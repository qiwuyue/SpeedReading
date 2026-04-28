export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      comprehension_checks: {
        Row: {
          answers_json: Json | null;
          created_at: string | null;
          id: string;
          questions_json: Json | null;
          score: number | null;
          session_id: string | null;
        };
        Insert: {
          answers_json?: Json | null;
          created_at?: string | null;
          id?: string;
          questions_json?: Json | null;
          score?: number | null;
          session_id?: string | null;
        };
        Update: {
          answers_json?: Json | null;
          created_at?: string | null;
          id?: string;
          questions_json?: Json | null;
          score?: number | null;
          session_id?: string | null;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          created_at: string | null;
          file_size_bytes: number | null;
          id: string;
          is_sample: boolean | null;
          original_filename: string | null;
          storage_path: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          file_size_bytes?: number | null;
          id?: string;
          is_sample?: boolean | null;
          original_filename?: string | null;
          storage_path?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          file_size_bytes?: number | null;
          id?: string;
          is_sample?: boolean | null;
          original_filename?: string | null;
          storage_path?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      reading_sessions: {
        Row: {
          achieved_wpm: number | null;
          completed: boolean | null;
          created_at: string | null;
          document_id: string | null;
          duration_seconds: number | null;
          end_page: number | null;
          id: string;
          start_page: number | null;
          target_wpm: number | null;
          user_id: string | null;
          words_read: number | null;
        };
        Insert: {
          achieved_wpm?: number | null;
          completed?: boolean | null;
          created_at?: string | null;
          document_id?: string | null;
          duration_seconds?: number | null;
          end_page?: number | null;
          id?: string;
          start_page?: number | null;
          target_wpm?: number | null;
          user_id?: string | null;
          words_read?: number | null;
        };
        Update: {
          achieved_wpm?: number | null;
          completed?: boolean | null;
          created_at?: string | null;
          document_id?: string | null;
          duration_seconds?: number | null;
          end_page?: number | null;
          id?: string;
          start_page?: number | null;
          target_wpm?: number | null;
          user_id?: string | null;
          words_read?: number | null;
        };
        Relationships: [];
      };
      users: {
        Row: {
          default_wpm: number | null;
          display_name: string | null;
          email: string | null;
          focus_mode: 'highlight' | 'dot' | 'none' | null;
          id: string;
          last_login_at: string | null;
          role: string | null;
        };
        Insert: {
          default_wpm?: number | null;
          display_name?: string | null;
          email?: string | null;
          focus_mode?: 'highlight' | 'dot' | 'none' | null;
          id: string;
          last_login_at?: string | null;
          role?: string | null;
        };
        Update: {
          default_wpm?: number | null;
          display_name?: string | null;
          email?: string | null;
          focus_mode?: 'highlight' | 'dot' | 'none' | null;
          id?: string;
          last_login_at?: string | null;
          role?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
