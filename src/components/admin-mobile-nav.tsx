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
      <div className="flex items-center justify-between bg-ink px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="rounded-lg px-2 py-1 text-paper/90 transition hover:bg-white/10"
        >
          <span className="block h-0.5 w-6 bg-current" />
          <span className="mt-1.5 block h-0.5 w-6 bg-current" />
          <span className="mt-1.5 block h-0.5 w-6 bg-current" />
        </button>
        <span className="text-[0.7rem] uppercase tracking-wider text-mist">Admin</span>
      </div>

      {open && (
        <div className="fixed inset-0 z-[90] flex">
          <div className="absolute inset-0 bg-ink/60" onClick={() => setOpen(false)} />
          <aside className="relative z-[91] flex w-60 flex-none flex-col bg-ink px-5 py-6">
            {children}
          </aside>
        </div>
      )}
    </div>
  );
}
