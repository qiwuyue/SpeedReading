'use client';

import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { initializeAuthState, refreshAuthState, useAuthStore } from './auth-store';

export function useAuthSession() {
  const auth = useAuthStore(
    useShallow((state) => ({
      authError: state.authError,
      profile: state.profile,
      profileError: state.profileError,
      profileLoading: state.profileLoading,
      session: state.session,
      status: state.status,
      updateFocusMode: state.updateFocusMode,
      updateDefaultWpm: state.updateDefaultWpm,
      updateDisplayName: state.updateDisplayName,
      user: state.user,
    })),
  );

  useEffect(() => {
    initializeAuthState();
  }, []);

  useEffect(() => {
    if (auth.status !== 'loading') return;

    const timeout = window.setTimeout(() => {
      void refreshAuthState();
    }, 2500);

    return () => window.clearTimeout(timeout);
  }, [auth.status]);

  return {
    ...auth,
    error: auth.authError,
    isAuthenticated: auth.status === 'authenticated',
    isLoading: auth.status === 'loading',
  };
}
