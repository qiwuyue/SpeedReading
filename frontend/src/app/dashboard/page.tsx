'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAuthSession } from '@/lib/supabase/use-auth-session';
import { showToast } from '@/lib/toast-store';
import { FocusMode, isAnonymousUser } from '@/lib/supabase/users';
import { UploadFile } from '@/app/ui/upload-file';
import ConvertAnonModal from '@/app/ui/convert-anon-modal';
import ProgressAnalytics, {
  type ProgressAnalyticsData,
} from '@/app/ui/ProgressAnalytics';

const QUICK_ACTIONS = [
  { title: 'Upload PDF', desc: 'Start a reading session from a document.' },
  { title: 'Try sample', desc: 'Practice with curated reading material.' },
  { title: 'Review progress', desc: 'See trends once real sessions exist.' },
];

type ReadingSessionAnalyticsRow = {
  id: string;
  words_read: number | null;
  achieved_wpm: number | null;
  duration_seconds?: number | null;
  completed: boolean | null;
  created_at: string | null;
};

type ComprehensionCheckAnalyticsRow = {
  session_id: string | null;
  score: number | null;
  created_at: string | null;
};

// Used before Supabase returns data and when a query fails. Keeping this shape
// identical to ProgressAnalyticsData lets the UI render empty states safely.
const EMPTY_ANALYTICS_DATA: ProgressAnalyticsData = {
  summary: {
    totalWordsRead: 0,
    averageWpm: 0,
    completedSessions: 0,
    averageQuizScore: null,
  },
  dailyWords: [],
  wpmTrend: [],
  quizScores: [],
};

type DashboardStat = {
  label: string;
  value: string;
  detail: string;
};

type RecentDocument = {
  documentId: string;
  sessionId: string;
  title: string;
  progress: string;
  pace: string;
};

type RecentSessionRow = {
  id: string;
  document_id: string | null;
  words_read: number | null;
  achieved_wpm: number | null;
  target_wpm: number | null;
  completed: boolean | null;
  created_at: string | null;
};

type DocumentRow = {
  id: string;
  original_filename: string | null;
};

const EMPTY_DASHBOARD_STATS: DashboardStat[] = [
  { label: 'Total sessions', value: '0', detail: '0 this week' },
  { label: 'Weekly reading', value: '0 words', detail: 'this week' },
  { label: 'Comprehension', value: 'No scores', detail: 'avg. quiz score' },
  { label: 'Current streak', value: '0', detail: 'days' },
];

// Chart labels are intentionally short because they sit on compact axes.
const formatChartDate = (value: string | null) => {
  if (!value) return 'Unknown';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

// Dashboard cards need a compact display for large weekly word totals.
const formatCompactNumber = (value: number) =>
  new Intl.NumberFormat('en-US', {
    maximumFractionDigits: value >= 1000 ? 1 : 0,
    notation: value >= 1000 ? 'compact' : 'standard',
  }).format(value);

const average = (values: number[]) => {
  if (!values.length) return null;
  return values.reduce((total, value) => total + value, 0) / values.length;
};

const getDateKey = (value: string | null) => {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString().slice(0, 10);
};

const getRollingWeekStart = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - 6);
  return date;
};

// A streak means consecutive calendar days with at least one reading session.
// If the user has not read yet today, yesterday can still anchor the streak;
// this avoids resetting a valid streak to 0 at midnight before today's read.
const buildCurrentStreak = (sessions: ReadingSessionAnalyticsRow[]) => {
  const activeDays = new Set(
    sessions
      .map((session) => getDateKey(session.created_at))
      .filter((dateKey): dateKey is string => Boolean(dateKey)),
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const todayKey = today.toISOString().slice(0, 10);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);

  if (!activeDays.has(todayKey) && !activeDays.has(yesterdayKey)) {
    return 0;
  }

  let streak = 0;
  const cursor = activeDays.has(todayKey) ? today : yesterday;

  while (activeDays.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
};

// Converts raw Supabase rows into the four dashboard stat cards. This is kept
// separate from the chart data builder because the dashboard cards answer
// slightly different questions than the analytics modal.
const buildDashboardStats = (
  sessions: ReadingSessionAnalyticsRow[],
  checks: ComprehensionCheckAnalyticsRow[],
): DashboardStat[] => {
  const weekStart = getRollingWeekStart();
  const weeklySessions = sessions.filter((session) => {
    if (!session.created_at) return false;
    return new Date(session.created_at) >= weekStart;
  });
  const weeklyWords = weeklySessions.reduce(
    (total, session) => total + (session.words_read ?? 0),
    0,
  );
  const quizScoreValues = checks
    .map((check) => check.score)
    .filter((score): score is number => typeof score === 'number');
  const averageQuizScore = average(quizScoreValues);
  const currentStreak = buildCurrentStreak(sessions);
  const completedSessions = sessions.filter((session) => session.completed).length;
  const activeSessions = Math.max(0, sessions.length - completedSessions);

  return [
    {
      label: 'Total sessions',
      value: String(sessions.length),
      detail: `${completedSessions} completed, ${activeSessions} Incomplete`,
    },
    {
      label: 'Weekly reading',
      value: `${formatCompactNumber(weeklyWords)} words`,
      detail: 'last 7 days',
    },
    {
      label: 'Comprehension',
      value:
        averageQuizScore === null
          ? 'No scores'
          : `${Math.round(averageQuizScore)}%`,
      detail: 'avg. quiz score',
    },
    {
      label: 'Current streak',
      value: String(currentStreak),
      detail: currentStreak === 1 ? 'day' : 'days',
    },
  ];
};

// Converts raw Supabase rows into the exact prop shape required by
// ProgressAnalytics. The component stays presentational; this page owns all
// database querying and aggregation.
const buildAnalyticsData = (
  sessions: ReadingSessionAnalyticsRow[],
  checks: ComprehensionCheckAnalyticsRow[],
): ProgressAnalyticsData => {
  const dailyWordsByDate = new Map<string, number>();

  sessions.forEach((session) => {
    const date = formatChartDate(session.created_at);
    dailyWordsByDate.set(
      date,
      (dailyWordsByDate.get(date) ?? 0) + (session.words_read ?? 0),
    );
  });

  const wpmValues = sessions
    .map((session) => session.achieved_wpm)
    .filter((wpm): wpm is number => typeof wpm === 'number');
  const quizScoreValues = checks
    .map((check) => check.score)
    .filter((score): score is number => typeof score === 'number');
  const averageWpm = average(wpmValues);
  const averageQuizScore = average(quizScoreValues);

  return {
    summary: {
      totalWordsRead: sessions.reduce(
        (total, session) => total + (session.words_read ?? 0),
        0,
      ),
      averageWpm: averageWpm === null ? 0 : Math.round(averageWpm),
      completedSessions: sessions.filter((session) => session.completed).length,
      averageQuizScore:
        averageQuizScore === null ? null : Math.round(averageQuizScore),
    },
    dailyWords: Array.from(dailyWordsByDate.entries()).map(
      ([date, wordsRead]) => ({
        date,
        wordsRead,
      }),
    ),
    wpmTrend: sessions
      .filter((session) => typeof session.achieved_wpm === 'number')
      .map((session) => ({
        date: formatChartDate(session.created_at),
        wpm: session.achieved_wpm ?? 0,
      })),
    quizScores: checks
      .filter((check) => typeof check.score === 'number')
      .map((check) => ({
        date: formatChartDate(check.created_at),
        score: check.score ?? 0,
      })),
  };
};

const formatFocusMode = (focusMode?: FocusMode | null) => {
  if (!focusMode) return 'Highlight';
  return focusMode.charAt(0).toUpperCase() + focusMode.slice(1);
};

const formatRecentProgress = (session: RecentSessionRow) => {
  if (session.completed) return '100% complete';
  if ((session.words_read ?? 0) > 0) {
    return `${formatCompactNumber(session.words_read ?? 0)} words read`;
  }
  return 'Ready to read';
};

const formatRecentPace = (session: RecentSessionRow) => {
  const pace = session.achieved_wpm ?? session.target_wpm;
  return pace ? `${pace} WPM` : 'Not started';
};

export default function DashboardPage() {
  const router = useRouter();
  const {
    error: authSessionError,
    isAuthenticated,
    isLoading,
    profile,
    profileError,
    status,
    updateDefaultWpm,
    updateDisplayName,
    updateFocusMode,
    user,
  } = useAuthSession();
  const [authError, setAuthError] = useState('');
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [displayNameModalOpen, setDisplayNameModalOpen] = useState(false);
  const [focusModeInput, setFocusModeInput] = useState<FocusMode | null>(null);
  const [focusModeModalOpen, setFocusModeModalOpen] = useState(false);
  const [isAnon, setIsAnon] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [analyticsData, setAnalyticsData] =
    useState<ProgressAnalyticsData>(EMPTY_ANALYTICS_DATA);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<DashboardStat[]>(
    EMPTY_DASHBOARD_STATS,
  );
  const [recentDocuments, setRecentDocuments] = useState<RecentDocument[]>([]);
  const [recentDocumentsError, setRecentDocumentsError] = useState<
    string | null
  >(null);
  const [recentDocumentsLoading, setRecentDocumentsLoading] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(
    null,
  );
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [wpmModalOpen, setWpmModalOpen] = useState(false);
  const [wpmInput, setWpmInput] = useState('');

  const displayName = profile?.display_name?.trim() ?? '';
  const profileEmail = profile?.email ?? user?.email ?? '';
  const defaultWpm = profile?.default_wpm ?? 250;
  const focusMode = formatFocusMode(profile?.focus_mode);

  const loadRecentDocuments = useCallback(async () => {
    setRecentDocumentsLoading(true);
    setRecentDocumentsError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user: currentUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !currentUser) {
        throw new Error(userError?.message ?? 'Unable to load current user.');
      }

      const { data: sessions, error: sessionsError } = await supabase
        .from('reading_sessions')
        .select(
          'id, document_id, words_read, achieved_wpm, target_wpm, completed, created_at',
        )
        .eq('user_id', currentUser.id)
        .not('document_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(8);

      if (sessionsError) {
        throw new Error(sessionsError.message);
      }

      const sessionRows = (sessions ?? []) as RecentSessionRow[];
      const documentIds = Array.from(
        new Set(
          sessionRows
            .map((session) => session.document_id)
            .filter((id): id is string => Boolean(id)),
        ),
      );

      if (!documentIds.length) {
        setRecentDocuments([]);
        return;
      }

      const { data: documents, error: documentsError } = await supabase
        .from('documents')
        .select('id, original_filename')
        .in('id', documentIds);

      if (documentsError) {
        throw new Error(documentsError.message);
      }

      const documentsById = new Map(
        ((documents ?? []) as DocumentRow[]).map((document) => [
          document.id,
          document,
        ]),
      );

      setRecentDocuments(
        sessionRows
          .filter((session) => session.document_id)
          .map((session) => ({
            documentId: session.document_id as string,
            sessionId: session.id,
            title:
              documentsById.get(session.document_id as string)
                ?.original_filename ?? 'Untitled PDF',
            progress: formatRecentProgress(session),
            pace: formatRecentPace(session),
          })),
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to load recent documents.';
      setRecentDocuments([]);
      setRecentDocumentsError(message);
    } finally {
      setRecentDocumentsLoading(false);
    }
  }, []);

  // Pulls the current user's progress rows from Supabase, logs the raw data for
  // temporary debugging, then updates both the dashboard cards and chart modal.
  const loadAnalytics = useCallback(
    async ({ showLoading = false }: { showLoading?: boolean } = {}) => {
      if (showLoading) {
        setAnalyticsLoading(true);
      }
      setAnalyticsError(null);

      try {
        const supabase = createSupabaseBrowserClient();
        const {
          data: { user: currentUser },
          error: userError,
        } = await supabase.auth.getUser();

        console.log('Progress analytics user id:', currentUser?.id);

        if (userError || !currentUser) {
          throw new Error(userError?.message ?? 'Unable to load current user.');
        }

        const { data: sessions, error: sessionsError } = await supabase
          .from('reading_sessions')
          // These are the only reading session columns needed for the current
          // dashboard cards and ProgressAnalytics charts.
          .select('id, words_read, achieved_wpm, completed, created_at')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: true });

        console.log('Progress analytics sessions:', sessions);

        if (sessionsError) {
          throw new Error(sessionsError.message);
        }

        const sessionRows = (sessions ?? []) as ReadingSessionAnalyticsRow[];
        const sessionIds = sessionRows.map((session) => session.id);
        let checkRows: ComprehensionCheckAnalyticsRow[] = [];

        if (sessionIds.length > 0) {
          const { data: checks, error: checksError } = await supabase
            .from('comprehension_checks')
            // Checks are loaded separately because they are keyed by session_id.
            .select('session_id, score, created_at')
            .in('session_id', sessionIds)
            .order('created_at', { ascending: true });

          console.log('Progress analytics checks:', checks);

          if (checksError) {
            throw new Error(checksError.message);
          }

          checkRows = (checks ?? []) as ComprehensionCheckAnalyticsRow[];
        } else {
          console.log('Progress analytics checks:', []);
        }

        setAnalyticsData(buildAnalyticsData(sessionRows, checkRows));
        setDashboardStats(buildDashboardStats(sessionRows, checkRows));
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unable to load progress analytics.';
        setAnalyticsError(message);
        setAnalyticsData(EMPTY_ANALYTICS_DATA);
        setDashboardStats(EMPTY_DASHBOARD_STATS);
      } finally {
        if (showLoading) {
          setAnalyticsLoading(false);
        }
      }
    },
    [],
  );

  const handleQuickAction = (actionTitle: string) => {
    switch (actionTitle) {
      case 'Upload PDF':
        setUploadModalOpen(true);
        break;
      case 'Try sample':
        showToast({
          message: 'Sample reading session coming soon!',
          title: 'Try Sample',
          variant: 'info',
        });
        break;
      case 'Review progress':
        setProgressModalOpen(true);
        break;
      default:
        break;
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file, file.name);
      formData.append('documentName', file.name);
      formData.append('pagesLength', '1'); // or compute real page count

      const token = (await createSupabaseBrowserClient().auth.getSession()).data
        .session?.access_token;

      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      router.push(`/session/${data.sessionId}`);
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Failed to upload',
        variant: 'error',
      });
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string, title: string) => {
    const confirmed = window.confirm(`Delete "${title}"?`);
    if (!confirmed) return;

    setDeletingDocumentId(documentId);

    try {
      const token = (await createSupabaseBrowserClient().auth.getSession()).data
        .session?.access_token;

      if (!token) {
        throw new Error('You need to be logged in to delete documents.');
      }

      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(data?.error ?? 'Failed to delete document.');
      }

      showToast({
        message: `${title} was deleted.`,
        title: 'Document deleted',
        variant: 'success',
      });

      await Promise.all([loadRecentDocuments(), loadAnalytics()]);
    } catch (error) {
      showToast({
        message:
          error instanceof Error ? error.message : 'Failed to delete document.',
        title: 'Delete failed',
        variant: 'error',
      });
    } finally {
      setDeletingDocumentId(null);
    }
  };

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
  }, [router, status]);

  useEffect(() => {
    // Check if user is anonymous
    const checkAnonStatus = async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const isAnonUser = await isAnonymousUser(supabase);
        setIsAnon(isAnonUser);
      } catch (err) {
        console.error('Failed to check anonymous status:', err);
      }
    };

    if (user) {
      checkAnonStatus();
    }
  }, [user]);

  useEffect(() => {
    setDisplayNameInput(profile?.display_name ?? '');
  }, [profile?.display_name]);

  useEffect(() => {
    if (!profileError) return;

    setAuthError(profileError);
    showToast({
      message: profileError,
      title: 'Profile unavailable',
      variant: 'error',
    });
  }, [profileError]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let isMounted = true;
    let channel: ReturnType<
      ReturnType<typeof createSupabaseBrowserClient>['channel']
    > | null = null;

    const setupAnalytics = async () => {
      await Promise.all([
        loadAnalytics({ showLoading: progressModalOpen }),
        loadRecentDocuments(),
      ]);

      if (!isMounted) return;

      const supabase = createSupabaseBrowserClient();
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser || !isMounted) return;

      channel = supabase
        .channel(`dashboard-analytics-${currentUser.id}`)
        // Reading sessions are filtered by user_id, so other users' activity
        // will not trigger this dashboard to refresh.
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'reading_sessions',
            filter: `user_id=eq.${currentUser.id}`,
          },
          () => {
            loadAnalytics();
            loadRecentDocuments();
          },
        )
        // comprehension_checks does not include user_id in the given schema, so
        // any check change triggers a refetch. The refetch filters checks back
        // down to this user's session ids.
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'comprehension_checks',
          },
          () => loadAnalytics(),
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'documents',
            filter: `user_id=eq.${currentUser.id}`,
          },
          () => loadRecentDocuments(),
        )
        .subscribe();
    };

    setupAnalytics();

    return () => {
      isMounted = false;
      if (channel) {
        createSupabaseBrowserClient().removeChannel(channel);
      }
    };
  }, [isAuthenticated, loadAnalytics, loadRecentDocuments, progressModalOpen]);

  const handleLogout = async () => {
    setLoggingOut(true);

    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.push('/');
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : 'Unable to log out right now.',
      );
      setLoggingOut(false);
    }
  };

  const handleFocusModeSubmit = async (event: { preventDefault(): void }) => {
    event.preventDefault();

    if (!focusModeInput) {
      const message = 'Focus mode must be selected.';
      showToast({ message, title: 'Profile update failed', variant: 'error' });
      return;
    }
    const nextFocusMode = focusModeInput as FocusMode;
    setAuthError('');

    if (!user) {
      const message = 'You need to be logged in to update your profile.';
      setAuthError(message);
      showToast({ message, title: 'Profile update failed', variant: 'error' });
      return;
    }

    if (!nextFocusMode) {
      const message = 'Focus mode must be selected.';
      setAuthError(message);
      showToast({ message, title: 'Profile update failed', variant: 'error' });
      return;
    }

    setProfileSaving(true);

    try {
      await updateFocusMode(nextFocusMode);
      setFocusModeInput(nextFocusMode);
      setFocusModeModalOpen(false);
      showToast({
        message: `Focus mode set to ${formatFocusMode(nextFocusMode)}.`,
        title: 'Profile saved',
        variant: 'success',
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to update your focus mode right now.';

      setAuthError(message);
      showToast({ message, title: 'Profile update failed', variant: 'error' });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleWpmSubmit = async (event: { preventDefault(): void }) => {
    event.preventDefault();

    const wpm = parseInt(wpmInput, 10);
    setAuthError('');

    if (!user) {
      const message = 'You need to be logged in to update your profile.';
      setAuthError(message);
      showToast({ message, title: 'Profile update failed', variant: 'error' });
      return;
    }

    if (!wpmInput || isNaN(wpm) || wpm < 100 || wpm > 1000) {
      const message = 'Please enter a WPM value between 100 and 1000.';
      setAuthError(message);
      showToast({ message, title: 'Profile update failed', variant: 'error' });
      return;
    }

    setProfileSaving(true);

    try {
      await updateDefaultWpm(wpm);
      setWpmModalOpen(false);
      showToast({
        message: `Target pace set to ${wpm} WPM.`,
        title: 'Profile saved',
        variant: 'success',
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to update your reading pace right now.';
      setAuthError(message);
      showToast({ message, title: 'Profile update failed', variant: 'error' });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleDisplayNameSubmit = async (event: { preventDefault(): void }) => {
    event.preventDefault();

    const nextDisplayName = displayNameInput.trim();
    setAuthError('');

    if (!user) {
      const message = 'You need to be logged in to update your profile.';
      setAuthError(message);
      showToast({ message, title: 'Profile update failed', variant: 'error' });
      return;
    }

    if (!nextDisplayName) {
      const message = 'Display name cannot be empty.';
      setAuthError(message);
      showToast({ message, title: 'Profile update failed', variant: 'error' });
      return;
    }

    if (nextDisplayName.length > 100) {
      const message = 'Display name must be 100 characters or fewer.';
      setAuthError(message);
      showToast({ message, title: 'Profile update failed', variant: 'error' });
      return;
    }

    setProfileSaving(true);

    try {
      await updateDisplayName(nextDisplayName);
      setDisplayNameInput(nextDisplayName);
      setDisplayNameModalOpen(false);
      showToast({
        message: 'Display name updated.',
        title: 'Profile saved',
        variant: 'success',
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to update your display name right now.';

      setAuthError(message);
      showToast({ message, title: 'Profile update failed', variant: 'error' });
    } finally {
      setProfileSaving(false);
    }
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#09090b] px-4 text-white">
        <div className="rounded-2xl border border-white/8 bg-[rgba(13,13,18,0.9)] px-6 py-5 text-sm text-zinc-400 shadow-2xl shadow-black/30">
          Loading dashboard...
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
        <div className="absolute right-[8%] top-[8%] h-130 w-130nded-full bg-abg-amber-600/8r-[130px]" />
        <div className="absolute bottom-[8%] left-[4%] h-105420px] rounded-full bg-orange-600/6 blur-[110px]" />
      </div>

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
            <Link
              href="/"
              className="hidden rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-zinc-300 transition-all hover:border-white/20 hover:bg-white/5 hover:text-white sm:block sm:px-4"
            >
              Home
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-zinc-300 transition-all hover:border-white/20 hover:bg-white/5r:text-white disabled:cursor-not-allowed disabled:opacity-60 sm:px-4"
            >
              {loggingOut ? 'Logging out...' : 'Log out'}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-4 px-3 py-6 sm:gap-6 sm:px-6 sm:py-10">
        <section className="relative overflow-hidden rounded-3xl border border-white/8 bg-[rgba(13,13,18,0.9)] px-4 py-6 shadow-2xl shadow-black/30 sm:px-8 sm:py-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-amber-500/15 blur-3xl"
          />
          <div className="relative grid gap-8 lg:grid-cols-[1fr_320px] lg:items-center">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-amber-400">
                Dashboard
              </span>
              <div className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-2">
                <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
                  Welcome back,
                </h1>
                <div className="flex items-center gap-2 pb-1">
                  <span className="bg-linear-to-r from-amber-300 to-orange-300 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:text-4xl lg:text-5xl">
                    {displayName || 'reader'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setDisplayNameInput(displayName);
                      setAuthError('');
                      setDisplayNameModalOpen(true);
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-zinc-400 transition-all hover:border-amber-400/30 hover:bg-amber-500/10 hover:text-amber-200"
                    aria-label="Edit display name"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.6"
                    >
                      <path d="M7.8 2.6 11.4 6.2M2.5 11.5l1-3.7 5.8-5.8a1.3 1.3 0 0 1 1.8 0l.9.9a1.3 1.3 0 0 1 0 1.8l-5.8 5.8-3.7 1Z" />
                    </svg>
                  </button>
                </div>
              </div>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base">
                Keep your next session focused. Your saved preferences are ready
                whenever you start reading.
              </p>
              {authError || authSessionError ? (
                <p className="mt-4 rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {authError || authSessionError}
                </p>
              ) : null}
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                Current setup
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/6 bg-black/20 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-zinc-500">Target pace</p>
                    <button
                      type="button"
                      onClick={() => {
                        setWpmInput(String(defaultWpm));
                        setAuthError('');
                        setWpmModalOpen(true);
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 text-zinc-400 transition-all hover:border-amber-400/30 hover:bg-amber-500/10 hover:text-amber-200"
                      aria-label="Edit default reading pace"
                    >
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 14 14"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.6"
                      >
                        <path d="M7.8 2.6 11.4 6.2M2.5 11.5l1-3.7 5.8-5.8a1.3 1.3 0 0 1 1.8 0l.9.9a1.3 1.3 0 0 1 0 1.8l-5.8 5.8-3.7 1Z" />
                      </svg>
                    </button>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-white">
                    {defaultWpm}
                  </p>
                  <p className="text-xs font-semibold text-amber-300">WPM</p>
                </div>
                <div className="rounded-xl border border-white/6 bg-black/20 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-zinc-500">Focus mode</p>
                    <button
                      type="button"
                      onClick={() => {
                        setFocusModeInput(
                          profile?.focus_mode || FocusMode.HIGHLIGHT,
                        );
                        setAuthError('');
                        setFocusModeModalOpen(true);
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 text-zinc-400 transition-all hover:border-amber-400/30 hover:bg-amber-500/10 hover:text-amber-200"
                      aria-label="Edit focus mode"
                    >
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 14 14"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.6"
                      >
                        <path d="M7.8 2.6 11.4 6.2M2.5 11.5l1-3.7 5.8-5.8a1.3 1.3 0 0 1 1.8 0l.9.9a1.3 1.3 0 0 1 0 1.8l-5.8 5.8-3.7 1Z" />
                      </svg>
                    </button>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-white">
                    {focusMode}
                  </p>
                  <p className="text-xs font-semibold text-amber-300">saved</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:gap-4 lg:grid-cols-[1fr_360px]">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            {dashboardStats.map(({ label, value, detail }) => (
              <div
                key={label}
                className="rounded-2xl border border-white/[0.07] bg-[rgba(13,13,18,0.86)] p-4 sm:p-5"
              >
                <p className="text-xs text-zinc-500 sm:text-sm">{label}</p>
                <p className="mt-3 text-2xl font-bold text-white sm:mt-4 sm:text-3xl">
                  {value}
                </p>
                <p className="mt-1 text-xs font-medium text-amber-300 sm:mt-2">
                  {detail}
                </p>
              </div>
            ))}
          </div>

          <section className="rounded-2xl border border-white/[0.07] bg-[rgba(13,13,18,0.86)] p-4 sm:p-6">
            <h2 className="text-lg font-bold text-white sm:text-xl">
              User info
            </h2>
            <div className="mt-5 space-y-4">
              {[
                ['Display name', displayName || 'Not set'],
                ['Email', profileEmail || 'Not available'],
                ['Target WPM', `${defaultWpm}`],
                ['Focus mode', focusMode],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-4 border-b border-white/6 last:border-b-0 last:pb-0"
                >
                  <span className="text-sm text-zinc-500">{label}</span>
                  <span className="max-w-[55%] truncate text-right text-sm font-medium text-zinc-200">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </section>

        <section className="grid gap-3 sm:gap-4 lg:grid-cols-[360px_1fr]">
          <section className="rounded-2xl border border-white/[0.07] bg-[rgba(13,13,18,0.86)] p-4 sm:p-6">
            <h2 className="text-lg font-bold text-white sm:text-xl">
              Quick actions
            </h2>
            <div className="mt-5 grid gap-3">
              {QUICK_ACTIONS.map(({ title, desc }) => (
                <button
                  key={title}
                  type="button"
                  onClick={() => handleQuickAction(title)}
                  className="rounded-xl border hover:cursor-pointer border-white/6 bg-white/3 px-4 py-4 text-left transition-all hover:border-amber-400/25 hover:bg-amber-500/6"
                >
                  <span className="text-sm cursor-pointer font-semibold text-white">
                    {title}
                  </span>
                  <span className="mt-1 block cursor-pointer text-sm text-zinc-500">
                    {desc}
                  </span>
                </button>
              ))}

              {isAnon && (
                <button
                  type="button"
                  onClick={() => setConvertModalOpen(true)}
                  className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-4 text-left transition-all hover:border-green-400/50 hover:bg-green-500/15"
                >
                  <span className="text-sm font-semibold text-green-200">
                    ✨ Create Account
                  </span>
                  <span className="mt-1 block text-sm text-green-100/70">
                    Convert to permanent login
                  </span>
                </button>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-white/[0.07] bg-[rgba(13,13,18,0.86)] p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-4 sm:mb-5">
              <div>
                <h2 className="text-lg font-bold text-white sm:text-xl">
                  Recent documents
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {recentDocumentsLoading
                    ? 'Loading your uploaded PDFs...'
                    : recentDocuments.length === 0
                    ? 'Start your first reading session to see documents here.'
                    : 'Continue from your uploaded PDFs.'}
                </p>
              </div>
            </div>

            <div className="scrollbar-hidden max-h-72 overflow-y-auto sm:max-h-96">
              {recentDocumentsError ? (
                <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-200">
                  {recentDocumentsError}
                </div>
              ) : recentDocumentsLoading ? (
                <div className="rounded-xl border border-white/8 bg-white/3 p-8 text-center">
                  <p className="text-sm text-zinc-400">
                    Loading recent documents...
                  </p>
                </div>
              ) : recentDocuments.length === 0 ? (
                <div className="rounded-xl border border-white/8 bg-white/3 p-8 text-center">
                  <p className="text-sm text-zinc-400">
                    No recent reads or documents yet.
                  </p>
                  <p className="mt-2 text-xs text-zinc-500">
                    Upload a PDF or try a sample to get started.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {recentDocuments.map(
                    ({ documentId, sessionId, title, progress, pace }) => (
                      <div
                        key={sessionId}
                        className="flex flex-col gap-3 rounded-xl border border-white/6 bg-white/3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-zinc-200">
                            {title}
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {progress}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="mr-1 text-sm font-semibold text-amber-300">
                            {pace}
                          </span>
                          <button
                            type="button"
                            onClick={() => router.push(`/session/${sessionId}`)}
                            className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-100 transition-all hover:border-amber-300/50 hover:bg-amber-500/15"
                          >
                            Read
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteDocument(documentId, title)
                            }
                            disabled={deletingDocumentId === documentId}
                            className="rounded-lg border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-200 transition-all hover:border-rose-300/50 hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingDocumentId === documentId
                              ? 'Deleting...'
                              : 'Delete'}
                          </button>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>
          </section>
        </section>
      </main>

      {wpmModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="wpm-title"
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" />
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/8 bg-[rgba(13,13,18,0.96)] p-px shadow-2xl shadow-black/60">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-24 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full bg-amber-500/20 blur-3xl"
            />
            <div className="relative rounded-[15px] bg-[rgba(9,9,11,0.9)] px-6 py-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-400">
                    Target pace
                  </p>
                  <h2
                    id="wpm-title"
                    className="mt-2 text-xl font-bold text-white"
                  >
                    Set target WPM
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setWpmModalOpen(false)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-zinc-400 transition-all hover:border-white/20 hover:bg-white/6 hover:text-white"
                  aria-label="Close WPM dialog"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="1.8"
                  >
                    <path d="M4.5 4.5l9 9M13.5 4.5l-9 9" />
                  </svg>
                </button>
              </div>

              <form className="flex flex-col gap-4" onSubmit={handleWpmSubmit}>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">
                      Words per minute
                    </span>
                    <span className="text-sm font-bold text-amber-300">
                      {wpmInput || '—'} WPM
                    </span>
                  </div>
                  <input
                    type="range"
                    min={100}
                    max={1000}
                    step={10}
                    value={wpmInput || defaultWpm}
                    onChange={(e) => setWpmInput(e.target.value)}
                    disabled={profileSaving}
                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-amber-400 disabled:cursor-not-allowed disabled:opacity-70"
                  />
                  <div className="flex justify-between text-[11px] text-zinc-600">
                    <span>100</span>
                    <span>550</span>
                    <span>1000</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {[150, 250, 350, 500].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setWpmInput(String(preset))}
                      disabled={profileSaving}
                      className="flex-1 rounded-lg border border-white/10 py-2 text-xs font-semibold text-zinc-300 transition-all hover:border-amber-400/30 hover:bg-amber-500/10 hover:text-amber-200 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="h-12 rounded-xl bg-linear-to-r from-amber-500 to-orange-600 px-6 text-sm font-semibold text-white shadow-xl shadow-amber-900/35 transition-all duration-200 hover:from-amber-400 hover:to-orange-500 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {profileSaving ? 'Saving...' : 'Save pace'}
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {focusModeModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="focus-mode-title"
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" />
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/8 bg-[rgba(13,13,18,0.96)] p-px shadow-2xl shadow-black/60">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-24 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full bg-amber-500/20 blur-3xl"
            />
            <div className="relative rounded-[15px] bg-[rgba(9,9,11,0.9)] px-6 py-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-400">
                    Reading
                  </p>
                  <h2
                    id="focus-mode-title"
                    className="mt-2 text-xl font-bold text-white"
                  >
                    Select focus mode
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setFocusModeModalOpen(false)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-zinc-400 transition-all hover:border-white/20 hover:bg-white/6 hover:text-white"
                  aria-label="Close focus mode dialog"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="1.8"
                  >
                    <path d="M4.5 4.5l9 9M13.5 4.5l-9 9" />
                  </svg>
                </button>
              </div>

              <form
                className="flex flex-col gap-4"
                onSubmit={handleFocusModeSubmit}
              >
                <div className="flex flex-col gap-3">
                  {[
                    { value: 'highlight', label: 'Highlight' },
                    { value: 'dot', label: 'Dot' },
                    { value: 'none', label: 'None' },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFocusModeInput(value as FocusMode)}
                      disabled={profileSaving}
                      className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
                        focusModeInput === value
                          ? 'border-amber-400/50 bg-amber-500/15 text-amber-200'
                          : 'border-white/10 bg-white/3 text-zinc-300 hover:border-amber-400/25 hover:bg-amber-500/6 hover:text-amber-200'
                      } disabled:cursor-not-allowed disabled:opacity-70`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="h-12 rounded-xl bg-linear-to-r from-amber-500 to-orange-600 px-6 text-sm font-semibold text-white shadow-xl shadow-amber-900/35 transition-all duration-200 hover:from-amber-400 hover:to-orange-500 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {profileSaving ? 'Saving...' : 'Save mode'}
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {displayNameModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="display-name-title"
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" />
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/8 bg-[rgba(13,13,18,0.96)] p-px shadow-2xl shadow-black/60">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-24 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full bg-amber-500/20 blur-3xl"
            />
            <div className="relative rounded-[15px] bg-[rgba(9,9,11,0.9)] px-6 py-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-400">
                    Profile
                  </p>
                  <h2
                    id="display-name-title"
                    className="mt-2 text-xl font-bold text-white"
                  >
                    Change display name
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setDisplayNameModalOpen(false)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-zinc-400 transition-all hover:border-white/20 hover:bg-white/6 hover:text-white"
                  aria-label="Close display name dialog"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="1.8"
                  >
                    <path d="M4.5 4.5l9 9M13.5 4.5l-9 9" />
                  </svg>
                </button>
              </div>

              <form
                className="flex flex-col gap-4"
                onSubmit={handleDisplayNameSubmit}
              >
                <input
                  type="text"
                  value={displayNameInput}
                  onChange={(event) => setDisplayNameInput(event.target.value)}
                  maxLength={100}
                  disabled={profileSaving}
                  className="h-12 rounded-xl border border-white/10 bg-white/4 px-4 text-sm text-white outline-none transition-all placeholder:text-zinc-600 focus:border-amber-400/50 focus:bg-white/6 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.12)] disabled:cursor-not-allowed disabled:opacity-70"
                  placeholder="Display name"
                />
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="h-12 rounded-xl bg-linear-to-r from-amber-500 to-orange-600 px-6 text-sm font-semibold text-white shadow-xl shadow-amber-900/35 transition-all duration-200 hover:from-amber-400 hover:to-orange-500 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {profileSaving ? 'Saving...' : 'Save name'}
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {progressModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="progress-title"
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" />
          <div className="relative max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-2xl border border-white/8 bg-[rgba(13,13,18,0.96)] p-px shadow-2xl shadow-black/60">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-24 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full bg-amber-500/20 blur-3xl"
            />
            <div className="scrollbar-hidden relative max-h-[90vh] overflow-y-auto rounded-[15px] bg-[rgba(9,9,11,0.9)] px-4 py-5 sm:px-6 sm:py-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-400">
                    Progress
                  </p>
                  <h2
                    id="progress-title"
                    className="mt-2 text-xl font-bold text-white"
                  >
                    Reading analytics
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setProgressModalOpen(false)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-zinc-400 transition-all hover:border-white/20 hover:bg-white/6 hover:text-white"
                  aria-label="Close progress analytics dialog"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="1.8"
                  >
                    <path d="M4.5 4.5l9 9M13.5 4.5l-9 9" />
                  </svg>
                </button>
              </div>

              {analyticsLoading ? (
                <div className="flex min-h-80 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.035] px-6 text-center text-sm text-zinc-400">
                  Loading progress analytics...
                </div>
              ) : analyticsError ? (
                <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-4 text-sm text-rose-200">
                  {analyticsError}
                </div>
              ) : (
                <ProgressAnalytics data={analyticsData} />
              )}
            </div>
          </div>
        </div>
      ) : null}

      {uploadModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-title"
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" />
          <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-white/8 bg-[rgba(13,13,18,0.96)] p-px shadow-2xl shadow-black/60">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-24 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full bg-amber-500/20 blur-3xl"
            />
            <div className="relative rounded-[15px] bg-[rgba(9,9,11,0.9)] px-6 py-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-400">
                    Reading Session
                  </p>
                  <h2
                    id="upload-title"
                    className="mt-2 text-xl font-bold text-white"
                  >
                    Upload PDF
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => !isUploading && setUploadModalOpen(false)}
                  disabled={isUploading}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-zinc-400 transition-all hover:border-white/20 hover:bg-white/6 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Close upload dialog"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="1.8"
                  >
                    <path d="M4.5 4.5l9 9M13.5 4.5l-9 9" />
                  </svg>
                </button>
              </div>

              <UploadFile
                onFileSelect={(file) => console.log('Selected:', file)}
                onUpload={handleFileUpload}
                maxSize={50}
                disabled={isUploading}
              />
            </div>
          </div>
        </div>
      ) : null}

      <ConvertAnonModal
        isOpen={convertModalOpen}
        onClose={() => setConvertModalOpen(false)}
      />
    </div>
  );
}
