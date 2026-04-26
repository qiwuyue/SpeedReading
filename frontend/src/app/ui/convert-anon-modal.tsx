"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { convertAnonToAuthenticated } from "@/lib/supabase/users";
import { showToast } from "@/lib/toast-store";

type ConvertAnonModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type FormErrors = {
  email?: string;
  password?: string;
  confirmPassword?: string;
  form?: string;
};

const inputClassName =
  "h-12 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-base sm:text-sm text-white outline-none transition-all placeholder:text-zinc-600 focus:border-amber-400/50 focus:bg-white/[0.06] focus:shadow-[0_0_0_3px_rgba(245,158,11,0.12)]";

export default function ConvertAnonModal({
  isOpen,
  onClose,
}: ConvertAnonModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const validate = () => {
    const nextErrors: FormErrors = {};
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

    if (!confirmPassword) {
      nextErrors.confirmPassword = "Please confirm your password.";
    } else if (confirmPassword !== password) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validate()) return;

    setLoading(true);
    setErrors({});

    const trimmedEmail = email.trim();

    try {
      const supabase = createSupabaseBrowserClient();
      await convertAnonToAuthenticated(supabase, trimmedEmail, password);

      showToast({
        title: "Account upgraded",
        message: "Your guest account has been converted to a full account!",
        variant: "success",
      });

      // Clear form and close modal
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      onClose();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to upgrade account.";

      setErrors({ form: errorMessage });
      showToast({
        title: "Upgrade failed",
        message: errorMessage,
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="convert-modal-title"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/8 bg-[rgba(13,13,18,0.96)] p-px shadow-2xl shadow-black/60">
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
                Upgrade account
              </p>
              <h2
                id="convert-modal-title"
                className="mt-2 text-2xl font-bold tracking-tight text-white"
              >
                Set up your login
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-zinc-400 transition-all hover:border-white/20 hover:bg-white/6 hover:text-white"
              aria-label="Close dialog"
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
            <p className="text-sm text-zinc-400">
              Convert your guest account to a permanent account so you can log
              back in anytime.
            </p>

            {errors.form ? (
              <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {errors.form}
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
                placeholder="your@email.com"
                disabled={loading}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={
                  errors.email ? "convert-email-error" : undefined
                }
              />
              {errors.email ? (
                <span
                  id="convert-email-error"
                  className="text-xs text-rose-300"
                >
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
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={inputClassName}
                placeholder="Create a password (min 8 characters)"
                disabled={loading}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={
                  errors.password ? "convert-password-error" : undefined
                }
              />
              {errors.password ? (
                <span
                  id="convert-password-error"
                  className="text-xs text-rose-300"
                >
                  {errors.password}
                </span>
              ) : null}
            </label>

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
                    ? "convert-confirm-password-error"
                    : undefined
                }
              />
              {errors.confirmPassword ? (
                <span
                  id="convert-confirm-password-error"
                  className="text-xs text-rose-300"
                >
                  {errors.confirmPassword}
                </span>
              ) : null}
            </label>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 h-12 rounded-xl bg-linear-to-r from-amber-500 to-orange-600 text-sm font-semibold text-white shadow-xl shadow-amber-900/35 transition-all duration-200 hover:from-amber-400 hover:to-orange-500 hover:shadow-amber-900/55 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Upgrading..." : "Upgrade to full account"}
            </button>
          </form>

          <p className="mt-5 border-t border-white/6 pt-5 text-center text-xs text-zinc-500">
            Your reading progress and settings will be preserved.
          </p>
        </div>
      </div>
    </div>
  );
}
