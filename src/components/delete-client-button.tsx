"use client";

import { useState, useTransition } from "react";
import { deleteClient } from "@/lib/actions/clients";

export function DeleteClientButton({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
      >
        Remove client
      </button>
    );
  }

  return (
    <div className="card border-red-300 p-4">
      <p className="mb-3 text-sm text-ink">
        Permanently delete <strong>{clientName}</strong>? This removes their portal users, stats, checklist,
        links, reports, resources, updates, invites, messages, invoices, milestones, and bookings. Tasks linked
        to them stay, just unlinked. This can&apos;t be undone.
      </p>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              try {
                await deleteClient(clientId);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Something went wrong.");
              }
            });
          }}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {isPending ? "Removing..." : "Yes, delete permanently"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={isPending}
          className="text-sm text-slate hover:underline"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
