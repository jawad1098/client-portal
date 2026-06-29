"use client";

import { useState, useTransition } from "react";
import { inviteTeamMember } from "@/lib/actions/team";

export function TeamInviteForm({ initialToken }: { initialToken?: string }) {
  const [token, setToken] = useState<string | null>(initialToken ?? null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        const newToken = await inviteTeamMember(formData);
        setToken(newToken);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  const url = token
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/invite/${token}`
    : null;

  return (
    <div>
      {url && (
        <div className="card mb-4 border-green p-4">
          <p className="mb-2 text-sm font-medium text-ink">Invite link ready &mdash; copy and send it</p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={url}
              className="flex-1 rounded-lg border border-line bg-paper px-3 py-2 text-xs text-slate"
              onFocus={(event) => event.currentTarget.select()}
            />
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="rounded-lg bg-green px-3 py-2 text-xs font-semibold text-white hover:bg-green-dark"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}

      <form action={handleSubmit} className="card flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink">Name</label>
          <input name="name" required className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink">Email</label>
          <input name="email" required type="email" className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-dark disabled:opacity-60"
        >
          {isPending ? "Sending..." : "Add team member"}
        </button>
      </form>
    </div>
  );
}
