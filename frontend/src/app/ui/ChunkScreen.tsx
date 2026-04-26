"use client";

import { useState } from "react";
import { Chunk } from "@/lib/types";

interface Props {
  chunks: Chunk[];
  onStart: (chunkIdx: number, wpm: number) => void;
  onBack: () => void;
}

export function ChunkScreen({ chunks, onStart, onBack }: Props) {
  const [selected, setSelected] = useState(0);
  const [wpm, setWpm] = useState(250);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-medium text-gray-900">Choose a section</h1>
        <p className="mt-1 text-sm text-gray-500">
          AI split your text into readable chunks. Pick one to practice with.
        </p>
      </div>

      <div className="space-y-2">
        {chunks.map((chunk, i) => {
          const wc = chunk.text.split(/\s+/).filter(Boolean).length;
          return (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={`w-full text-left rounded-lg border px-4 py-3 text-sm transition-colors ${
                selected === i
                  ? "border-blue-500 bg-blue-50 border-2"
                  : "border-gray-200 bg-gray-50 hover:border-gray-300"
              }`}
            >
              <span className="font-medium text-gray-900">
                Part {i + 1}.
              </span>{" "}
              <span className="text-gray-700">{chunk.title}</span>
              <span className="ml-2 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                {wc} words
              </span>
            </button>
          );
        })}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-gray-500">Reading speed</label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={100}
            max={800}
            step={25}
            value={wpm}
            onChange={(e) => setWpm(parseInt(e.target.value))}
            className="w-40"
          />
          <span className="text-base font-medium text-gray-900">
            {wpm}{" "}
            <span className="text-sm font-normal text-gray-400">wpm</span>
          </span>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => onStart(selected, wpm)}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Start reading
        </button>
        <button
          onClick={onBack}
          className="rounded-lg border border-gray-200 px-5 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
      </div>
    </div>
  );
}
