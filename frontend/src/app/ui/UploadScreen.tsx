"use client";

import { useState } from "react";
import type { Chunk } from "@/lib/types";

interface Props {
  onAnalyzed: (chunks: Chunk[]) => void;
}

const sampleQuestions = [
  {
    q: "What is the main purpose of this passage?",
    options: ["Explain", "Compare", "Persuade", "Entertain"] as [
      string,
      string,
      string,
      string,
    ],
    answer: 0,
  },
];

export function UploadScreen({ onAnalyzed }: Props) {
  const [text, setText] = useState("");

  const handleAnalyze = () => {
    const words = text.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return;

    onAnalyzed([
      {
        title: "Practice text",
        text: words.join(" "),
        questions: sampleQuestions,
      },
    ]);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-medium text-gray-900">Practice text</h1>
        <p className="mt-1 text-sm text-gray-500">
          Paste text to use the legacy speed reader demo.
        </p>
      </div>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        className="min-h-48 w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-900 outline-none focus:border-blue-500"
      />
      <button
        type="button"
        onClick={handleAnalyze}
        disabled={!text.trim()}
        className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-40"
      >
        Continue
      </button>
    </div>
  );
}
