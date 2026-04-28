export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type FocusModeValue = 'highlight' | 'dot' | 'none';

export type Database = {
  public: {
    Tables: {
      users: Table<
        {
          default_wpm: number | null;
          display_name: string | null;
          email: string | null;
          focus_mode: FocusModeValue | null;
          id: string;
          last_login_at: string | null;
          role: string | null;
        },
        {
          default_wpm?: number | null;
          display_name?: string | null;
          email?: string | null;
          focus_mode?: FocusModeValue | null;
          id: string;
          last_login_at?: string | null;
          role?: string | null;
        }
      >;
      documents: Table<
        {
          file_size_bytes: number | null;
          id: string;
          is_sample: boolean | null;
          original_filename: string | null;
          storage_path: string | null;
          user_id: string | null;
        },
        {
          file_size_bytes?: number | null;
          id?: string;
          is_sample?: boolean | null;
          original_filename?: string | null;
          storage_path?: string | null;
          user_id?: string | null;
        }
      >;
      reading_sessions: Table<
        {
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
        },
        {
          achieved_wpm?: number | null;
          completed?: boolean | null;
          document_id?: string | null;
          duration_seconds?: number | null;
          end_page?: number | null;
          id?: string;
          start_page?: number | null;
          target_wpm?: number | null;
          user_id?: string | null;
          words_read?: number | null;
        }
      >;
      comprehension_checks: Table<
        {
          answers_json: Json | null;
          created_at: string | null;
          id: string;
          questions_json: Json | null;
          score: number | null;
          session_id: string | null;
        },
        {
          answers_json?: Json | null;
          id?: string;
          questions_json?: Json | null;
          score?: number | null;
          session_id?: string | null;
        }
      >;
      'speed reading-documents': Table<{
        id: string;
        name: string | null;
        owner: string | null;
      }>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
