'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAuthSession } from '@/lib/supabase/use-auth-session';
import { showToast } from '@/lib/toast-store';

const MOCK_STATS = [
  { label: 'Total sessions', value: '18', detail: '+4 this week' },
  { label: 'Weekly reading', value: '3.8h', detail: 'mock activity' },
  { label: 'Comprehension', value: '94%', detail: 'avg. quiz score' },
  { label: 'Current streak', value: '6', detail: 'days' },
];

const QUICK_ACTIONS = [
  { title: 'Upload PDF', desc: 'Start a reading session from a document.' },
  { title: 'Try sample', desc: 'Practice with curated reading material.' },
  { title: 'Review progress', desc: 'See trends once real sessions exist.' },
];

const RECENT_DOCUMENTS = [
  { title: 'Productivity systems.pdf', progress: '72%', pace: '390 WPM' },
  { title: 'Deep work notes.pdf', progress: '48%', pace: '430 WPM' },
  { title: 'Research digest.pdf', progress: '100%', pace: '455 WPM' },
];

const formatFocusMode = (focusMode?: string | null) => {
  if (!focusMode) return 'Highlight';
  return focusMode.charAt(0).toUpperCase() + focusMode.slice(1);
};

export default function DashboardPage() {
  const router = useRouter();
  const {
    error: authSessionError,
    isAuthenticated,
    isLoading,
    profile,
    profileError,
    status,
    updateDisplayName,
    user,
  } = useAuthSession();
  const [authError, setAuthError] = useState('');
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [displayNameModalOpen, setDisplayNameModalOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  const displayName = profile?.display_name?.trim() ?? '';
  const profileEmail = profile?.email ?? user?.email ?? '';
  const defaultWpm = profile?.default_wpm ?? 250;
  const focusMode = formatFocusMode(profile?.focus_mode);

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
  }, [router, status]);

  useEffect(() => {
    setDisplayNameInput(profile?.display_name ?? '');
  }, [profile?.display_name]);

  useEffect(() => {
    if (!profileError) return;

    setAuthError(profileError);
    showToast({
      message: profileError,
      title: 'Profile unavailable',
      variant: 'error',
    });
  }, [profileError]);

  const handleLogout = async () => {
    setLoggingOut(true);

    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.push('/');
    } catch (error) {
      setAuthError(
        error instanceof Error
          ? error.message
          : 'Unable to log out right now.',
      );
      setLoggingOut(false);
    }
  };

  const handleDisplayNameSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const nextDisplayName = displayNameInput.trim();
    setAuthError('');

    if (!user) {
      const message = 'You need to be logged in to update your profile.';
      setAuthError(message);
      showToast({ message, title: 'Profile update failed', variant: 'error' });
      return;
    }

    if (!nextDisplayName) {
      const message = 'Display name cannot be empty.';
      setAuthError(message);
      showToast({ message, title: 'Profile update failed', variant: 'error' });
      return;
    }

    if (nextDisplayName.length > 100) {
      const message = 'Display name must be 100 characters or fewer.';
      setAuthError(message);
      showToast({ message, title: 'Profile update failed', variant: 'error' });
      return;
    }

    setProfileSaving(true);

    try {
      await updateDisplayName(nextDisplayName);
      setDisplayNameInput(nextDisplayName);
      setDisplayNameModalOpen(false);
      showToast({
        message: 'Display name updated.',
        title: 'Profile saved',
        variant: 'success',
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to update your display name right now.';

      setAuthError(message);
      showToast({ message, title: 'Profile update failed', variant: 'error' });
    } finally {
      setProfileSaving(false);
    }
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#09090b] px-4 text-white">
        <div className="rounded-2xl border border-white/[0.08] bg-[rgba(13,13,18,0.9)] px-6 py-5 text-sm text-zinc-400 shadow-2xl shadow-black/30">
          Loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10"
      >
        <div className="absolute right-[8%] top-[8%] h-[520px] w-[520px] rounded-full bg-amber-600/[0.08] blur-[130px]" />
        <div className="absolute bottom-[8%] left-[4%] h-[420px] w-[420px] rounded-full bg-orange-600/[0.06] blur-[110px]" />
      </div>

      <header className="border-b border-white/[0.06] bg-[rgba(9,9,11,0.82)] backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-900/50">
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

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-zinc-300 transition-all hover:border-white/20 hover:bg-white/[0.05] hover:text-white"
            >
              Home
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-zinc-300 transition-all hover:border-white/20 hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loggingOut ? 'Logging out...' : 'Log out'}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 sm:py-12">
        <section className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[rgba(13,13,18,0.9)] px-6 py-8 shadow-2xl shadow-black/30 sm:px-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-amber-500/15 blur-3xl"
          />
          <div className="relative grid gap-8 lg:grid-cols-[1fr_320px] lg:items-center">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-amber-400">
                Dashboard
              </span>
              <div className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-2">
                <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
                  Welcome back,
                </h1>
                <div className="flex items-center gap-2 pb-1">
                  <span className="bg-gradient-to-r from-amber-300 to-orange-300 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl">
                    {displayName || 'reader'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setDisplayNameInput(displayName);
                      setAuthError('');
                      setDisplayNameModalOpen(true);
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-zinc-400 transition-all hover:border-amber-400/30 hover:bg-amber-500/10 hover:text-amber-200"
                    aria-label="Edit display name"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.6"
                    >
                      <path d="M7.8 2.6 11.4 6.2M2.5 11.5l1-3.7 5.8-5.8a1.3 1.3 0 0 1 1.8 0l.9.9a1.3 1.3 0 0 1 0 1.8l-5.8 5.8-3.7 1Z" />
                    </svg>
                  </button>
                </div>
              </div>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base">
                Keep your next session focused. Your saved preferences are
                ready whenever you start reading.
              </p>
              {authError || authSessionError ? (
                <p className="mt-4 rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {authError || authSessionError}
                </p>
              ) : null}
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                Current setup
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                  <p className="text-xs text-zinc-500">Default pace</p>
                  <p className="mt-2 text-2xl font-bold text-white">
                    {defaultWpm}
                  </p>
                  <p className="text-xs font-semibold text-amber-300">WPM</p>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                  <p className="text-xs text-zinc-500">Focus mode</p>
                  <p className="mt-2 text-2xl font-bold text-white">
                    {focusMode}
                  </p>
                  <p className="text-xs font-semibold text-amber-300">saved</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {MOCK_STATS.map(({ label, value, detail }) => (
              <div
                key={label}
                className="rounded-2xl border border-white/[0.07] bg-[rgba(13,13,18,0.86)] p-5"
              >
                <p className="text-sm text-zinc-500">{label}</p>
                <p className="mt-4 text-3xl font-bold text-white">{value}</p>
                <p className="mt-2 text-xs font-medium text-amber-300">
                  {detail}
                </p>
              </div>
            ))}
          </div>

          <section className="rounded-2xl border border-white/[0.07] bg-[rgba(13,13,18,0.86)] p-6">
            <h2 className="text-xl font-bold text-white">User info</h2>
            <div className="mt-5 space-y-4">
              {[
                ['Display name', displayName || 'Not set'],
                ['Email', profileEmail || 'Not available'],
                ['Default WPM', `${defaultWpm}`],
                ['Focus mode', focusMode],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-4 border-b border-white/[0.06] pb-3 last:border-b-0 last:pb-0"
                >
                  <span className="text-sm text-zinc-500">{label}</span>
                  <span className="text-right text-sm font-medium text-zinc-200">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </section>

        <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <section className="rounded-2xl border border-white/[0.07] bg-[rgba(13,13,18,0.86)] p-6">
            <h2 className="text-xl font-bold text-white">Quick actions</h2>
            <div className="mt-5 grid gap-3">
              {QUICK_ACTIONS.map(({ title, desc }) => (
                <button
                  key={title}
                  type="button"
                  className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-4 text-left transition-all hover:border-amber-400/25 hover:bg-amber-500/[0.06]"
                >
                  <span className="text-sm font-semibold text-white">
                    {title}
                  </span>
                  <span className="mt-1 block text-sm text-zinc-500">
                    {desc}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-white/[0.07] bg-[rgba(13,13,18,0.86)] p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Recent documents
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Mock data until document sessions are connected.
                </p>
              </div>
            </div>

            <div className="grid gap-3">
              {RECENT_DOCUMENTS.map(({ title, progress, pace }) => (
                <div
                  key={title}
                  className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-zinc-200">{title}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {progress} complete
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-amber-300">
                    {pace}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </section>
      </main>

      {displayNameModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="display-name-title"
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" />
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/[0.08] bg-[rgba(13,13,18,0.96)] p-px shadow-2xl shadow-black/60">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-24 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full bg-amber-500/20 blur-3xl"
            />
            <div className="relative rounded-[15px] bg-[rgba(9,9,11,0.9)] px-6 py-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-400">
                    Profile
                  </p>
                  <h2
                    id="display-name-title"
                    className="mt-2 text-xl font-bold text-white"
                  >
                    Change display name
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setDisplayNameModalOpen(false)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-zinc-400 transition-all hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
                  aria-label="Close display name dialog"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="1.8"
                  >
                    <path d="M4.5 4.5l9 9M13.5 4.5l-9 9" />
                  </svg>
                </button>
              </div>

              <form
                className="flex flex-col gap-4"
                onSubmit={handleDisplayNameSubmit}
              >
                <input
                  type="text"
                  value={displayNameInput}
                  onChange={(event) => setDisplayNameInput(event.target.value)}
                  maxLength={100}
                  disabled={profileSaving}
                  className="h-12 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition-all placeholder:text-zinc-600 focus:border-amber-400/50 focus:bg-white/[0.06] focus:shadow-[0_0_0_3px_rgba(245,158,11,0.12)] disabled:cursor-not-allowed disabled:opacity-70"
                  placeholder="Display name"
                />
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="h-12 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 text-sm font-semibold text-white shadow-xl shadow-amber-900/35 transition-all duration-200 hover:from-amber-400 hover:to-orange-500 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {profileSaving ? 'Saving...' : 'Save name'}
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
