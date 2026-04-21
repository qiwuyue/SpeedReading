'use client';

import { create } from 'zustand';

export type ToastVariant = 'success' | 'error' | 'info';

export type Toast = {
  id: string;
  message: string;
  title?: string;
  variant: ToastVariant;
};

type ToastInput = {
  message: string;
  title?: string;
  variant?: ToastVariant;
};

type ToastState = {
  toasts: Toast[];
  dismissToast: (id: string) => void;
  showToast: (toast: ToastInput) => string;
};

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
  showToast: ({ message, title, variant = 'info' }) => {
    const id = crypto.randomUUID();

    set((state) => ({
      toasts: [...state.toasts, { id, message, title, variant }],
    }));

    return id;
  },
}));

export function showToast(toast: ToastInput) {
  return useToastStore.getState().showToast(toast);
}
