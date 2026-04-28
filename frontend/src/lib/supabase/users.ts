import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "./database.types";

type UserProfileInput = {
  displayName?: string;
  user: User;
};

export enum FocusMode {
  HIGHLIGHT = "highlight",
  DOT = "dot",
  NONE = "none",
}
export type UserProfile = {
  default_wpm: number | null;
  display_name: string | null;
  email: string | null;
  focus_mode: FocusMode | null;
  id: string;
};

type AppSupabaseClient = SupabaseClient<Database>;

export async function getUserProfile(supabase: AppSupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("id, email, display_name, default_wpm, focus_mode")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as UserProfile | null;
}

export async function upsertUserProfile(
  supabase: AppSupabaseClient,
  { displayName, user }: UserProfileInput,
) {
  const { error } = await supabase.from("users").upsert(
    {
      default_wpm: 250,
      display_name: displayName,
      email: user.email,
      focus_mode: FocusMode.HIGHLIGHT,
      id: user.id,
      last_login_at: new Date().toISOString(),
      role: "user",
    },
    { onConflict: "id" },
  );

  if (error) throw new Error(error.message);
}

export async function updateUserDisplayName(
  supabase: AppSupabaseClient,
  userId: string,
  displayName: string,
) {
  const { error } = await supabase
    .from("users")
    .update({ display_name: displayName })
    .eq("id", userId);

  if (error) throw new Error(error.message);
}

export async function updateDefaultWpm(
  supabase: AppSupabaseClient,
  userId: string,
  wpm: number,
) {
  const { error } = await supabase
    .from("users")
    .update({ default_wpm: wpm })
    .eq("id", userId);

  if (error) throw new Error(error.message);
}

export async function updateUserLastLogin(
  supabase: AppSupabaseClient,
  user: User,
) {
  const { error } = await supabase
    .from("users")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) throw new Error(error.message);
}

export async function isAnonymousUser(
  supabase: AppSupabaseClient,
): Promise<boolean> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) throw new Error(error?.message || "Unable to get user");

  return user.is_anonymous ?? false;
}

export async function convertAnonToAuthenticated(
  supabase: AppSupabaseClient,
  email: string,
  password: string,
) {
  // Update the auth user with email and password
  const { error: updateError } = await supabase.auth.updateUser({
    email,
    password,
  });

  if (updateError) throw new Error(updateError.message);

  // Get updated user
  const {
    data: { user },
    error: getUserError,
  } = await supabase.auth.getUser();

  if (getUserError || !user) {
    throw new Error(getUserError?.message || "Unable to retrieve updated user");
  }

  // Update profile with new email
  const { error: profileError } = await supabase
    .from("users")
    .update({ email })
    .eq("id", user.id);

  if (profileError) throw new Error(profileError.message);
}
