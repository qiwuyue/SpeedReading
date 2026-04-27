"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { refreshAuthState } from "@/lib/supabase/auth-store";
import { updateUserLastLogin, upsertUserProfile } from "@/lib/supabase/users";

export type AuthMode = "login" | "signup";

type AuthModalProps = {
  initialMode: AuthMode;
  isOpen: boolean;
  onClose: () => void;
};

type AuthErrors = {
  email?: string;
  password?: string;
  confirmPassword?: string;
  form?: string;
};

const inputClassName =
  "h-12 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-base sm:text-sm text-white outline-none transition-all placeholder:text-zinc-600 focus:border-amber-400/50 focus:bg-white/[0.06] focus:shadow-[0_0_0_3px_rgba(245,158,11,0.12)]";

export default function AuthModal({
  initialMode,
  isOpen,
  onClose,
}: AuthModalProps) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<AuthErrors>({});
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const isSignup = mode === "signup";
  const title = isSignup ? "Create account" : "Log in";
  const eyebrow = isSignup ? "Start reading faster" : "Welcome back";
  const submitLabel = isSignup ? "Create account" : "Log in";

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setErrors({});
    setSuccessMessage("");
    setConfirmPassword("");
  };

  const validate = () => {
    const nextErrors: AuthErrors = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      nextErrors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!password) {
      nextErrors.password = "Password is required.";
    } else if (password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters.";
    }

    if (isSignup && !confirmPassword) {
      nextErrors.confirmPassword = "Please confirm your password.";
    } else if (isSignup && confirmPassword !== password) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleAuthSuccess = async (
    supabase: ReturnType<typeof createSupabaseBrowserClient>,
    user: User,
  ) => {
    try {
      await upsertUserProfile(supabase, { user });
      await updateUserLastLogin(supabase, user);
    } catch (profileError) {
      setErrors({
        form:
          profileError instanceof Error
            ? profileError.message
            : "Logged in, but the user profile could not be updated.",
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccessMessage("");

    if (!validate()) return;

    setLoading(true);
    setErrors({});

    const trimmedEmail = email.trim();
    let supabase: ReturnType<typeof createSupabaseBrowserClient>;

    try {
      supabase = createSupabaseBrowserClient();
    } catch (error) {
      setLoading(false);
      setErrors({
        form:
          error instanceof Error
            ? error.message
            : "Supabase is not configured yet.",
      });
      return;
    }

    if (isSignup) {
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
      });

      setLoading(false);

      if (error) {
        setErrors({ form: error.message });
        return;
      }

      if (data.user && data.session) {
        try {
          await upsertUserProfile(supabase, { user: data.user });
        } catch (profileError) {
          setErrors({
            form:
              profileError instanceof Error
                ? profileError.message
                : "Account created, but the user profile could not be saved.",
          });
          return;
        }
      }

      if (data.session) {
        await refreshAuthState();
        router.replace("/dashboard");
        router.refresh();
        return;
      }

      setSuccessMessage(
        "Check your email to confirm your account, then come back to log in.",
      );
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    setLoading(false);

    if (error) {
      setErrors({ form: error.message });
      return;
    }

    if (data.user) {
      const success = await handleAuthSuccess(supabase, data.user);
      if (!success) {
        setLoading(false);
        return;
      }
    }

    await refreshAuthState();
    router.replace("/dashboard");
    router.refresh();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/[0.08] bg-[rgba(13,13,18,0.96)] p-px shadow-2xl shadow-black/60">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-amber-500/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-28 -right-16 h-56 w-56 rounded-full bg-orange-500/15 blur-3xl"
        />
        <div className="relative rounded-[15px] bg-[rgba(9,9,11,0.88)] px-6 py-6 sm:px-7">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-400">
                {eyebrow}
              </p>
              <h2
                id="auth-modal-title"
                className="mt-2 text-2xl font-bold tracking-tight text-white"
              >
                {title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-zinc-400 transition-all hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
              aria-label="Close auth dialog"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <path d="M4.5 4.5l9 9M13.5 4.5l-9 9" />
              </svg>
            </button>
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            {errors.form ? (
              <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {errors.form}
              </div>
            ) : null}

            {successMessage ? (
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                {successMessage}
              </div>
            ) : null}

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-zinc-300">Email</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={inputClassName}
                placeholder="you@example.com"
                disabled={loading}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "auth-email-error" : undefined}
              />
              {errors.email ? (
                <span id="auth-email-error" className="text-xs text-rose-300">
                  {errors.email}
                </span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-zinc-300">
                Password
              </span>
              <input
                type="password"
                autoComplete={isSignup ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={inputClassName}
                placeholder="Enter your password"
                disabled={loading}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={
                  errors.password ? "auth-password-error" : undefined
                }
              />
              {errors.password ? (
                <span
                  id="auth-password-error"
                  className="text-xs text-rose-300"
                >
                  {errors.password}
                </span>
              ) : null}
            </label>

            {isSignup ? (
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-zinc-300">
                  Confirm password
                </span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className={inputClassName}
                  placeholder="Confirm your password"
                  disabled={loading}
                  aria-invalid={Boolean(errors.confirmPassword)}
                  aria-describedby={
                    errors.confirmPassword
                      ? "auth-confirm-password-error"
                      : undefined
                  }
                />
                {errors.confirmPassword ? (
                  <span
                    id="auth-confirm-password-error"
                    className="text-xs text-rose-300"
                  >
                    {errors.confirmPassword}
                  </span>
                ) : null}
              </label>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 h-12 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-sm font-semibold text-white shadow-xl shadow-amber-900/35 transition-all duration-200 hover:from-amber-400 hover:to-orange-500 hover:shadow-amber-900/55 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Please wait..." : submitLabel}
            </button>

            <button
              type="button"
              onClick={async () => {
                setSuccessMessage("");
                setErrors({});
                setLoading(true);

                try {
                  const supabase = createSupabaseBrowserClient();
                  const { data, error } =
                    await supabase.auth.signInAnonymously();

                  if (error) {
                    setLoading(false);
                    setErrors({ form: error.message });
                    return;
                  }

                  if (data.user) {
                    const success = await handleAuthSuccess(
                      supabase,
                      data.user,
                    );
                    if (!success) {
                      setLoading(false);
                      return;
                    }
                  }

                  await refreshAuthState();
                  router.replace("/dashboard");
                  router.refresh();
                } catch (error) {
                  setLoading(false);
                  setErrors({
                    form:
                      error instanceof Error
                        ? error.message
                        : "Failed to continue as guest.",
                  });
                }
              }}
              disabled={loading}
              className="mt-3 h-12 rounded-xl border border-white/20 bg-white/[0.04] text-sm font-semibold text-white transition-all duration-200 hover:border-white/40 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Please wait..." : "Continue as Guest"}
            </button>
          </form>

          <div className="mt-5 border-t border-white/[0.06] pt-5 text-center text-sm text-zinc-500">
            {isSignup ? (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="font-semibold text-amber-300 transition-colors hover:text-amber-200"
                >
                  Log in
                </button>
              </>
            ) : (
              <>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  className="font-semibold text-amber-300 transition-colors hover:text-amber-200"
                >
                  Sign up
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
