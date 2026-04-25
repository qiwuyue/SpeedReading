import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UploadStore {
  pendingFile: string | null;
  pendingFileName: string | null;
  setPendingFile: (file: string | null, fileName: string | null) => void;
  clearPendingFile: () => void;
}

export const useUploadStore = create<UploadStore>()(
  persist(
    (set) => ({
      pendingFile: null,
      pendingFileName: null,
      setPendingFile: (file: string | null, fileName: string | null) =>
        set({ pendingFile: file, pendingFileName: fileName }),
      clearPendingFile: () => set({ pendingFile: null, pendingFileName: null }),
    }),
    {
      name: "upload-store",
    },
  ),
);
