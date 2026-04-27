'use client';

import type { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';
import { createSupabaseBrowserClient } from './client';
import { getUserProfile, type UserProfile, FocusMode } from './users';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type AuthState = {
  authError: string;
  profile: UserProfile | null;
  profileError: string;
  profileLoading: boolean;
  session: Session | null;
  status: AuthStatus;
  user: User | null;
  setAuthError: (error: string) => void;
  updateDefaultWpm: (wpm: number) => Promise<void>;
  updateFocusMode: (mode: FocusMode) => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<void>;
};

let initialized = false;
let profileRequestId = 0;

export const applySession = async (session: Session | null) => {
  const user = session?.user ?? null;
  const nextProfileRequestId = ++profileRequestId;
  const currentProfile = useAuthStore.getState().profile;

  useAuthStore.setState({
    authError: '',
    profile: user && currentProfile?.id === user.id ? currentProfile : null,
    profileError: '',
    profileLoading: Boolean(user),
    session,
    status: user ? 'authenticated' : 'unauthenticated',
    user,
  });

  if (!user) {
    useAuthStore.setState({ profileLoading: false });
    return;
  }

  try {
    const supabase = createSupabaseBrowserClient();
    const profile = await getUserProfile(supabase, user.id);

    if (profileRequestId !== nextProfileRequestId) return;

    useAuthStore.setState({
      profile,
      profileError: '',
      profileLoading: false,
    });
  } catch (error) {
    if (profileRequestId !== nextProfileRequestId) return;

    useAuthStore.setState({
      profile: null,
      profileError:
        error instanceof Error
          ? error.message
          : 'Unable to load your profile right now.',
      profileLoading: false,
    });
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  authError: '',
  profile: null,
  profileError: '',
  profileLoading: false,
  session: null,
  updateFocusMode: async (mode) => {
    const { profile, session, user } = get();
    
    if (!user || !session) {
      throw new Error('You need to be logged in to update your profile.');
    }

    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ focusMode: mode }),
    });
    
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      throw new Error(data.error ?? 'Failed to update focus mode.');
    }

    set({
      profile: profile
        ? { ...profile, focus_mode: mode }
        : {
            default_wpm: 250,
            display_name: null,
            email: user.email ?? null,
            focus_mode: FocusMode.HIGHLIGHT,
            id: user.id,
          },
      profileError: "",
    });
  },
  status: 'loading',
  user: null,
  setAuthError: (authError) => set({ authError }),
  updateDefaultWpm: async (wpm) => {
    const { profile, session, user } = get();

    if (!user || !session) {
      throw new Error('You need to be logged in to update your profile.');
    }

    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ wpm }),
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      throw new Error(data.error ?? 'Failed to update reading pace.');
    }

    set({
      profile: profile
        ? { ...profile, default_wpm: wpm }
        : {
            default_wpm: wpm,
            display_name: null,
            email: user.email ?? null,
            focus_mode: FocusMode.HIGHLIGHT,
            id: user.id,
          },
      profileError: '',
    });
  },
  updateDisplayName: async (displayName) => {
    const { profile, session, user } = get();

    if (!user || !session) {
      throw new Error('You need to be logged in to update your profile.');
    }

    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ displayName }),
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      throw new Error(data.error ?? 'Failed to update display name.');
    }

    set({
      profile: profile
        ? { ...profile, display_name: displayName }
        : {
            default_wpm: 250,
            display_name: displayName,
            email: user.email ?? null,
            focus_mode: FocusMode.HIGHLIGHT,
            id: user.id,
          },
      profileError: '',
    });
  },
}));

export function initializeAuthState() {
  if (initialized) return;

  initialized = true;

  try {
    const supabase = createSupabaseBrowserClient();

    void refreshAuthState();

    supabase.auth.onAuthStateChange((_event, session) => {
      void applySession(session);
    });
  } catch (error) {
    queueMicrotask(() => {
      useAuthStore.setState({
        authError:
          error instanceof Error
            ? error.message
            : 'Unable to check authentication state.',
        profile: null,
        profileLoading: false,
        session: null,
        status: 'unauthenticated',
        user: null,
      });
    });
  }
}

export async function refreshAuthState() {
  try {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      useAuthStore.setState({
        authError: error.message,
        profile: null,
        profileLoading: false,
        session: null,
        status: 'unauthenticated',
        user: null,
      });
      return;
    }

    await applySession(data.session);
  } catch (error) {
    useAuthStore.setState({
      authError:
        error instanceof Error
          ? error.message
          : 'Unable to check authentication state.',
      profile: null,
      profileLoading: false,
      session: null,
      status: 'unauthenticated',
      user: null,
    });
  }
}
