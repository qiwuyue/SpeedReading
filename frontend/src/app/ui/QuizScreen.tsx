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
        <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-400">
          Comprehension
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">
          Comprehension check
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          You just read &ldquo;{chunkTitle}&rdquo; at roughly{" "}
          <strong className="font-semibold text-amber-300">{wpm} wpm</strong>.
          Answer these questions to test your retention.
        </p>
      </div>

      <div className="space-y-6">
        {questions.map((q, qi) => (
          <div
            key={qi}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4"
          >
            <p className="mb-3 text-sm font-semibold leading-relaxed text-zinc-100">
              {qi + 1}. {q.q}
            </p>
            <div className="space-y-2">
              {q.options.map((opt, oi) => (
                <label
                  key={oi}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                    answers[qi] === oi
                      ? "border-amber-400/50 bg-amber-500/15 text-amber-100"
                      : "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  <input
                    type="radio"
                    name={`q${qi}`}
                    value={oi}
                    checked={answers[qi] === oi}
                    onChange={() => select(qi, oi)}
                    className="accent-amber-400"
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
        className="rounded-xl bg-linear-to-r from-amber-500 to-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xl shadow-amber-900/35 transition-all hover:from-amber-400 hover:to-orange-500"
      >
        Submit answers
      </button>
    </div>
  );
}
