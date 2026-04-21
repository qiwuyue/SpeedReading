/**
 * SpeedReadLogo — Extracted logo component
 * Part of the Navbar
 */

export function SpeedReadLogo() {
  return (
    <div className="relative w-7 h-7 rounded-lg bg-linear-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0 shadow-lg shadow-amber-900/50 group-hover:shadow-amber-900/80 transition-shadow">
      <svg
        width="13"
        height="13"
        viewBox="0 0 13 13"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M1.5 6.5h3.5m3 0h3M1.5 3.5h2m6 0h-3M1.5 9.5h5m3 0h-2"
          stroke="white"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
