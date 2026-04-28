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
    new Array(questions.length).fill(null),
  );

  function select(qi: number, oi: number) {
    setAnswers((prev) => prev.map((a, i) => (i === qi ? oi : a)));
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
          Retention
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">
          Comprehension check
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          You just read &ldquo;{chunkTitle}&rdquo; at roughly{" "}
          <strong className="font-semibold text-amber-300">{wpm} wpm</strong>.
          Answer these questions to test your retention.
        </p>
      </div>

      <div className="space-y-4">
        {questions.map((q, qi) => (
          <div
            key={qi}
            className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"
          >
            <p className="mb-3 text-sm font-semibold leading-6 text-zinc-100">
              {qi + 1}. {q.q}
            </p>
            <div className="space-y-2">
              {q.options.map((opt, oi) => (
                <label
                  key={oi}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                    answers[qi] === oi
                      ? "border-amber-400/60 bg-amber-500/15 text-amber-50"
                      : "border-white/10 text-zinc-300 hover:border-white/20 hover:bg-white/5"
                  }`}
                >
                  <input
                    type="radio"
                    name={`q${qi}`}
                    value={oi}
                    checked={answers[qi] === oi}
                    onChange={() => select(qi, oi)}
                    className="accent-amber-500"
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => onSubmit(answers)}
        className="rounded-lg bg-linear-to-r from-amber-500 to-orange-600 px-5 py-2 text-sm font-semibold text-white transition-all hover:from-amber-400 hover:to-orange-500"
      >
        Submit answers
      </button>
    </div>
  );
}
