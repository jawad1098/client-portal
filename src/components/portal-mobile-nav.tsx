"use client";

import { useState } from "react";
import Link from "next/link";

type NavItem = { href: string; label: string };

/**
 * Mobile-only hamburger that opens a dropdown/drawer of the portal nav links.
 * Hidden on md+ where the always-visible nav row in portal/layout.tsx takes
 * over.
 */
export function PortalMobileNav({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open menu"
        className="rounded-lg px-2 py-2 text-paper/90 transition hover:bg-white/10"
      >
        <span className="block h-0.5 w-6 bg-current" />
        <span className="mt-1.5 block h-0.5 w-6 bg-current" />
        <span className="mt-1.5 block h-0.5 w-6 bg-current" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[90]" onClick={() => setOpen(false)}>
          <div className="absolute inset-x-0 top-0 z-[91] flex flex-col gap-1 bg-ink px-6 py-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-paper/90 transition hover:bg-white/10"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
