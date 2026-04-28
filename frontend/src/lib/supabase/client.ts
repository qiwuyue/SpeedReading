import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

let supabaseBrowserClient: ReturnType<typeof createClient<Database>> | null =
  null;

export function createSupabaseBrowserClient() {
  if (supabaseBrowserClient) return supabaseBrowserClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    );
  }

  supabaseBrowserClient = createClient<Database>(
    supabaseUrl,
    supabasePublishableKey,
  );
  return supabaseBrowserClient;
}
