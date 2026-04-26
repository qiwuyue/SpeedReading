"use client";

import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type ProgressAnalyticsData = {
  // This component is intentionally presentational: callers prepare these
  // aggregate values from any data source and pass the final chart-ready shape.
  summary: {
    totalWordsRead: number;
    averageWpm: number;
    completedSessions: number;
    averageQuizScore: number | null;
  };
  dailyWords: { date: string; wordsRead: number }[];
  wpmTrend: { date: string; wpm: number }[];
  quizScores: { date: string; score: number }[];
};

type ProgressAnalyticsProps = {
  data: ProgressAnalyticsData;
};

const numberFormatter = new Intl.NumberFormat("en-US");
const chartText = "#a1a1aa";
const gridStroke = "rgba(255,255,255,0.08)";
const tooltipStyle = {
  backgroundColor: "rgba(13,13,18,0.96)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "12px",
  color: "#f4f4f5",
};

// Shared empty state keeps the chart panels stable even when one dataset is
// missing, so the dashboard layout does not jump between loading/data states.
function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/3 px-6 text-center text-sm text-zinc-500">
      {message}
    </div>
  );
}

// Small wrapper for consistent chart chrome. Recharts still receives its normal
// children, but the parent decides whether to show the chart or an empty state.
function ChartPanel({
  children,
  emptyMessage,
  hasData,
  title,
}: {
  children: ReactNode;
  emptyMessage: string;
  hasData: boolean;
  title: string;
}) {
  return (
    <section className="rounded-2xl border border-white/[0.07] bg-[rgba(13,13,18,0.86)] p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-white sm:text-base">{title}</h3>
      <div className="mt-4 h-64">
        {hasData ? children : <EmptyChart message={emptyMessage} />}
      </div>
    </section>
  );
}

export default function ProgressAnalytics({ data }: ProgressAnalyticsProps) {
  // Summary cards are derived only from the `data` prop. No database access or
  // fetching belongs here, which keeps this component reusable in other pages.
  const summaryCards = [
    {
      label: "Total Words Read",
      value: numberFormatter.format(data.summary.totalWordsRead),
      tone: "text-amber-300",
    },
    {
      label: "Average WPM",
      value: numberFormatter.format(data.summary.averageWpm),
      tone: "text-orange-300",
    },
    {
      label: "Completed Sessions",
      value: numberFormatter.format(data.summary.completedSessions),
      tone: "text-emerald-300",
    },
    {
      label: "Average Quiz Score",
      value:
        data.summary.averageQuizScore === null
          ? "No scores"
          : `${Math.round(data.summary.averageQuizScore)}%`,
      tone: "text-sky-300",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(({ label, value, tone }) => (
          <div
            key={label}
            className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              {label}
            </p>
            <p className={`mt-3 text-2xl font-bold ${tone}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {/* ResponsiveContainer lets each chart fill the available panel width. */}
        <ChartPanel
          title="Daily Words Read"
          hasData={data.dailyWords.length > 0}
          emptyMessage="No daily reading data yet."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.dailyWords} margin={{ left: -12, right: 8 }}>
              <CartesianGrid stroke={gridStroke} vertical={false} />
              <XAxis
                dataKey="date"
                stroke={chartText}
                tickLine={false}
                axisLine={false}
                fontSize={12}
              />
              <YAxis
                stroke={chartText}
                tickLine={false}
                axisLine={false}
                fontSize={12}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ fill: "rgba(245,158,11,0.08)" }}
              />
              <Bar dataKey="wordsRead" fill="#f59e0b" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel
          title="WPM Trend"
          hasData={data.wpmTrend.length > 0}
          emptyMessage="No WPM trend data yet."
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.wpmTrend} margin={{ left: -12, right: 8 }}>
              <CartesianGrid stroke={gridStroke} vertical={false} />
              <XAxis
                dataKey="date"
                stroke={chartText}
                tickLine={false}
                axisLine={false}
                fontSize={12}
              />
              <YAxis
                stroke={chartText}
                tickLine={false}
                axisLine={false}
                fontSize={12}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="wpm"
                stroke="#fb923c"
                strokeWidth={3}
                dot={{ fill: "#fb923c", strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel
          title="Comprehension Score"
          hasData={data.quizScores.length > 0}
          emptyMessage="No comprehension score data yet."
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.quizScores} margin={{ left: -12, right: 8 }}>
              <CartesianGrid stroke={gridStroke} vertical={false} />
              <XAxis
                dataKey="date"
                stroke={chartText}
                tickLine={false}
                axisLine={false}
                fontSize={12}
              />
              <YAxis
                domain={[0, 100]}
                stroke={chartText}
                tickLine={false}
                axisLine={false}
                fontSize={12}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value) => [`${value}%`, "Score"]}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#38bdf8"
                strokeWidth={3}
                dot={{ fill: "#38bdf8", strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>
    </div>
  );
}
