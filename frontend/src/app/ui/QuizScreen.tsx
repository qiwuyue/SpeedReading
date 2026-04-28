"use client";

import { useState } from "react";
import { Question } from "@/lib/types";

interface Props {
  chunkTitle: string;
  wpm: number;
  questions: Question[];
  onSubmit: (answers: (number | null)[]) => void;
}

export function QuizScreen({ chunkTitle, wpm, questions, onSubmit }: Props) {
  const [answers, setAnswers] = useState<(number | null)[]>(
    new Array(questions.length).fill(null)
  );

  function select(qi: number, oi: number) {
    setAnswers((prev) => prev.map((a, i) => (i === qi ? oi : a)));
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-medium text-gray-900">
          Comprehension check
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          You just read &ldquo;{chunkTitle}&rdquo; at roughly{" "}
          <strong className="font-medium text-gray-700">{wpm} wpm</strong>.
          Answer these questions to test your retention.
        </p>
      </div>

      <div className="space-y-6">
        {questions.map((q, qi) => (
          <div key={qi}>
            <p className="mb-2 text-sm font-medium text-gray-900">
              {qi + 1}. {q.q}
            </p>
            <div className="space-y-1.5">
              {q.options.map((opt, oi) => (
                <label
                  key={oi}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                    answers[qi] === oi
                      ? "border-blue-400 bg-blue-50 text-blue-900"
                      : "border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name={`q${qi}`}
                    value={oi}
                    checked={answers[qi] === oi}
                    onChange={() => select(qi, oi)}
                    className="accent-blue-600"
                  />
                  {opt}
                </label>
              ))}
            </div>
            {qi < questions.length - 1 && (
              <hr className="mt-5 border-gray-100" />
            )}
          </div>
        ))}
      </div>

      <button
        onClick={() => onSubmit(answers)}
        className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
      >
        Submit answers
      </button>
    </div>
  );
}
