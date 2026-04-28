"use client";

import type { Question } from "@/lib/types";

interface Props {
  answers: (number | null)[];
  onAnotherChunk: () => void;
  onNewText: () => void;
  onRetryFaster: () => void;
  questions: Question[];
  wpm: number;
}

export function ResultsScreen({
  answers,
  onAnotherChunk,
  onNewText,
  onRetryFaster,
  questions,
  wpm,
}: Props) {
  const correctAnswers = questions.reduce((total, question, index) => {
    return total + (answers[index] === question.answer ? 1 : 0);
  }, 0);
  const score = questions.length
    ? Math.round((correctAnswers / questions.length) * 100)
    : 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-medium text-gray-900">Results</h1>
        <p className="mt-1 text-sm text-gray-500">
          {score}% comprehension at {wpm} wpm
        </p>
      </div>
      <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
        <p className="text-sm font-medium text-gray-900">
          {correctAnswers} of {questions.length} correct
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onRetryFaster}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          Retry faster
        </button>
        <button
          type="button"
          onClick={onAnotherChunk}
          className="rounded-lg border border-gray-200 px-5 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50"
        >
          Another chunk
        </button>
        <button
          type="button"
          onClick={onNewText}
          className="rounded-lg border border-gray-200 px-5 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50"
        >
          New text
        </button>
      </div>
    </div>
  );
}
