import type { SupabaseClient, User } from '@supabase/supabase-js';

type UserProfileInput = {
  displayName?: string;
  user: User;
};

export type UserProfile = {
  default_wpm: number | null;
  display_name: string | null;
  email: string | null;
  focus_mode: string | null;
  id: string;
};

export async function getUserProfile(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, display_name, default_wpm, focus_mode')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data as UserProfile | null;
}

export async function upsertUserProfile(
  supabase: SupabaseClient,
  { displayName, user }: UserProfileInput,
) {
  const { error } = await supabase.from('users').upsert(
    {
      default_wpm: 250,
      display_name: displayName,
      email: user.email,
      focus_mode: 'highlight',
      id: user.id,
      last_login_at: new Date().toISOString(),
      role: 'user',
    },
    { onConflict: 'id' },
  );

  if (error) throw error;
}

export async function updateUserDisplayName(
  supabase: SupabaseClient,
  userId: string,
  displayName: string,
) {
  const { error } = await supabase
    .from('users')
    .update({ display_name: displayName })
    .eq('id', userId);

  if (error) throw error;
}

export async function updateUserLastLogin(
  supabase: SupabaseClient,
  user: User,
) {
  const { error } = await supabase
    .from('users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', user.id);

  if (error) throw error;
}
