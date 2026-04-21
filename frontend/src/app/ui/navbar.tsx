"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { SpeedReadLogo } from "@/components/ui/SpeedReadLogo";

export default function Navbar() {
  const router = useRouter();
  const { isAuthenticated } = useAuthSession();
  const [open, setOpen] = useState(false);

  return (
    <header
      className={cn("fixed top-0 left-0 right-0 z-50 transition-all duration-500", "bg-navbar-bg backdrop-blur-2xl border-b border-white/6 shadow-xl shadow-black/20")}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <SpeedReadLogo />
          <span className="font-bold tracking-tight text-white text-sm">
            SpeedRead
          </span>
        </Link>

        {/* Desktop CTAs */}
        <div className="hidden sm:flex items-center gap-3">
          <button
            className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
            aria-label="Log in"
          >
            Log in
          </button>

          <button className="px-4 py-2 text-sm font-semibold rounded-lg bg-linear-to-r from-amber-500 to-orange-600 text-white hover:from-amber-400 hover:to-orange-500 transition-all duration-200 shadow-lg shadow-amber-900/40 hover:shadow-amber-900/60">
            Get started free
          </button>
        </div>

        {/* Hamburger Menu — mobile only */}
        <button
          className="sm:hidden relative w-10 h-10 flex items-center justify-center rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen(!open)}
        >
          <div className="w-5 flex flex-col gap-1">
            <span
              className={cn(
                "block h-[1.5px] bg-current rounded-full origin-center transition-all duration-300",
                open && "rotate-45 translate-y-[6.5px]",
              )}
              aria-hidden="true"
            />
            <span
              className={cn(
                "block h-[1.5px] bg-current rounded-full transition-all duration-200",
                open && "opacity-0 scale-x-0",
              )}
              aria-hidden="true"
            />
            <span
              className={cn(
                "block h-[1.5px] bg-current rounded-full origin-center transition-all duration-300",
                open && "-rotate-45 -translate-y-[6.5px]",
              )}
              aria-hidden="true"
            />
          </div>
        </button>
      </div>

      {/* Mobile menu */}
      <div
        id="mobile-menu"
        className={cn(
          "fixed inset-x-0 top-16 z-40 sm:hidden transition-all duration-300 origin-top",
          open
            ? "opacity-100 scale-y-100 pointer-events-auto"
            : "opacity-0 scale-y-95 pointer-events-none",
        )}
      >
        <div className="bg-navbar-bg-mobile backdrop-blur-2xl border-b border-white/6 px-4 py-3 flex flex-col gap-2">
          <button
            className="w-full px-4 py-3 text-sm font-medium text-zinc-300 border border-white/10 rounded-xl hover:bg-white/5 hover:text-white transition-all"
            aria-label="Log in"
          >
            Log in
          </button>
          <button className="w-full px-4 py-3 text-sm font-semibold rounded-xl bg-linear-to-r from-amber-500 to-orange-600 text-white hover:from-amber-400 hover:to-orange-500 transition-all shadow-lg shadow-amber-900/40">
            Get started free
          </button>
        </div>
      </div>
    </header>
  );
}
