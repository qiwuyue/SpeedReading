'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

const DEMO_WORDS = (
  'The key to reading faster is training your brain to recognize words ' +
  'instantly without subvocalizing every single one. SpeedRead guides you ' +
  'through focused sessions that rewire how you process text at speed. ' +
  'You will be amazed at how quickly your comprehension catches up.'
).split(' ')

const WPM_PRESETS = [200, 300, 400, 500, 600]

export default function SpeedDemo() {
  const [index, setIndex]       = useState(0)
  const [playing, setPlaying]   = useState(false)
  const [wpm, setWpm]           = useState(400)
  const [animKey, setAnimKey]   = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  const advance = useCallback(() => {
    setIndex(prev => {
      if (prev >= DEMO_WORDS.length - 1) {
        setPlaying(false)
        return 0
      }
      return prev + 1
    })
    setAnimKey(k => k + 1)
  }, [])

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(advance, Math.round(60_000 / wpm))
    } else {
      clearTimer()
    }
    return clearTimer
  }, [playing, wpm, advance])

  const toggle = () => {
    if (!playing && index >= DEMO_WORDS.length - 1) {
      setIndex(0)
      setAnimKey(k => k + 1)
    }
    setPlaying(v => !v)
  }

  const progress = Math.round(((index + 1) / DEMO_WORDS.length) * 100)
  const word = DEMO_WORDS[index]

  // Split word into: before ORP, ORP char, after ORP
  const orp = Math.floor(word.replace(/[^a-zA-Z]/g, '').length * 0.35)
  const before = word.slice(0, orp)
  const highlight = word[orp] ?? ''
  const after = word.slice(orp + 1)

  return (
    <div className="relative w-full max-w-[360px] mx-auto select-none">
      {/* Outer glow */}
      <div className="absolute -inset-6 rounded-3xl bg-amber-600/8 blur-3xl pointer-events-none" />
      <div className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-amber-600/15 to-orange-600/5 blur-xl pointer-events-none" />

      {/* Card */}
      <div className="relative rounded-2xl border border-white/[0.09] bg-[rgba(13,13,18,0.95)] backdrop-blur-xl shadow-2xl shadow-black/60 overflow-hidden">

        {/* Top shimmer line */}
        <div className="h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />

        {/* Window chrome */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]/80" />
            </div>
            <span className="text-[11px] text-zinc-600 font-mono ml-1 tracking-tight">speedread.app</span>
          </div>
          <div className="flex items-center gap-2">
            {playing && (
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE
              </span>
            )}
            <span className="font-mono text-[11px] text-zinc-500">{wpm} WPM</span>
          </div>
        </div>

        {/* Word display */}
        <div className="px-6 pt-8 pb-6">
          <div className="relative flex items-center justify-center">
            {/* Horizontal guide lines */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent to-amber-500/25" />
              <div className="w-44" />
              <div className="flex-1 h-px bg-gradient-to-l from-transparent to-amber-500/25" />
            </div>
            {/* Vertical ORP guide */}
            <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px bg-amber-500/15 pointer-events-none" />

            {/* Word box */}
            <div className="relative w-44 h-16 flex items-center justify-center rounded-xl bg-white/[0.03] border border-white/[0.07] overflow-hidden">
              {/* Subtle inner glow */}
              <div className="absolute inset-0 bg-gradient-to-b from-amber-500/[0.04] to-transparent pointer-events-none" />
              <span
                key={animKey}
                className="relative font-mono text-3xl font-bold tracking-wide animate-word-in"
                style={{ display: 'flex', alignItems: 'baseline', gap: 0 }}
              >
                <span className="text-zinc-300">{before}</span>
                <span className="text-amber-400">{highlight}</span>
                <span className="text-zinc-300">{after}</span>
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-7">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[11px] text-zinc-600 font-medium uppercase tracking-widest">Progress</span>
              <span className="text-[11px] font-mono text-zinc-500">{progress}%</span>
            </div>
            <div className="h-[3px] w-full rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-150 ${
                  playing ? 'animate-bar-pulse' : ''
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="px-4 pb-4 flex items-center justify-between gap-2">
          {/* WPM presets */}
          <div className="flex gap-0.5">
            {WPM_PRESETS.map(w => (
              <button
                key={w}
                onClick={() => setWpm(w)}
                className={`px-2 py-1 text-[11px] font-mono rounded-md transition-all duration-150 ${
                  wpm === w
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-900/50'
                    : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.05]'
                }`}
              >
                {w}
              </button>
            ))}
          </div>

          {/* Play / Pause */}
          <button
            onClick={toggle}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-semibold hover:from-amber-400 hover:to-orange-500 transition-all duration-200 shadow-lg shadow-amber-900/50 hover:shadow-amber-900/70 hover:-translate-y-0.5 shrink-0"
          >
            {playing ? (
              <>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                  <rect x="1.5" y="0.5" width="2.5" height="9" rx="1" />
                  <rect x="6"   y="0.5" width="2.5" height="9" rx="1" />
                </svg>
                Pause
              </>
            ) : (
              <>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                  <path d="M2 0.8l7 4.2-7 4.2V0.8z" />
                </svg>
                {index >= DEMO_WORDS.length - 1 ? 'Replay' : 'Try it live'}
              </>
            )}
          </button>
        </div>

        {/* Bottom shimmer line */}
        <div className="h-px bg-gradient-to-r from-transparent via-orange-500/30 to-transparent" />
      </div>
    </div>
  )
}
