'use client';

import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { initializeAuthState, useAuthStore } from './auth-store';

export function useAuthSession() {
  const auth = useAuthStore(
    useShallow((state) => ({
      authError: state.authError,
      profile: state.profile,
      profileError: state.profileError,
      profileLoading: state.profileLoading,
      session: state.session,
      status: state.status,
      updateDisplayName: state.updateDisplayName,
      user: state.user,
    })),
  );

  useEffect(() => {
    initializeAuthState();
  }, []);

  return {
    ...auth,
    error: auth.authError,
    isAuthenticated: auth.status === 'authenticated',
    isLoading: auth.status === 'loading',
  };
}
