"use client";

import { useState, useTransition } from "react";
import { resetTeamMemberPassword } from "@/lib/actions/team";

export function ResetPasswordButton({ userId }: { userId: string }) {
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        const password = await resetTeamMemberPassword(userId);
        setTempPassword(password);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <div>
      {tempPassword && (
        <div className="card mb-3 border-green p-3">
          <p className="mb-1 text-xs font-medium text-ink">
            New temporary password &mdash; share this with them directly, it won&apos;t be shown again
          </p>
          <code className="block rounded bg-paper px-2 py-1 text-sm font-semibold text-green-dark">
            {tempPassword}
          </code>
        </div>
      )}
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="rounded-lg border border-line px-3 py-2 text-sm text-slate hover:border-green hover:text-green-dark disabled:opacity-60"
      >
        {isPending ? "Resetting..." : "Reset password"}
      </button>
    </div>
  );
}
