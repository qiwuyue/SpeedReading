"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthSession } from "@/lib/supabase/use-auth-session";
import { showToast } from "@/lib/toast-store";
import { useUploadStore } from "@/lib/store/upload-store";
// import pdfjsLib from "pdfjs-dist";
import mupdf from "mupdf"

export default function SessionPage() {
  const router = useRouter();
  const { status, profile, session } = useAuthSession();
  const [isStarting, setIsStarting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasFile, setHasFile] = useState(false);
  const { pendingFile, pendingFileName } = useUploadStore();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }

    if (status === "loading") {
      return;
    }

    // Check if file exists in Zustand store
    if (!pendingFile || !pendingFileName) {
      // No file found, redirect to dashboard
      showToast({
        message: "No file found. Please upload a file first.",
        variant: "error",
      });

      router.replace("/dashboard");
      return;
    }

    setHasFile(true);
    setIsLoading(false);
  }, [router, status, pendingFile, pendingFileName]);

  const handleStartReading = async () => {
    try {
      setIsStarting(true);

      // Get the auth token from session
      console.log("Starting session with auth status:", status, "hasSession:", Boolean(session));
      const token = session?.access_token;
      if (!token) {
        showToast({
          message: "Authentication required",
          variant: "error",
        });
        return;
      }
      function parsePageNumbers(content: Uint8Array<ArrayBufferLike>) {
        const doc = mupdf.Document.openDocument(content);
        return doc.countPages()
      }

      // Use file from Zustand store
      if (!pendingFile || !pendingFileName) {
        showToast({
          message: "No file found. Please upload a file first.",
          variant: "error",
        });
        setIsStarting(false);
        return;
      }
      const page = await parsePageNumbers(pendingFile)
      const formData = new FormData();
      formData.append(
        "file",
        new Blob([pendingFile], { type: "application/pdf" }),
        pendingFileName,
      );
      formData.append("documentName", pendingFileName);
      formData.append("pagesLength", String(page));

      // Call the sessions API to create a new session
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to create session");
      }

      const { sessionId } = await response.json();

      // Navigate to the session page with the session ID
      router.push(`/session/${sessionId}`);
    } catch (error) {
      console.log("Error starting session:", error);
      showToast({
        message: `Failed to start reading session`,
        variant: "error",
      });
      setIsStarting(false);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#09090b] px-4 text-white">
        <div className="rounded-2xl border border-white/8 bg-[rgba(13,13,18,0.9)] px-6 py-5 text-sm text-zinc-400 shadow-2xl shadow-black/30">
          Preparing your reading session...
        </div>
      </div>
    );
  }

  if (!hasFile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#09090b] px-4 text-white">
        <div className="rounded-2xl border border-white/8 bg-[rgba(13,13,18,0.9)] px-6 py-5 text-sm text-zinc-400 shadow-2xl shadow-black/30">
          Redirecting...
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
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-3 py-10 sm:px-6">
        <section className="relative overflow-hidden rounded-3xl border border-white/8 bg-[rgba(13,13,18,0.9)] px-4 py-8 shadow-2xl shadow-black/30 sm:px-8 sm:py-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-amber-500/15 blur-3xl"
          />
          <div className="relative">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-amber-400">
              Reading Session
            </span>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Your PDF is ready
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
              Start reading with your configured preferences. Use your saved WPM
              and focus mode settings to customize your experience.
            </p>

            <div className="mt-8 grid gap-3 sm:gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-white/[0.07] bg-[rgba(13,13,18,0.86)] p-6">
                <p className="text-sm text-zinc-500">Target WPM</p>
                <p className="mt-2 text-2xl font-bold text-amber-300">
                  {profile?.default_wpm || 250} WPM
                </p>
              </div>
              <div className="rounded-2xl border border-white/[0.07] bg-[rgba(13,13,18,0.86)] p-6">
                <p className="text-sm text-zinc-500">Focus mode</p>
                <p className="mt-2 text-2xl font-bold text-white">
                  {profile?.focus_mode
                    ? profile.focus_mode.charAt(0).toUpperCase() +
                      profile.focus_mode.slice(1)
                    : "Highlight"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/[0.07] bg-[rgba(13,13,18,0.86)] p-6">
                <p className="text-sm text-zinc-500">Status</p>
                <p className="mt-2 text-2xl font-bold text-emerald-400">
                  Ready
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <button
                type="button"
                onClick={handleStartReading}
                disabled={isStarting}
                className="rounded-xl bg-linear-to-r from-amber-500 to-orange-600 px-6 py-3 font-semibold text-white shadow-xl shadow-amber-900/35 transition-all duration-200 hover:from-amber-400 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isStarting ? "Starting..." : "Start Reading"}
              </button>
              <Link
                href="/dashboard"
                className="rounded-xl border border-white/10 px-6 py-3 text-center font-semibold text-zinc-300 transition-all hover:border-white/20 hover:bg-white/5 hover:text-white"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/[0.07] bg-[rgba(13,13,18,0.86)] p-6 sm:p-8">
          <h2 className="text-lg font-bold text-white sm:text-xl">
            Session Features
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              {
                title: "Smart Pace Control",
                desc: "Adjust reading speed on the fly with real-time feedback.",
              },
              {
                title: "Focus Modes",
                desc: "Choose between highlight, dot, or none for optimal focus.",
              },
              {
                title: "Comprehension Check",
                desc: "Test your understanding with adaptive quizzes.",
              },
              {
                title: "Session Tracking",
                desc: "Monitor your progress and stats in real-time.",
              },
            ].map(({ title, desc }) => (
              <div
                key={title}
                className="rounded-xl border border-white/6 bg-white/3 p-4"
              >
                <p className="font-semibold text-white">{title}</p>
                <p className="mt-1 text-sm text-zinc-400">{desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
