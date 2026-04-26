'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import AuthModal from '@/app/ui/auth-modal';
import { useAuthSession } from '@/lib/supabase/use-auth-session';

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthSession();

  useEffect(() => {
    if (isAuthenticated) router.replace('/dashboard');
  }, [isAuthenticated, router]);

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10"
      >
        <div className="absolute right-[12%] top-[12%] h-[520px] w-[520px] rounded-full bg-amber-600/8 blur-[130px]" />
        <div className="absolute bottom-[8%] left-[5%] h-[420px] w-[420px] rounded-full bg-orange-600/6 blur-[110px]" />
      </div>

      <header className="border-b border-white/6rgba(9,9,11,0.82)] backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-900/50">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path
                  d="M1.5 6.5h3.5m3 0h3M1.5 3.5h2m6 0h-3M1.5 9.5h5m3 0h-2"
                  stroke="white"
                  strokeLinecap="round"
                  strokeWidth="1.6"
                />
              </svg>
            </div>
            <span className="text-[15px] font-bold tracking-tight text-white">
              SpeedRead
            </span>
          </Link>

          <Link
            href="/"
            className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-zinc-300 transition-all hover:border-white/20 hover:bg-white/5 hover:text-white"
          >
            Home
          </Link>
        </div>
      </header>

      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
        <div className="text-sm text-zinc-500">
          {isLoading ? 'Checking session...' : 'Sign in to continue.'}
        </div>
      </main>

      {!isLoading && !isAuthenticated ? (
        <AuthModal
          initialMode="login"
          isOpen
          onClose={() => router.push('/')}
        />
      ) : null}
    </div>
  );
}
