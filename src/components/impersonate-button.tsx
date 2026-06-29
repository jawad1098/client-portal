"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { startImpersonation } from "@/lib/actions/impersonate";

export function ImpersonateButton({
  targetUserId,
  label = "View as",
  className,
}: {
  targetUserId: string;
  label?: string;
  className?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        const { token, role } = await startImpersonation(targetUserId);
        const result = await signIn("impersonate", { token, redirect: false });
        if (result?.error) {
          throw new Error("Couldn't switch view");
        }
        window.location.href = role === "CLIENT" ? "/portal" : "/admin";
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <span>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={className ?? "text-xs font-semibold text-green-dark hover:underline disabled:opacity-60"}
      >
        {isPending ? "Switching..." : label}
      </button>
      {error && <span className="ml-2 text-xs text-red-600">{error}</span>}
    </span>
  );
}
