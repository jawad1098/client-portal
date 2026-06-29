"use client";

import { useState } from "react";

export function InviteLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/invite/${token}`
      : `/invite/${token}`;

  return (
    <div className="card mb-6 border-green p-4">
      <p className="mb-2 text-sm font-medium text-ink">
        Invite link ready &mdash; copy and send it to the client
      </p>
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
  );
}
