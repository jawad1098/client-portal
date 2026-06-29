"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { endImpersonation } from "@/lib/actions/impersonate";

export function ImpersonationBanner({ viewingAs }: { viewingAs: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleReturn() {
    setError(null);
    startTransition(async () => {
      try {
        const { token } = await endImpersonation();
        const result = await signIn("impersonate", { token, redirect: false });
        if (result?.error) {
          throw new Error("Couldn't return to admin");
        }
        window.location.href = "/admin";
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 bg-green px-4 py-2 text-sm text-white">
      <span>
        Viewing as <strong>{viewingAs}</strong> &mdash; for testing only.
      </span>
      <div className="flex items-center gap-2">
        {error && <span className="text-xs text-white/90">{error}</span>}
        <button
          type="button"
          onClick={handleReturn}
          disabled={isPending}
          className="rounded-lg bg-white/15 px-3 py-1 text-xs font-semibold hover:bg-white/25 disabled:opacity-60"
        >
          {isPending ? "Returning..." : "Return to admin"}
        </button>
      </div>
    </div>
  );
}
