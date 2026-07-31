"use client";

import { useState } from "react";

/**
 * Mobile-only top bar with a hamburger button that slides in the same sidebar
 * content (passed as children) as a drawer with a backdrop. Hidden entirely
 * on md+ where the always-visible sidebar in admin/layout.tsx takes over.
 */
export function AdminMobileNav({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <div className="flex h-14 items-center justify-between bg-ink px-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="-ml-1 flex h-11 w-11 flex-none flex-col items-center justify-center gap-1.5 rounded-lg text-paper/90 transition active:bg-white/10"
        >
          <span className="block h-0.5 w-5 bg-current" />
          <span className="block h-0.5 w-5 bg-current" />
          <span className="block h-0.5 w-5 bg-current" />
        </button>
        <span className="text-[0.7rem] uppercase tracking-wider text-mist">Admin</span>
        <span className="w-11" aria-hidden />
      </div>

      {open && (
        <div className="fixed inset-0 z-[90] flex">
          <div className="absolute inset-0 bg-ink/60 transition-opacity" onClick={() => setOpen(false)} />
          <aside className="relative z-[91] flex w-[80vw] max-w-72 flex-none flex-col bg-ink px-5 py-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-lg text-paper/70 transition active:bg-white/10"
            >
              <span className="relative block h-5 w-5">
                <span className="absolute left-0 top-1/2 block h-0.5 w-5 -translate-y-1/2 rotate-45 bg-current" />
                <span className="absolute left-0 top-1/2 block h-0.5 w-5 -translate-y-1/2 -rotate-45 bg-current" />
              </span>
            </button>
            {children}
          </aside>
        </div>
      )}
    </div>
  );
}
