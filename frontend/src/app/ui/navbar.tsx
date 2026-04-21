'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import AuthModal, { AuthMode } from './auth-modal';
import { useAuthSession } from '@/lib/supabase/use-auth-session';

export default function Navbar() {
  const router = useRouter();
  const { isAuthenticated } = useAuthSession();
  const [open, setOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [scrolled, setScrolled] = useState(false);

  const openAuth = (mode: AuthMode) => {
    setOpen(false);
    setAuthMode(mode);
    setAuthOpen(true);
  };

  const handleLoginClick = () => {
    if (isAuthenticated) {
      router.push('/dashboard');
      return;
    }

    openAuth('login');
  };

  const handleDashboardClick = () => {
    if (isAuthenticated) {
      setOpen(false);
      router.push('/dashboard');
      return;
    }

    openAuth('login');
  };

  const handleSignupClick = () => {
    if (isAuthenticated) {
      setOpen(false);
      router.push('/dashboard');
      return;
    }

    openAuth('signup');
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 640) setOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-[rgba(9,9,11,0.82)] backdrop-blur-2xl border-b border-white/[0.06] shadow-xl shadow-black/20'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0 shadow-lg shadow-amber-900/50 group-hover:shadow-amber-900/80 transition-shadow">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path
                  d="M1.5 6.5h3.5m3 0h3M1.5 3.5h2m6 0h-3M1.5 9.5h5m3 0h-2"
                  stroke="white"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <span className="font-bold tracking-tight text-white text-[15px]">
              SpeedRead
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-1">
            {[{ label: '', href: '#how' }].map(({ label, href }) => (
              <a
                key={label}
                href={href}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-white rounded-lg hover:bg-white/[0.05] transition-all duration-200"
              >
                {label}
              </a>
            ))}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              type="button"
              onClick={handleLoginClick}
              className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
            >
              Log in
            </button>
            <button
              type="button"
              onClick={handleDashboardClick}
              className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={handleSignupClick}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-400 hover:to-orange-500 transition-all duration-200 shadow-lg shadow-amber-900/40 hover:shadow-amber-900/60"
            >
              Get started free
            </button>
          </div>

          {/* Hamburger — mobile only */}
          <button
            className="sm:hidden relative w-10 h-10 flex items-center justify-center rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-all"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <span className="sr-only">{open ? 'Close' : 'Menu'}</span>
            <div className="w-5 flex flex-col gap-[5px]">
              <span
                className={`block h-[1.5px] bg-current rounded-full origin-center transition-all duration-300 ${
                  open ? 'rotate-45 translate-y-[6.5px]' : ''
                }`}
              />
              <span
                className={`block h-[1.5px] bg-current rounded-full transition-all duration-200 ${
                  open ? 'opacity-0 scale-x-0' : ''
                }`}
              />
              <span
                className={`block h-[1.5px] bg-current rounded-full origin-center transition-all duration-300 ${
                  open ? '-rotate-45 -translate-y-[6.5px]' : ''
                }`}
              />
            </div>
          </button>
        </div>
      </header>

      {/* Mobile menu */}
      <div
        className={`fixed inset-x-0 top-16 z-40 sm:hidden transition-all duration-300 origin-top ${
          open
            ? 'opacity-100 scale-y-100 pointer-events-auto'
            : 'opacity-0 scale-y-95 pointer-events-none'
        }`}
      >
        <div className="bg-[rgba(9,9,11,0.97)] backdrop-blur-2xl border-b border-white/[0.06] px-4 py-3 flex flex-col gap-0.5">
          {[{ label: '', href: '#how' }].map(({ label, href }) => (
            <a
              key={label}
              href={href}
              onClick={() => setOpen(false)}
              className="px-4 py-3 text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/[0.05] rounded-xl transition-all"
            >
              {label}
            </a>
          ))}
          <div className="mt-2 pt-3 border-t border-white/[0.06] flex flex-col gap-2">
            <button
              type="button"
              onClick={handleLoginClick}
              className="w-full px-4 py-3 text-sm font-medium text-zinc-300 border border-white/10 rounded-xl hover:bg-white/[0.05] hover:text-white transition-all"
            >
              Log in
            </button>
            <button
              type="button"
              onClick={handleDashboardClick}
              className="w-full px-4 py-3 text-sm font-medium text-zinc-300 border border-white/10 rounded-xl hover:bg-white/[0.05] hover:text-white transition-all"
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={handleSignupClick}
              className="w-full px-4 py-3 text-sm font-semibold rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-400 hover:to-orange-500 transition-all shadow-lg shadow-amber-900/40"
            >
              Get started free
            </button>
          </div>
        </div>
      </div>

      {authOpen ? (
        <AuthModal
          initialMode={authMode}
          isOpen={authOpen}
          onClose={() => setAuthOpen(false)}
        />
      ) : null}
    </>
  );
}
