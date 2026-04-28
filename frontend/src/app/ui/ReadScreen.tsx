"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  title: string;
  partLabel: string;
  words: string[];
  initialWpm: number;
  onFinish: (elapsedSeconds: number, wpm: number) => void;
  onQuit: () => void;
}

export function ReadScreen({
  title,
  partLabel,
  words,
  initialWpm,
  onFinish,
  onQuit,
}: Props) {
  const [wordIdx, setWordIdx] = useState(0);
  const [wpm, setWpm] = useState(initialWpm);
  const [running, setRunning] = useState(false);
  const [flash, setFlash] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wpmRef = useRef(wpm);
  const wordIdxRef = useRef(0);

  const stop = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setRunning(false);
  }, []);

  const tick = useCallback(() => {
    if (wordIdxRef.current >= words.length) {
      stop();
      const elapsed = startTimeRef.current
        ? Math.round((Date.now() - startTimeRef.current) / 1000)
        : words.length;
      const actualWpm = Math.round((words.length / elapsed) * 60);
      onFinish(elapsed, actualWpm);
      return;
    }
    setFlash(true);
    setTimeout(() => setFlash(false), 40);
    wordIdxRef.current += 1;
    setWordIdx(wordIdxRef.current);
  }, [words, stop, onFinish]);

  const start = useCallback(() => {
    if (!startTimeRef.current) startTimeRef.current = Date.now();
    if (wordIdxRef.current >= words.length) {
      wordIdxRef.current = 0;
      setWordIdx(0);
      startTimeRef.current = Date.now();
    }
    setRunning(true);
    timerRef.current = setInterval(tick, Math.round(60000 / wpmRef.current));
  }, [tick, words]);

  function handleWpmChange(val: number) {
    setWpm(val);
    wpmRef.current = val;
    if (running) {
      stop();
      setTimeout(() => {
        setRunning(true);
        timerRef.current = setInterval(
          tick,
          Math.round(60000 / wpmRef.current)
        );
      }, 0);
    }
  }

  useEffect(() => () => stop(), [stop]);
  useEffect(() => {
    wpmRef.current = wpm;
  }, [wpm]);

  const progress = Math.round((wordIdx / words.length) * 100);
  const currentWord = words[Math.max(0, wordIdx - 1)] ?? "Press play";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-medium text-gray-900">{title}</h1>
        <p className="mt-1 text-sm text-gray-500">{partLabel}</p>
      </div>

      <div className="flex min-h-40 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 py-8">
        <span
          className={`font-serif text-4xl font-medium text-gray-900 transition-opacity duration-[40ms] ${
            flash ? "opacity-0" : "opacity-100"
          }`}
        >
          {wordIdx === 0 ? "Press play" : currentWord}
        </span>
      </div>

      <div>
        <div className="h-1 w-full rounded-full bg-gray-100">
          <div
            className="h-1 rounded-full bg-blue-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-1.5 text-center text-xs text-gray-400">
          {wordIdx} / {words.length} words
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={onQuit}
          className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
        >
          Quit
        </button>
        <button
          onClick={() => { stop(); setRunning(false); }}
          disabled={!running}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
        >
          Pause
        </button>
        <button
          onClick={start}
          disabled={running}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
        >
          Play
        </button>
        <div className="flex items-center gap-2 ml-2">
          <label className="text-xs text-gray-400">Speed</label>
          <input
            type="range"
            min={100}
            max={800}
            step={25}
            value={wpm}
            onChange={(e) => handleWpmChange(parseInt(e.target.value))}
            className="w-28"
          />
          <span className="text-sm font-medium text-gray-900 min-w-[64px]">
            {wpm} wpm
          </span>
        </div>
      </div>
    </div>
  );
}
