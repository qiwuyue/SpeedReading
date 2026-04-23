import Link from 'next/link';
import Navbar from './ui/navbar';
import SpeedDemo from './ui/speed-demo';

/* ─── Static data ─────────────────────────────────────────── */

const FEATURES = [
  {
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 4h12M4 8h8M4 12h10M4 16h6" />
      </svg>
    ),
    title: 'PDF upload & cleanup',
    desc: 'Upload any PDF. Our AI strips noise, fixes formatting, and makes even poorly scanned documents crisp and readable.',
  },
  {
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M10 3v14M3 10l7-7 7 7" />
      </svg>
    ),
    title: 'Adjustable reading speed',
    desc: 'Set your WPM target and session length. Choose specific sections or let the app auto-pace through your document.',
  },
  {
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="10" cy="10" r="7" />
        <path d="M10 6v4l3 3" />
      </svg>
    ),
    title: 'Comprehension tracking',
    desc: "Quick check-ins after every session measure how much you retained so you always know you're actually improving.",
  },
  {
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="3,14 7,9 11,12 17,5" />
        <path d="M16 5h1v1" />
      </svg>
    ),
    title: 'Progress over time',
    desc: 'A detailed dashboard tracks speed and comprehension scores across every session, week, and month.',
  },
  {
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="4" y="3" width="8" height="12" rx="1" />
        <rect x="8" y="6" width="8" height="11" rx="1" />
      </svg>
    ),
    title: 'Works everywhere',
    desc: 'Built as a PWA — install it on your phone or open it in any browser. Progress syncs across all your devices.',
  },
  {
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 17V6l6-3 6 3v11" />
        <rect x="8" y="10" width="4" height="7" rx="0.5" />
      </svg>
    ),
    title: 'Sample library',
    desc: 'Not ready to upload? Start with curated sample texts and explore the full app before committing to anything.',
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Upload or pick a sample',
    desc: 'Drag in your PDF or choose from our curated sample library. Guest users can jump straight in — no sign-up required.',
  },
  {
    n: '02',
    title: 'Set your session',
    desc: 'Pick how many lines or sections you want to tackle, then set your target reading speed in WPM.',
  },
  {
    n: '03',
    title: 'Read & comprehend',
    desc: 'Text streams at your pace. A short quiz after each session measures exactly how much you retained.',
  },
  {
    n: '04',
    title: 'Track your growth',
    desc: 'Speed and comprehension trends are logged automatically so you can watch yourself improve over time.',
  },
];

const AUDIENCE = [
  {
    badge: 'Standard',
    role: 'Registered users',
    desc: 'Upload PDFs, set custom WPM targets, and track long-term progress with a full comprehension history.',
  },
  {
    badge: 'Guest',
    role: 'Guest users',
    desc: 'Try sample texts and upload documents in a single session — no account needed, no data saved.',
  },
  {
    badge: 'Admin',
    role: 'Admins',
    desc: 'Curate the sample library and keep the platform running smoothly for all readers.',
  },
];

/* ─── Page ────────────────────────────────────────────────── */

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-[#09090b] text-white overflow-x-hidden">
      <Navbar />

      <main className="flex flex-col flex-1">
        {/* ── Hero ─────────────────────────────────────────── */}
        <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
          {/* Background gradient orbs */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10"
          >
            <div className="absolute top-[15%] right-[10%] w-[700px] h-[700px] rounded-full bg-amber-600/[0.07] blur-[140px] animate-float" />
            <div className="absolute bottom-[10%] left-[5%]  w-[500px] h-[500px] rounded-full bg-orange-600/[0.06] blur-[110px] animate-float-b" />
            <div className="absolute top-[50%] left-[40%]  w-[300px] h-[300px] rounded-full bg-rose-600/[0.04] blur-[90px]" />
          </div>

          {/* Dot-grid overlay */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 opacity-[0.018]"
            style={{
              backgroundImage:
                'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />

          <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-24 grid lg:grid-cols-2 gap-16 xl:gap-24 items-center">
            {/* Copy */}
            <div className="flex flex-col gap-7">
              {/* Badge */}
              <span className="inline-flex w-fit items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-widest border border-amber-500/25 bg-amber-500/10 text-amber-300">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Now available as a PWA
              </span>

              {/* Headline */}
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.04]">
                <span className="text-white">Read faster.</span>
                <br />
                <span className="bg-gradient-to-r from-amber-400 via-orange-300 to-rose-400 bg-clip-text text-transparent animate-gradient-pan">
                  Think sharper.
                </span>
              </h1>

              <p className="text-lg text-zinc-400 leading-relaxed max-w-lg">
                it does something, trust
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/login" className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold text-sm hover:from-amber-400 hover:to-orange-500 hover:-translate-y-0.5 transition-all duration-200 shadow-2xl shadow-amber-900/40 hover:shadow-amber-900/60 text-center">
                  Start reading — it&apos;s free
                </Link>
                <button className="w-full sm:w-auto px-7 py-3.5 rounded-xl border border-white/[0.1] text-zinc-300 font-semibold text-sm hover:bg-white/[0.04] hover:text-white hover:border-white/20 transition-all duration-200">
                  Try a sample →
                </button>
              </div>

              {/* Stats row */}
              <div className="flex gap-8 pt-6 border-t border-white/[0.06] mt-1">
                {[
                  { stat: '3×', label: 'faster reading' },
                  { stat: '94%', label: 'comprehension kept' },
                  { stat: '10K+', label: 'active readers' },
                ].map(({ stat, label }) => (
                  <div key={label} className="flex flex-col gap-0.5">
                    <span className="text-2xl font-bold text-white">
                      {stat}
                    </span>
                    <span className="text-xs text-zinc-500">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Speed demo widget */}
            <div className="flex items-center justify-center lg:justify-end">
              <SpeedDemo />
            </div>
          </div>
        </section>

        {/* Gradient divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-amber-500/25 to-transparent" />

        {/* ── Features ─────────────────────────────────────── */}
        <section id="features" className="py-28 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="mt-3 text-4xl sm:text-5xl font-bold text-white">
                Everything you need to level up
              </h2>
              <p className="mt-4 text-zinc-400 max-w-md mx-auto">
                Built for readers who want real, measurable results — not
                gimmicks.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {FEATURES.map(({ icon, title, desc }) => (
                <div
                  key={title}
                  className="group relative rounded-2xl p-px transition-all duration-300 bg-gradient-to-br from-white/[0.07] to-white/[0.02] hover:from-amber-500/25 hover:to-orange-500/10"
                >
                  <div className="rounded-[15px] bg-[rgba(13,13,18,0.95)] p-6 h-full flex flex-col gap-4">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/15 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:border-amber-500/40 group-hover:from-amber-500/25 group-hover:to-orange-500/25 transition-all duration-300">
                      {icon}
                    </div>
                    <h3 className="font-semibold text-white text-[15px]">
                      {title}
                    </h3>
                    <p className="text-sm text-zinc-500 leading-relaxed">
                      {desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Gradient divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />

        {/* ── How it works ─────────────────────────────────── */}
        <section
          id="how"
          className="relative py-28 px-4 sm:px-6 overflow-hidden"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-amber-950/[0.08] via-transparent to-transparent"
          />

          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-amber-400">
                Process
              </span>
              <h2 className="mt-3 text-4xl sm:text-5xl font-bold text-white">
                How it works
              </h2>
              <p className="mt-4 text-zinc-400 max-w-md mx-auto">
                Four steps from zero to triple your reading speed.
              </p>
            </div>

            <div className="relative">
              {/* Connector line */}
              <div
                aria-hidden="true"
                className="absolute left-[23px] top-[56px] w-px bg-gradient-to-b from-amber-500/60 via-amber-500/15 to-transparent"
                style={{ height: 'calc(100% - 80px)' }}
              />

              <ol className="flex flex-col gap-0">
                {STEPS.map(({ n, title, desc }, i) => (
                  <li
                    key={n}
                    className={`relative flex gap-5 items-start ${
                      i < STEPS.length - 1 ? 'pb-12' : ''
                    }`}
                  >
                    {/* Step badge */}
                    <div className="relative z-10 w-12 h-12 rounded-xl shrink-0 flex items-center justify-center bg-gradient-to-br from-amber-500 to-orange-600 border border-amber-500/30 shadow-xl shadow-amber-900/40">
                      <span className="text-xs font-black text-white/90 font-mono">
                        {n}
                      </span>
                    </div>
                    {/* Content */}
                    <div className="pt-2.5">
                      <h3 className="font-semibold text-white text-[17px] mb-1.5">
                        {title}
                      </h3>
                      <p className="text-sm text-zinc-500 leading-relaxed">
                        {desc}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* ── Audience ─────────────────────────────────────── */}
        <section className="py-24 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-amber-400">
                Who it&apos;s for
              </span>
              <h2 className="mt-3 text-4xl sm:text-5xl font-bold text-white">
                Built for every kind of reader
              </h2>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              {AUDIENCE.map(({ badge, role, desc }) => (
                <div
                  key={role}
                  className="relative rounded-2xl p-px bg-gradient-to-br from-white/[0.07] to-white/[0.02]"
                >
                  <div className="rounded-[15px] bg-[rgba(13,13,18,0.95)] px-6 py-7 h-full flex flex-col gap-4">
                    <span className="w-fit text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-500/[0.12] border border-amber-500/20 text-amber-400 uppercase tracking-wide">
                      {badge}
                    </span>
                    <h3 className="font-semibold text-white text-[15px]">
                      {role}
                    </h3>
                    <p className="text-sm text-zinc-500 leading-relaxed">
                      {desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA banner ───────────────────────────────────── */}
        <section className="px-4 sm:px-6 pb-16">
          <div className="relative max-w-7xl mx-auto rounded-3xl overflow-hidden">
            {/* Background */}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-br from-amber-900/70 via-orange-900/50 to-[#09090b]"
            />
            {/* Dot grid */}
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-[0.035]"
              style={{
                backgroundImage:
                  'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            />
            {/* Glow orbs */}
            <div
              aria-hidden="true"
              className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-amber-500/20 blur-3xl pointer-events-none"
            />
            <div
              aria-hidden="true"
              className="absolute -bottom-12 -left-12 w-72 h-72 rounded-full bg-orange-500/15 blur-3xl pointer-events-none"
            />
            {/* Top border shimmer */}
            <div
              aria-hidden="true"
              className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent"
            />

            <div className="relative px-8 sm:px-16 py-20 flex flex-col items-center text-center gap-6">
              <h2 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight max-w-lg">
                Start reading faster{' '}
                <span className="bg-gradient-to-r from-amber-300 to-orange-300 bg-clip-text text-transparent">
                  today
                </span>
              </h2>
              <p className="text-zinc-400 max-w-sm text-[15px]">
                No credit card required. Create a free account and begin your
                first session in under a minute.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mt-2">
                <button className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-white text-zinc-900 font-semibold text-sm hover:bg-zinc-100 hover:-translate-y-0.5 transition-all shadow-2xl shadow-black/40">
                  Create free account
                </button>
                <button className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-white/20 text-white font-semibold text-sm hover:bg-white/[0.06] hover:border-white/30 transition-all">
                  Try a sample first
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="px-4 sm:px-6 py-8 border-t border-white/[0.05]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0">
              <svg width="10" height="10" viewBox="0 0 13 13" fill="none">
                <path
                  d="M1.5 6.5h3.5m3 0h3M1.5 3.5h2m6 0h-3M1.5 9.5h5m3 0h-2"
                  stroke="white"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <span className="text-sm font-semibold text-white">SpeedRead</span>
            <span className="text-sm text-zinc-700">© 2026</span>
          </div>
          <span className="text-sm text-zinc-700">
            Built as a PWA - works on desktop &amp; mobile
          </span>
        </div>
      </footer>
    </div>
  );
}
