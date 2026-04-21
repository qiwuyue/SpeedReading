'use client';

import { useEffect } from 'react';
import { useToastStore, type Toast } from '@/lib/toast-store';

const TOAST_TIMEOUT_MS = 3600;

const variantClassNames: Record<Toast['variant'], string> = {
  error: 'border-rose-400/25 bg-rose-500/10 text-rose-100',
  info: 'border-white/[0.08] bg-[rgba(13,13,18,0.96)] text-zinc-100',
  success: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100',
};

const accentClassNames: Record<Toast['variant'], string> = {
  error: 'bg-rose-300',
  info: 'bg-amber-300',
  success: 'bg-emerald-300',
};

function ToastItem({ toast }: { toast: Toast }) {
  const dismissToast = useToastStore((state) => state.dismissToast);

  useEffect(() => {
    const timeout = window.setTimeout(
      () => dismissToast(toast.id),
      TOAST_TIMEOUT_MS,
    );

    return () => window.clearTimeout(timeout);
  }, [dismissToast, toast.id]);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border px-4 py-3 pr-10 shadow-2xl shadow-black/40 backdrop-blur-2xl ${variantClassNames[toast.variant]}`}
      role="status"
    >
      <div
        aria-hidden="true"
        className={`absolute inset-y-3 left-0 w-1 rounded-r-full ${accentClassNames[toast.variant]}`}
      />
      {toast.title ? (
        <p className="text-sm font-semibold text-white">{toast.title}</p>
      ) : null}
      <p className="text-sm leading-5 text-current">{toast.message}</p>
      <button
        type="button"
        onClick={() => dismissToast(toast.id)}
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
        aria-label="Dismiss notification"
      >
        <svg
          width="15"
          height="15"
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
  );
}

export default function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts);

  if (!toasts.length) return null;

  return (
    <div
      className="fixed right-4 top-4 z-[80] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3 sm:right-6 sm:top-6"
      aria-live="polite"
      aria-relevant="additions text"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
