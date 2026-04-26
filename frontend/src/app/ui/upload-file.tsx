"use client";

import { useRef, useState } from "react";
import { showToast } from "@/lib/toast-store";

interface UploadFileProps {
  onFileSelect?: (file: File) => void;
  onUpload?: (file: File) => Promise<void>;
  maxSize?: number; // in MB
  accept?: string;
  disabled?: boolean;
}

export function UploadFile({
  onFileSelect,
  onUpload,
  maxSize = 50,
  accept = ".pdf",
  disabled = false,
}: UploadFileProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const validateFile = (file: File): boolean => {
    // Check file type
    if (!file.type.includes("pdf") && !file.name.endsWith(".pdf")) {
      showToast({
        message: "Please upload a PDF file.",
        title: "Invalid file type",
        variant: "error",
      });
      return false;
    }

    // Check file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSize) {
      showToast({
        message: `File size must be less than ${maxSize}MB.`,
        title: "File too large",
        variant: "error",
      });
      return false;
    }

    return true;
  };

  const handleFileChange = async (file: File) => {
    if (!validateFile(file)) return;

    onFileSelect?.(file);

    if (onUpload) {
      setIsUploading(true);
      try {
        await onUpload(file);
        showToast({
          message: `${file.name} uploaded successfully.`,
          title: "Upload complete",
          variant: "success",
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to upload file.";
        showToast({
          message: errorMessage,
          title: "Upload failed",
          variant: "error",
        });
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileChange(file);
    }
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileChange(file);
    }
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        disabled={isUploading || disabled}
        className="hidden"
        aria-label="Upload PDF file"
      />

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-all sm:px-8 sm:py-10 ${
          isDragActive
            ? "border-amber-400/50 bg-amber-500/10"
            : "border-white/10 bg-white/3 hover:border-amber-400/30 hover:bg-amber-500/6"
        } ${isUploading || disabled ? "cursor-not-allowed opacity-70" : ""}`}
      >
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          className="mx-auto text-amber-400/60"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>

        <p className="mt-4 text-sm font-semibold text-white sm:text-base">
          {isUploading ? "Uploading..." : "Drag and drop your PDF here"}
        </p>
        <p className="mt-1 text-xs text-zinc-400 sm:text-sm">
          or click to browse
        </p>
        <p className="mt-3 text-xs text-zinc-500">
          Maximum file size: {maxSize}MB
        </p>
      </div>
    </div>
  );
}
