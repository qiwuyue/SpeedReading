"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuthSession } from "@/lib/supabase/use-auth-session";
import { showToast } from "@/lib/toast-store";
import { useUploadStore } from "@/lib/store/upload-store";
import { FocusMode, isAnonymousUser } from "@/lib/supabase/users";
import { UploadFile } from "@/app/ui/upload-file";
import ConvertAnonModal from "@/app/ui/convert-anon-modal";

const MOCK_STATS = [
  { label: "Total sessions", value: "18", detail: "+4 this week" },
  { label: "Weekly reading", value: "3.8h", detail: "mock activity" },
  { label: "Comprehension", value: "94%", detail: "avg. quiz score" },
  { label: "Current streak", value: "6", detail: "days" },
];

const QUICK_ACTIONS = [
  { title: "Upload PDF", desc: "Start a reading session from a document." },
  { title: "Try sample", desc: "Practice with curated reading material." },
  { title: "Review progress", desc: "See trends once real sessions exist." },
];

const RECENT_DOCUMENTS = [
  { title: "Productivity systems.pdf", progress: "72%", pace: "390 WPM" },
  { title: "Deep work notes.pdf", progress: "48%", pace: "430 WPM" },
  { title: "Research digest.pdf", progress: "100%", pace: "455 WPM" },
  { title: "Productivity systems.pdf", progress: "72%", pace: "390 WPM" },
];

const formatFocusMode = (focusMode?: FocusMode | null) => {
  if (!focusMode) return "Highlight";
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
    updateDefaultWpm,
    updateDisplayName,
    updateFocusMode,
    user,
  } = useAuthSession();
  const setPendingFile = useUploadStore((state) => state.setPendingFile);
  const [authError, setAuthError] = useState("");
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [displayNameModalOpen, setDisplayNameModalOpen] = useState(false);
  const [focusModeInput, setFocusModeInput] = useState<FocusMode | null>(null);
  const [focusModeModalOpen, setFocusModeModalOpen] = useState(false);
  const [isAnon, setIsAnon] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [wpmModalOpen, setWpmModalOpen] = useState(false);
  const [wpmInput, setWpmInput] = useState("");

  const displayName = profile?.display_name?.trim() ?? "";
  const profileEmail = profile?.email ?? user?.email ?? "";
  const defaultWpm = profile?.default_wpm ?? 250;
  const focusMode = formatFocusMode(profile?.focus_mode);

  const handleQuickAction = (actionTitle: string) => {
    switch (actionTitle) {
      case "Upload PDF":
        setUploadModalOpen(true);
        break;
      case "Try sample":
        showToast({
          message: "Sample reading session coming soon!",
          title: "Try Sample",
          variant: "info",
        });
        break;
      case "Review progress":
        showToast({
          message: "Progress tracking coming soon!",
          title: "Review Progress",
          variant: "info",
        });
        break;
      default:
        break;
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = (reader.result as string).split(",")[1];
        // Store in Zustand
        setPendingFile(base64String, file.name);

        showToast({
          message: `${file.name} uploaded successfully!`,
          title: "Ready to read",
          variant: "success",
        });

        // Close modal and redirect to session page after a brief delay
        setTimeout(() => {
          setUploadModalOpen(false);
          router.push("/session");
        }, 1000);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to upload file";
      showToast({
        message: errorMessage,
        title: "Upload failed",
        variant: "error",
      });
      setIsUploading(false);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [router, status]);

  useEffect(() => {
    // Check if user is anonymous
    const checkAnonStatus = async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const isAnonUser = await isAnonymousUser(supabase);
        setIsAnon(isAnonUser);
      } catch (err) {
        console.error("Failed to check anonymous status:", err);
      }
    };

    if (user) {
      checkAnonStatus();
    }
  }, [user]);

  useEffect(() => {
    setDisplayNameInput(profile?.display_name ?? "");
  }, [profile?.display_name]);

  useEffect(() => {
    if (!profileError) return;

    setAuthError(profileError);
    showToast({
      message: profileError,
      title: "Profile unavailable",
      variant: "error",
    });
  }, [profileError]);

  const handleLogout = async () => {
    setLoggingOut(true);

    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.push("/");
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "Unable to log out right now.",
      );
      setLoggingOut(false);
    }
  };

  const handleFocusModeSubmit = async (event: { preventDefault(): void }) => {
    event.preventDefault();

    if (!focusModeInput) {
      const message = "Focus mode must be selected.";
      showToast({ message, title: "Profile update failed", variant: "error" });
      return;
    }
    const nextFocusMode = focusModeInput as FocusMode;
    setAuthError("");

    if (!user) {
      const message = "You need to be logged in to update your profile.";
      setAuthError(message);
      showToast({ message, title: "Profile update failed", variant: "error" });
      return;
    }

    if (!nextFocusMode) {
      const message = "Focus mode must be selected.";
      setAuthError(message);
      showToast({ message, title: "Profile update failed", variant: "error" });
      return;
    }

    setProfileSaving(true);

    try {
      await updateFocusMode(nextFocusMode);
      setFocusModeInput(nextFocusMode);
      setFocusModeModalOpen(false);
      showToast({
        message: `Focus mode set to ${formatFocusMode(nextFocusMode)}.`,
        title: "Profile saved",
        variant: "success",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to update your focus mode right now.";

      setAuthError(message);
      showToast({ message, title: "Profile update failed", variant: "error" });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleWpmSubmit = async (event: { preventDefault(): void }) => {
    event.preventDefault();

    const wpm = parseInt(wpmInput, 10);
    setAuthError("");

    if (!user) {
      const message = "You need to be logged in to update your profile.";
      setAuthError(message);
      showToast({ message, title: "Profile update failed", variant: "error" });
      return;
    }

    if (!wpmInput || isNaN(wpm) || wpm < 100 || wpm > 1000) {
      const message = "Please enter a WPM value between 100 and 1000.";
      setAuthError(message);
      showToast({ message, title: "Profile update failed", variant: "error" });
      return;
    }

    setProfileSaving(true);

    try {
      await updateDefaultWpm(wpm);
      setWpmModalOpen(false);
      showToast({
        message: `Default pace set to ${wpm} WPM.`,
        title: "Profile saved",
        variant: "success",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to update your reading pace right now.";
      setAuthError(message);
      showToast({ message, title: "Profile update failed", variant: "error" });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleDisplayNameSubmit = async (event: { preventDefault(): void }) => {
    event.preventDefault();

    const nextDisplayName = displayNameInput.trim();
    setAuthError("");

    if (!user) {
      const message = "You need to be logged in to update your profile.";
      setAuthError(message);
      showToast({ message, title: "Profile update failed", variant: "error" });
      return;
    }

    if (!nextDisplayName) {
      const message = "Display name cannot be empty.";
      setAuthError(message);
      showToast({ message, title: "Profile update failed", variant: "error" });
      return;
    }

    if (nextDisplayName.length > 100) {
      const message = "Display name must be 100 characters or fewer.";
      setAuthError(message);
      showToast({ message, title: "Profile update failed", variant: "error" });
      return;
    }

    setProfileSaving(true);

    try {
      await updateDisplayName(nextDisplayName);
      setDisplayNameInput(nextDisplayName);
      setDisplayNameModalOpen(false);
      showToast({
        message: "Display name updated.",
        title: "Profile saved",
        variant: "success",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to update your display name right now.";

      setAuthError(message);
      showToast({ message, title: "Profile update failed", variant: "error" });
    } finally {
      setProfileSaving(false);
    }
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#09090b] px-4 text-white">
        <div className="rounded-2xl border border-white/8 bg-[rgba(13,13,18,0.9)] px-6 py-5 text-sm text-zinc-400 shadow-2xl shadow-black/30">
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
        <div className="absolute right-[8%] top-[8%] h-130 w-130nded-full bg-abg-amber-600/8r-[130px]" />
        <div className="absolute bottom-[8%] left-[4%] h-105420px] rounded-full bg-orange-600/6 blur-[110px]" />
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
              href="/"
              className="hidden rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-zinc-300 transition-all hover:border-white/20 hover:bg-white/5 hover:text-white sm:block sm:px-4"
            >
              Home
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-zinc-300 transition-all hover:border-white/20 hover:bg-white/5r:text-white disabled:cursor-not-allowed disabled:opacity-60 sm:px-4"
            >
              {loggingOut ? "Logging out..." : "Log out"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-4 px-3 py-6 sm:gap-6 sm:px-6 sm:py-10">
        <section className="relative overflow-hidden rounded-3xl border border-white/8 bg-[rgba(13,13,18,0.9)] px-4 py-6 shadow-2xl shadow-black/30 sm:px-8 sm:py-8">
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
                <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
                  Welcome back,
                </h1>
                <div className="flex items-center gap-2 pb-1">
                  <span className="bg-linear-to-r from-amber-300 to-orange-300 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:text-4xl lg:text-5xl">
                    {displayName || "reader"}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setDisplayNameInput(displayName);
                      setAuthError("");
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
                Keep your next session focused. Your saved preferences are ready
                whenever you start reading.
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
                <div className="rounded-xl border border-white/6 bg-black/20 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-zinc-500">Default pace</p>
                    <button
                      type="button"
                      onClick={() => {
                        setWpmInput(String(defaultWpm));
                        setAuthError("");
                        setWpmModalOpen(true);
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 text-zinc-400 transition-all hover:border-amber-400/30 hover:bg-amber-500/10 hover:text-amber-200"
                      aria-label="Edit default reading pace"
                    >
                      <svg
                        width="11"
                        height="11"
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
                  <p className="mt-2 text-2xl font-bold text-white">
                    {defaultWpm}
                  </p>
                  <p className="text-xs font-semibold text-amber-300">WPM</p>
                </div>
                <div className="rounded-xl border border-white/6 bg-black/20 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-zinc-500">Focus mode</p>
                    <button
                      type="button"
                      onClick={() => {
                        setFocusModeInput(
                          profile?.focus_mode || FocusMode.HIGHLIGHT,
                        );
                        setAuthError("");
                        setFocusModeModalOpen(true);
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 text-zinc-400 transition-all hover:border-amber-400/30 hover:bg-amber-500/10 hover:text-amber-200"
                      aria-label="Edit focus mode"
                    >
                      <svg
                        width="11"
                        height="11"
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
                  <p className="mt-2 text-2xl font-bold text-white">
                    {focusMode}
                  </p>
                  <p className="text-xs font-semibold text-amber-300">saved</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:gap-4 lg:grid-cols-[1fr_360px]">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            {MOCK_STATS.map(({ label, value, detail }) => (
              <div
                key={label}
                className="rounded-2xl border border-white/[0.07] bg-[rgba(13,13,18,0.86)] p-4 sm:p-5"
              >
                <p className="text-xs text-zinc-500 sm:text-sm">{label}</p>
                <p className="mt-3 text-2xl font-bold text-white sm:mt-4 sm:text-3xl">
                  {value}
                </p>
                <p className="mt-1 text-xs font-medium text-amber-300 sm:mt-2">
                  {detail}
                </p>
              </div>
            ))}
          </div>

          <section className="rounded-2xl border border-white/[0.07] bg-[rgba(13,13,18,0.86)] p-4 sm:p-6">
            <h2 className="text-lg font-bold text-white sm:text-xl">
              User info
            </h2>
            <div className="mt-5 space-y-4">
              {[
                ["Display name", displayName || "Not set"],
                ["Email", profileEmail || "Not available"],
                ["Default WPM", `${defaultWpm}`],
                ["Focus mode", focusMode],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-4 border-b border-white/6 last:border-b-0 last:pb-0"
                >
                  <span className="text-sm text-zinc-500">{label}</span>
                  <span className="max-w-[55%] truncate text-right text-sm font-medium text-zinc-200">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </section>

        <section className="grid gap-3 sm:gap-4 lg:grid-cols-[360px_1fr]">
          <section className="rounded-2xl border border-white/[0.07] bg-[rgba(13,13,18,0.86)] p-4 sm:p-6">
            <h2 className="text-lg font-bold text-white sm:text-xl">
              Quick actions
            </h2>
            <div className="mt-5 grid gap-3">
              {QUICK_ACTIONS.map(({ title, desc }) => (
                <button
                  key={title}
                  type="button"
                  onClick={() => handleQuickAction(title)}
                  className="rounded-xl border hover:cursor-pointer border-white/6 bg-white/3 px-4 py-4 text-left transition-all hover:border-amber-400/25 hover:bg-amber-500/6"
                >
                  <span className="text-sm cursor-pointer font-semibold text-white">
                    {title}
                  </span>
                  <span className="mt-1 block cursor-pointer text-sm text-zinc-500">
                    {desc}
                  </span>
                </button>
              ))}

              {isAnon && (
                <button
                  type="button"
                  onClick={() => setConvertModalOpen(true)}
                  className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-4 text-left transition-all hover:border-green-400/50 hover:bg-green-500/15"
                >
                  <span className="text-sm font-semibold text-green-200">
                    ✨ Create Account
                  </span>
                  <span className="mt-1 block text-sm text-green-100/70">
                    Convert to permanent login
                  </span>
                </button>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-white/[0.07] bg-[rgba(13,13,18,0.86)] p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-4 sm:mb-5">
              <div>
                <h2 className="text-lg font-bold text-white sm:text-xl">
                  Recent documents
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {RECENT_DOCUMENTS.length === 0
                    ? "Start your first reading session to see documents here."
                    : "Mock data until document sessions are connected."}
                </p>
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto sm:max-h-96">
              {RECENT_DOCUMENTS.length === 0 ? (
                <div className="rounded-xl border border-white/8 bg-white/3 p-8 text-center">
                  <p className="text-sm text-zinc-400">
                    No recent reads or documents yet.
                  </p>
                  <p className="mt-2 text-xs text-zinc-500">
                    Upload a PDF or try a sample to get started.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {RECENT_DOCUMENTS.map(({ title, progress, pace }, index) => (
                    <div
                      key={index}
                      className="flex flex-col gap-3 rounded-xl border border-white/6 bg-white/3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-zinc-200">
                          {title}
                        </p>
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
              )}
            </div>
          </section>
        </section>
      </main>

      {wpmModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="wpm-title"
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" />
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/8 bg-[rgba(13,13,18,0.96)] p-px shadow-2xl shadow-black/60">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-24 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full bg-amber-500/20 blur-3xl"
            />
            <div className="relative rounded-[15px] bg-[rgba(9,9,11,0.9)] px-6 py-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-400">
                    Reading pace
                  </p>
                  <h2
                    id="wpm-title"
                    className="mt-2 text-xl font-bold text-white"
                  >
                    Set default WPM
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setWpmModalOpen(false)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-zinc-400 transition-all hover:border-white/20 hover:bg-white/6 hover:text-white"
                  aria-label="Close WPM dialog"
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

              <form className="flex flex-col gap-4" onSubmit={handleWpmSubmit}>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">
                      Words per minute
                    </span>
                    <span className="text-sm font-bold text-amber-300">
                      {wpmInput || "—"} WPM
                    </span>
                  </div>
                  <input
                    type="range"
                    min={100}
                    max={1000}
                    step={10}
                    value={wpmInput || defaultWpm}
                    onChange={(e) => setWpmInput(e.target.value)}
                    disabled={profileSaving}
                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-amber-400 disabled:cursor-not-allowed disabled:opacity-70"
                  />
                  <div className="flex justify-between text-[11px] text-zinc-600">
                    <span>100</span>
                    <span>550</span>
                    <span>1000</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {[150, 250, 350, 500].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setWpmInput(String(preset))}
                      disabled={profileSaving}
                      className="flex-1 rounded-lg border border-white/10 py-2 text-xs font-semibold text-zinc-300 transition-all hover:border-amber-400/30 hover:bg-amber-500/10 hover:text-amber-200 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="h-12 rounded-xl bg-linear-to-r from-amber-500 to-orange-600 px-6 text-sm font-semibold text-white shadow-xl shadow-amber-900/35 transition-all duration-200 hover:from-amber-400 hover:to-orange-500 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {profileSaving ? "Saving..." : "Save pace"}
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {focusModeModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="focus-mode-title"
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" />
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/8 bg-[rgba(13,13,18,0.96)] p-px shadow-2xl shadow-black/60">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-24 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full bg-amber-500/20 blur-3xl"
            />
            <div className="relative rounded-[15px] bg-[rgba(9,9,11,0.9)] px-6 py-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-400">
                    Reading
                  </p>
                  <h2
                    id="focus-mode-title"
                    className="mt-2 text-xl font-bold text-white"
                  >
                    Select focus mode
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setFocusModeModalOpen(false)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-zinc-400 transition-all hover:border-white/20 hover:bg-white/6 hover:text-white"
                  aria-label="Close focus mode dialog"
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
                onSubmit={handleFocusModeSubmit}
              >
                <div className="flex flex-col gap-3">
                  {[
                    { value: "highlight", label: "Highlight" },
                    { value: "dot", label: "Dot" },
                    { value: "none", label: "None" },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFocusModeInput(value as FocusMode)}
                      disabled={profileSaving}
                      className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
                        focusModeInput === value
                          ? "border-amber-400/50 bg-amber-500/15 text-amber-200"
                          : "border-white/10 bg-white/3 text-zinc-300 hover:border-amber-400/25 hover:bg-amber-500/6 hover:text-amber-200"
                      } disabled:cursor-not-allowed disabled:opacity-70`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="h-12 rounded-xl bg-linear-to-r from-amber-500 to-orange-600 px-6 text-sm font-semibold text-white shadow-xl shadow-amber-900/35 transition-all duration-200 hover:from-amber-400 hover:to-orange-500 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {profileSaving ? "Saving..." : "Save mode"}
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {displayNameModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="display-name-title"
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" />
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/8 bg-[rgba(13,13,18,0.96)] p-px shadow-2xl shadow-black/60">
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
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-zinc-400 transition-all hover:border-white/20 hover:bg-white/6 hover:text-white"
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
                  className="h-12 rounded-xl border border-white/10 bg-white/4 px-4 text-sm text-white outline-none transition-all placeholder:text-zinc-600 focus:border-amber-400/50 focus:bg-white/6 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.12)] disabled:cursor-not-allowed disabled:opacity-70"
                  placeholder="Display name"
                />
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="h-12 rounded-xl bg-linear-to-r from-amber-500 to-orange-600 px-6 text-sm font-semibold text-white shadow-xl shadow-amber-900/35 transition-all duration-200 hover:from-amber-400 hover:to-orange-500 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {profileSaving ? "Saving..." : "Save name"}
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {uploadModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-title"
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" />
          <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-white/8 bg-[rgba(13,13,18,0.96)] p-px shadow-2xl shadow-black/60">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-24 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full bg-amber-500/20 blur-3xl"
            />
            <div className="relative rounded-[15px] bg-[rgba(9,9,11,0.9)] px-6 py-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-400">
                    Reading Session
                  </p>
                  <h2
                    id="upload-title"
                    className="mt-2 text-xl font-bold text-white"
                  >
                    Upload PDF
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => !isUploading && setUploadModalOpen(false)}
                  disabled={isUploading}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-zinc-400 transition-all hover:border-white/20 hover:bg-white/6 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Close upload dialog"
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

              <UploadFile
                onFileSelect={(file) => console.log("Selected:", file)}
                onUpload={handleFileUpload}
                maxSize={50}
                disabled={isUploading}
              />
            </div>
          </div>
        </div>
      ) : null}

      <ConvertAnonModal
        isOpen={convertModalOpen}
        onClose={() => setConvertModalOpen(false)}
      />
    </div>
  );
}
