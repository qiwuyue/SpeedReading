'use client';

import type { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';
import { createSupabaseBrowserClient } from './client';
import {
  getUserProfile,
  updateUserDisplayName,
  type UserProfile,
} from './users';

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
  updateDisplayName: (displayName: string) => Promise<void>;
};

let initialized = false;
let profileRequestId = 0;

const applySession = async (session: Session | null) => {
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
  status: 'loading',
  user: null,
  setAuthError: (authError) => set({ authError }),
  updateDisplayName: async (displayName) => {
    const { profile, user } = get();

    if (!user) {
      throw new Error('You need to be logged in to update your profile.');
    }

    const supabase = createSupabaseBrowserClient();
    await updateUserDisplayName(supabase, user.id, displayName);

    set({
      profile: profile
        ? { ...profile, display_name: displayName }
        : profile,
      profileError: '',
    });
  },
}));

export function initializeAuthState() {
  if (initialized) return;

  initialized = true;

  try {
    const supabase = createSupabaseBrowserClient();

    supabase.auth.getSession().then(({ data, error }) => {
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

      void applySession(data.session);
    });

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
