'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createSupabaseBrowserClient } from './client';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export function useAuthSession() {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    try {
      const supabase = createSupabaseBrowserClient();

      supabase.auth.getSession().then(({ data, error: sessionError }) => {
        if (!mounted) return;

        if (sessionError) {
          setError(sessionError.message);
          setStatus('unauthenticated');
          return;
        }

        setUser(data.session?.user ?? null);
        setStatus(data.session ? 'authenticated' : 'unauthenticated');
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!mounted) return;

        setUser(session?.user ?? null);
        setStatus(session ? 'authenticated' : 'unauthenticated');
        setError('');
      });

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    } catch (authError) {
      queueMicrotask(() => {
        if (!mounted) return;

        setError(
          authError instanceof Error
            ? authError.message
            : 'Unable to check authentication state.',
        );
        setStatus('unauthenticated');
      });
    }

    return () => {
      mounted = false;
    };
  }, []);

  return {
    error,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
    status,
    user,
  };
}
