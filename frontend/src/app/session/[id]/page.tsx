'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, use } from 'react';
import { useAuthSession } from '@/lib/supabase/use-auth-session';
import { showToast } from '@/lib/toast-store';
import { useUploadStore } from '@/lib/store/upload-store';
import { QuizScreen } from '@/app/ui/QuizScreen';
import type { Question } from '@/lib/types';

type SessionPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default function ReadingSessionPage({ params }: SessionPageProps) {
  const router = useRouter();
  const { id: sessionId } = use(params);
  const { status, profile, session } = useAuthSession();
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [targetWpm, setTargetWpm] = useState(profile?.default_wpm || 250);
  const [wpm, setWpm] = useState(profile?.default_wpm || 250);
  const [words, setWords] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const sessionEndedRef = useRef(false);
  const sessionLoadStartedRef = useRef(false);
  const activeStartedAtRef = useRef<number | null>(null);
  const elapsedBeforePauseMsRef = useRef(0);

  const wordsRead = words.length ? currentWordIndex + 1 : 0;
  const durationSeconds = Math.floor(elapsedMs / 1000);
  const achievedWpm = useMemo(() => {
    if (elapsedMs <= 0 || !wordsRead) return null;
    return Math.round(wordsRead / (elapsedMs / 60000));
  }, [elapsedMs, wordsRead]);
  const isComplete = words.length > 0 && currentWordIndex === words.length - 1;
  const isDotMode = profile?.focus_mode === 'dot';

  const formattedDuration = useMemo(() => {
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = durationSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }, [durationSeconds]);

  const getCurrentElapsedMs = useCallback(() => {
    if (activeStartedAtRef.current === null) {
      return elapsedBeforePauseMsRef.current || elapsedMs;
    }

    return (
      elapsedBeforePauseMsRef.current +
      performance.now() -
      activeStartedAtRef.current
    );
  }, [elapsedMs]);

  const finishReadingSession = useCallback(
    async (completed: boolean) => {
      if (!session?.access_token || !words.length || sessionEndedRef.current) {
        return;
      }

      const currentElapsedMs = getCurrentElapsedMs();
      const currentWordsRead = completed ? words.length : wordsRead;
      const currentAchievedWpm =
        currentElapsedMs > 0
          ? Math.round(currentWordsRead / (currentElapsedMs / 60000))
          : achievedWpm;

      const payload = {
        words_read: currentWordsRead,
        achieved_wpm: currentAchievedWpm,
        duration_seconds: Math.floor(currentElapsedMs / 1000),
        completed,
      };

      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? 'Failed to save session result');
      }

      sessionEndedRef.current = true;
    },
    [
      achievedWpm,
      getCurrentElapsedMs,
      session?.access_token,
      sessionId,
      words.length,
      wordsRead,
    ],
  );

  const handleExitSession = useCallback(async () => {
    try {
      await finishReadingSession(isComplete);
    } catch (err) {
      console.error('Failed to save session result before exit:', err);
      showToast({
        message:
          err instanceof Error
            ? err.message
            : 'Failed to save session result',
        variant: 'error',
      });
    } finally {
      useUploadStore.getState().clearPendingFile();
      router.replace('/dashboard');
    }
  }, [finishReadingSession, isComplete, router]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
      return;
    }

    if (status !== 'authenticated' || !session?.access_token) {
      return;
    }

    if (sessionLoadStartedRef.current) {
      return;
    }

    sessionLoadStartedRef.current = true;

    const fetchSessionData = async () => {
      try {
        const response = await fetch(`/api/sessions/${sessionId}`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          setError(`Failed to load session: ${response.statusText}`);
          showToast({
            message: `Failed to load session: ${response.statusText}`,
            variant: 'error',
          });
          setIsLoading(false);
          router.replace('/dashboard');
          return;
        }

        const data = await response.json();
        console.log('Session Data:', data);
        const nextTargetWpm =
          typeof data.session.target_wpm === 'number'
            ? data.session.target_wpm
            : profile?.default_wpm || 250;
        setTargetWpm(nextTargetWpm);
        setWpm(nextTargetWpm);
        return { sessionId: data.session.id, fileid: data.session.file_id };
      } catch (err) {
        console.error('Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load session');
        showToast({
          message: 'Failed to load session data',
          variant: 'error',
        });
        setIsLoading(false);
      }
    };

    const analyzeFileContent = async (fileId: string) => {
      try {
        const response = await fetch('/api/ai', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fileId }),
        });

        if (!response.ok) {
          const errorBody = await response.text().catch(() => '');
          throw new Error(
            errorBody || 'AI service is temporarily unavailable. Please try again later.',
          );
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Failed to read AI response stream');
        }

        const decoder = new TextDecoder();
        let aiResponse = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          aiResponse += decoder.decode(value, { stream: true });
        }

        console.log('Raw AI Response:', aiResponse);

        // Parse SSE events and extract text from all chunks
        const lines = aiResponse
          .split('\n')
          .filter((l) => l.startsWith('data:'));
        let allWords: string[] = [];
        const allQuestions: Question[] = [];
        for (const line of lines) {
          const data = line.replace('data:', '').trim();
          if (data === '[DONE]') break;
          let parsed: {
            data?: {
              text?: string;
              questions?: Question[];
            };
            error?: string;
          };

          try {
            parsed = JSON.parse(data);
          } catch {
            // skip malformed lines
            continue;
          }

          if (parsed.error) {
            throw new Error(parsed.error);
          }

          if (parsed.data?.text) {
            allWords = [...allWords, ...parsed.data.text.split(/\s+/)];
          }
          if (Array.isArray(parsed.data?.questions)) {
            allQuestions.push(...parsed.data.questions);
          }
        }

        if (!allWords.length) {
          throw new Error('AI did not return readable text for this file.');
        }

        setError(null);
        setWords(allWords);
        setQuizQuestions(allQuestions);
      } catch (err) {
        console.error('AI Analysis Error:', err);
        setError(err instanceof Error ? err.message : 'AI analysis failed');
        showToast({
          message: 'Failed to analyze file content',
          variant: 'error',
        });
      }
    };

    const resolver = async () => {
      const sessionData = await fetchSessionData();
      if (sessionData) {
        console.log('Session fetched successfully:', sessionData);
        await analyzeFileContent(sessionData.fileid);
      }
      setIsLoading(false);
    };

    resolver();
  }, [profile?.default_wpm, sessionId, status, session?.access_token, router]);

  const submitComprehensionCheck = async (answers: (number | null)[]) => {
    if (!session?.access_token) {
      showToast({
        message: 'You need to be logged in to submit a comprehension check.',
        variant: 'error',
      });
      return;
    }

    setQuizSubmitting(true);

    try {
      const correctCount = quizQuestions.reduce((total, question, index) => {
        return total + (answers[index] === question.answer ? 1 : 0);
      }, 0);
      const score =
        quizQuestions.length === 0
          ? 0
          : Math.round((correctCount / quizQuestions.length) * 100);
      const questionsJson = quizQuestions.map((question) => ({
        question: question.q,
        choices: question.options,
        answer: question.options[question.answer] ?? null,
        answerIndex: question.answer,
      }));
      const answersJson = quizQuestions.map((question, index) => {
        const selectedIndex = answers[index];
        return {
          question: question.q,
          selected: selectedIndex === null ? null : question.options[selectedIndex],
          selectedIndex,
          correct: selectedIndex === question.answer,
          correctAnswer: question.options[question.answer] ?? null,
          correctIndex: question.answer,
        };
      });

      const response = await fetch('/api/comprehension-checks', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          questions: questionsJson,
          answers: answersJson,
          score,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? 'Failed to save comprehension check');
      }

      setQuizScore(score);
      showToast({
        message: `You scored ${score}%.`,
        title: 'Comprehension saved',
        variant: 'success',
      });
    } catch (err) {
      showToast({
        message:
          err instanceof Error
            ? err.message
            : 'Failed to save comprehension check',
        variant: 'error',
      });
    } finally {
      setQuizSubmitting(false);
    }
  };

  useEffect(() => {
    if (isPaused || !words.length) return;

    const msPerWord = 60000 / wpm;
    const timer = setTimeout(() => {
      if (currentWordIndex < words.length - 1) {
        setCurrentWordIndex(currentWordIndex + 1);
      } else {
        setIsPaused(true);
      }
    }, msPerWord);

    return () => clearTimeout(timer);
  }, [currentWordIndex, isPaused, wpm, words.length]);

  useEffect(() => {
    if (!words.length) return;

    if (isPaused) {
      if (activeStartedAtRef.current !== null) {
        elapsedBeforePauseMsRef.current +=
          performance.now() - activeStartedAtRef.current;
        activeStartedAtRef.current = null;
        setElapsedMs(elapsedBeforePauseMsRef.current);
      }
      return;
    }

    if (activeStartedAtRef.current === null) {
      activeStartedAtRef.current = performance.now();
    }

    const timer = window.setInterval(() => {
      if (activeStartedAtRef.current === null) return;

      setElapsedMs(
        elapsedBeforePauseMsRef.current +
          performance.now() -
          activeStartedAtRef.current,
      );
    }, 250);

    return () => window.clearInterval(timer);
  }, [isPaused, words.length]);

  useEffect(() => {
    if (!isComplete || !isPaused || sessionEndedRef.current) return;

    finishReadingSession(true).catch((err) => {
      console.error('Failed to save completed session:', err);
      showToast({
        message:
          err instanceof Error
            ? err.message
            : 'Failed to save completed session',
        variant: 'error',
      });
    });
  }, [finishReadingSession, isComplete, isPaused]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!session?.access_token || !words.length || sessionEndedRef.current) {
        return;
      }

      const currentElapsedMs = getCurrentElapsedMs();
      const currentWordsRead = isComplete ? words.length : wordsRead;
      const payload = JSON.stringify({
        words_read: currentWordsRead,
        achieved_wpm:
          currentElapsedMs > 0
            ? Math.round(currentWordsRead / (currentElapsedMs / 60000))
            : achievedWpm,
        duration_seconds: Math.floor(currentElapsedMs / 1000),
        completed: isComplete,
      });

      fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: payload,
        keepalive: true,
      }).catch(() => undefined);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [
    achievedWpm,
    getCurrentElapsedMs,
    isComplete,
    session?.access_token,
    sessionId,
    words.length,
    wordsRead,
  ]);

  if (isLoading || status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#09090b] px-4 text-white">
        <div className="rounded-2xl border border-white/8 bg-[rgba(13,13,18,0.9)] px-6 py-5 text-sm text-zinc-400 shadow-2xl shadow-black/30">
          Loading your reading session...
        </div>
      </div>
    );
  }

  if (error && !words.length) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#09090b] px-4 text-white">
        <div className="rounded-2xl border border-white/8 bg-[rgba(13,13,18,0.9)] px-6 py-5 text-sm text-zinc-400 shadow-2xl shadow-black/30">
          <p className="text-red-400">{error}</p>
          <Link
            href="/dashboard"
            className="mt-4 inline-block rounded-lg bg-linear-to-r from-amber-500 to-orange-600 px-4 py-2 font-semibold text-white transition-all hover:from-amber-400 hover:to-orange-500"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10"
      >
        <div className="absolute right-[8%] top-[8%] h-130 w-130 rounded-full bg-amber-500/15 blur-3xl" />
        <div className="absolute bottom-[8%] left-[4%] h-[420px] w-[420px] rounded-full bg-orange-600/6 blur-[110px]" />
      </div>

      {/* Header */}
      <header className="border-b border-white/6 bg-[rgba(9,9,11,0.82)] backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-900/50">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path
                  d="M1.5 6.5h3.5m3 0h3M1.5 3.5h2m6 0h-3M1.5 9.5h5m3 0h-2"
                  stroke="white"
                  strokeLinecap="round"
                  strokeWidth="1.6"
                />
              </svg>
            </div>
            <span className="text-[15px] font-bold tracking-tight text-white">
              SpeedRead
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExitSession}
              className="rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-zinc-300 transition-all hover:border-white/20 hover:bg-white/5 hover:text-white sm:px-4"
            >
              Exit Session
            </button>
          </div>
        </div>
      </header>

      {/* Main Reading Area */}
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        {showQuiz ? (
          <div className="rounded-3xl border border-white/8 bg-[rgba(13,13,18,0.9)] px-6 py-6 text-white shadow-2xl shadow-black/30 sm:px-8">
            {quizScore === null ? (
              <>
                <QuizScreen
                  chunkTitle="Reading session"
                  wpm={achievedWpm ?? wpm}
                  questions={quizQuestions}
                  onSubmit={submitComprehensionCheck}
                />
                {quizSubmitting ? (
                  <p className="mt-3 text-sm text-gray-500">
                    Saving comprehension check...
                  </p>
                ) : null}
              </>
            ) : (
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white">
                  Comprehension saved
                </h2>
                <p className="mt-3 text-lg font-semibold text-amber-300">
                  Score: {quizScore}%
                </p>
                <button
                  type="button"
                  onClick={handleExitSession}
                  className="mt-6 rounded-xl bg-linear-to-r from-amber-500 to-orange-600 px-5 py-2 text-sm font-semibold text-white transition-all hover:from-amber-400 hover:to-orange-500"
                >
                  Back to Dashboard
                </button>
              </div>
            )}
          </div>
        ) : null}

        {!showQuiz ? (
          <>
        {error && words.length > 0 && (
          <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">
            ⚠️ {error}
          </div>
        )}
        <div className="mb-8 grid gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-white/[0.07] bg-[rgba(13,13,18,0.86)] p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">
              Target WPM
            </p>
            <p className="mt-2 text-xl font-bold text-amber-300">
              {targetWpm} WPM
            </p>
          </div>
          <div className="rounded-xl border border-white/[0.07] bg-[rgba(13,13,18,0.86)] p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">
              Time
            </p>
            <p className="mt-2 text-xl font-bold text-sky-300">
              {formattedDuration}
            </p>
          </div>
          <div className="rounded-xl border border-white/[0.07] bg-[rgba(13,13,18,0.86)] p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">
              Actual Pace
            </p>
            <p className="mt-2 text-xl font-bold text-white">
              {achievedWpm ? `${achievedWpm} WPM` : 'Calculating'}
            </p>
          </div>
          <div className="rounded-xl border border-white/[0.07] bg-[rgba(13,13,18,0.86)] p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">
              Progress
            </p>
            <p className="mt-2 text-xl font-bold text-emerald-400">
              {wordsRead} / {words.length}
            </p>
          </div>
        </div>

        {/* Reading Display */}
        <div className="relative overflow-hidden rounded-3xl border border-white/8 bg-[rgba(13,13,18,0.9)] p-8 shadow-2xl shadow-black/30 sm:p-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-amber-500/15 blur-3xl"
          />

          {words.length > 0 ? (
            <>
              <div className="relative mb-12 min-h-32">
                {isDotMode ? (
                  <div className="flex min-h-32 items-center justify-center text-center">
                    <span className="text-5xl font-bold text-amber-300 sm:text-7xl">
                      {words[currentWordIndex]}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 text-center text-3xl font-bold leading-relaxed sm:text-4xl">
                    {words.map((word, index) => (
                      <span
                        key={index}
                        className={`transition-all duration-200 ${
                          index === currentWordIndex
                            ? 'text-amber-400 scale-110'
                            : index < currentWordIndex
                            ? 'text-zinc-500'
                            : 'text-white/60'
                        }`}
                      >
                        {word}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="mt-8 flex flex-col gap-4">
                {/* Progress Bar */}
                <div className="w-full">
                  <div className="h-1 w-full rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-linear-to-r from-amber-500 to-orange-600 transition-all duration-300"
                      style={{
                        width: `${
                          ((currentWordIndex + 1) / words.length) * 100
                        }%`,
                      }}
                    />
                  </div>
                </div>

                {/* Control Buttons */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsPaused(!isPaused)}
                      className="flex-1 rounded-lg bg-linear-to-r from-amber-500 to-orange-600 px-4 py-2 font-semibold text-white transition-all hover:from-amber-400 hover:to-orange-500 sm:flex-none sm:px-6"
                    >
                      {isPaused ? 'Resume' : 'Pause'}
                    </button>
                    <button
                      onClick={() =>
                        setCurrentWordIndex(Math.max(0, currentWordIndex - 1))
                      }
                      className="rounded-lg border border-white/10 px-4 py-2 font-semibold text-zinc-300 transition-all hover:border-white/20 hover:bg-white/5 hover:text-white"
                    >
                      ← Back
                    </button>
                    <button
                      onClick={() =>
                        setCurrentWordIndex(
                          Math.min(words.length - 1, currentWordIndex + 1),
                        )
                      }
                      className="rounded-lg border border-white/10 px-4 py-2 font-semibold text-zinc-300 transition-all hover:border-white/20 hover:bg-white/5 hover:text-white"
                    >
                      Next →
                    </button>
                  </div>

                  {/* WPM Adjustment */}
                  <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-2">
                    <label htmlFor="wpm" className="text-sm text-zinc-400">
                      Speed:
                    </label>
                    <input
                      id="wpm"
                      type="range"
                      min="100"
                      max="500"
                      value={wpm}
                      onChange={(e) => setWpm(Number(e.target.value))}
                      className="w-20 cursor-pointer"
                    />
                    <span className="min-w-12 text-right text-sm font-semibold text-amber-300">
                      {wpm}
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex min-h-32 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 px-6 py-10 text-center text-zinc-400">
              Loading words...
            </div>
          )}
        </div>

        {/* Session Complete Message */}
        {currentWordIndex === words.length - 1 && isPaused && (
          <div className="mt-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
            <p className="text-lg font-bold text-emerald-400">
              Session Complete! 🎉
            </p>
            <p className="mt-2 text-sm text-zinc-400">
              You&apos;ve finished reading this session. Great job!
            </p>
            <div className="mt-4 flex gap-3 justify-center">
              {quizQuestions.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowQuiz(true)}
                  className="rounded-lg border border-emerald-400/30 bg-emerald-500/15 px-4 py-2 font-semibold text-emerald-100 transition-all hover:border-emerald-300/50 hover:bg-emerald-500/20"
                >
                  Start comprehension check
                </button>
              ) : (
                <span className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-400">
                  No comprehension check available
                </span>
              )}
              <button
                onClick={handleExitSession}
                className="rounded-lg bg-linear-to-r from-amber-500 to-orange-600 px-4 py-2 font-semibold text-white transition-all hover:from-amber-400 hover:to-orange-500"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        )}
          </>
        ) : null}
      </main>
    </div>
  );
}
