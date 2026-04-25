"use client";

export const runtime = "edge";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthSession } from "@/lib/supabase/use-auth-session";

type SessionPageProps = {
  params: {
    id: string;
  };
};

export default function ReadingSessionPage({ params }: SessionPageProps) {
  const router = useRouter();
  const { status, profile } = useAuthSession();
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [wpm, setWpm] = useState(profile?.default_wpm || 250);

  // Sample text for demonstration
  const sampleText = `The quick brown fox jumps over the lazy dog. This is a sample reading session. 
  You can adjust your reading speed using the controls below. The system will highlight each word 
  as you progress through the text. This helps you maintain focus and track your reading pace. 
  Try different focus modes to see which works best for you.`;

  const words = sampleText.split(/\s+/).filter((word) => word.length > 0);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
    setIsLoading(false);
  }, [router, status]);

  useEffect(() => {
    if (isPaused || !words.length) return;

    const msPerWord = 60000 / wpm;
    const timer = setTimeout(() => {
      if (currentWordIndex < words.length - 1) {
        setCurrentWordIndex(currentWordIndex + 1);
      } else {
        setIsPaused(true);
      }
    }, msPerWord);

    return () => clearTimeout(timer);
  }, [currentWordIndex, isPaused, wpm, words.length]);

  if (isLoading || status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#09090b] px-4 text-white">
        <div className="rounded-2xl border border-white/8 bg-[rgba(13,13,18,0.9)] px-6 py-5 text-sm text-zinc-400 shadow-2xl shadow-black/30">
          Loading reading session...
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
        <div className="absolute right-[8%] top-[8%] h-130 w-130 rounded-full bg-amber-500/15 blur-3xl" />
        <div className="absolute bottom-[8%] left-[4%] h-[420px] w-[420px] rounded-full bg-orange-600/6 blur-[110px]" />
      </div>

      {/* Header */}
      <header className="border-b border-white/6 bg-[rgba(9,9,11,0.82)] backdrop-blur-2xl">
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

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-zinc-300 transition-all hover:border-white/20 hover:bg-white/5 hover:text-white sm:px-4"
            >
              Exit Session
            </Link>
          </div>
        </div>
      </header>

      {/* Main Reading Area */}
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        {/* Session Info */}
        <div className="mb-8 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/[0.07] bg-[rgba(13,13,18,0.86)] p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">
              Reading Speed
            </p>
            <p className="mt-2 text-xl font-bold text-amber-300">{wpm} WPM</p>
          </div>
          <div className="rounded-xl border border-white/[0.07] bg-[rgba(13,13,18,0.86)] p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">
              Focus Mode
            </p>
            <p className="mt-2 text-xl font-bold text-white">
              {profile?.focus_mode
                ? profile.focus_mode.charAt(0).toUpperCase() +
                  profile.focus_mode.slice(1)
                : "Highlight"}
            </p>
          </div>
          <div className="rounded-xl border border-white/[0.07] bg-[rgba(13,13,18,0.86)] p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">
              Progress
            </p>
            <p className="mt-2 text-xl font-bold text-emerald-400">
              {currentWordIndex + 1} / {words.length}
            </p>
          </div>
        </div>

        {/* Reading Display */}
        <div className="relative overflow-hidden rounded-3xl border border-white/8 bg-[rgba(13,13,18,0.9)] p-8 shadow-2xl shadow-black/30 sm:p-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-amber-500/15 blur-3xl"
          />

          <div className="relative mb-12 min-h-32">
            <div className="flex flex-wrap gap-2 text-center text-3xl font-bold leading-relaxed sm:text-4xl">
              {words.map((word, index) => (
                <span
                  key={index}
                  className={`transition-all duration-200 ${
                    index === currentWordIndex
                      ? "text-amber-400 scale-110"
                      : index < currentWordIndex
                        ? "text-zinc-500"
                        : "text-white/60"
                  }`}
                >
                  {word}
                </span>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="mt-8 flex flex-col gap-4">
            {/* Progress Bar */}
            <div className="w-full">
              <div className="h-1 w-full rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-linear-to-r from-amber-500 to-orange-600 transition-all duration-300"
                  style={{
                    width: `${((currentWordIndex + 1) / words.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className="flex-1 rounded-lg bg-linear-to-r from-amber-500 to-orange-600 px-4 py-2 font-semibold text-white transition-all hover:from-amber-400 hover:to-orange-500 sm:flex-none sm:px-6"
                >
                  {isPaused ? "Resume" : "Pause"}
                </button>
                <button
                  onClick={() =>
                    setCurrentWordIndex(Math.max(0, currentWordIndex - 1))
                  }
                  className="rounded-lg border border-white/10 px-4 py-2 font-semibold text-zinc-300 transition-all hover:border-white/20 hover:bg-white/5 hover:text-white"
                >
                  ← Back
                </button>
                <button
                  onClick={() =>
                    setCurrentWordIndex(
                      Math.min(words.length - 1, currentWordIndex + 1),
                    )
                  }
                  className="rounded-lg border border-white/10 px-4 py-2 font-semibold text-zinc-300 transition-all hover:border-white/20 hover:bg-white/5 hover:text-white"
                >
                  Next →
                </button>
              </div>

              {/* WPM Adjustment */}
              <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-2">
                <label htmlFor="wpm" className="text-sm text-zinc-400">
                  Speed:
                </label>
                <input
                  id="wpm"
                  type="range"
                  min="100"
                  max="500"
                  value={wpm}
                  onChange={(e) => setWpm(Number(e.target.value))}
                  className="w-20 cursor-pointer"
                />
                <span className="min-w-12 text-right text-sm font-semibold text-amber-300">
                  {wpm}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Session Complete Message */}
        {currentWordIndex === words.length - 1 && isPaused && (
          <div className="mt-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
            <p className="text-lg font-bold text-emerald-400">
              Session Complete! 🎉
            </p>
            <p className="mt-2 text-sm text-zinc-400">
              You've finished reading this session. Great job!
            </p>
            <div className="mt-4 flex gap-3 justify-center">
              <Link
                href="/dashboard"
                className="rounded-lg bg-linear-to-r from-amber-500 to-orange-600 px-4 py-2 font-semibold text-white transition-all hover:from-amber-400 hover:to-orange-500"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
