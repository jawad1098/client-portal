"use client";

import { useState, useTransition, useRef } from "react";
import { addTeamResource, addClientResource } from "@/lib/actions/resources";

interface Props {
  clientId?: string; // if set, adds a client resource; otherwise adds a team resource
}

export function AddResourceForm({ clientId }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        if (clientId) {
          await addClientResource(clientId, fd);
        } else {
          await addTeamResource(fd);
        }
        formRef.current?.reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong. Check the file type and try again.");
      }
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="card flex flex-wrap items-end gap-3 p-4"
    >
      <div>
        <label className="mb-1 block text-xs font-medium text-ink">Title</label>
        <input
          name="title"
          required
          disabled={isPending}
          className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green disabled:opacity-60"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-ink">URL (or upload a file)</label>
        <input
          name="url"
          type="url"
          disabled={isPending}
          className="w-56 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green disabled:opacity-60"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-ink">Upload a file (max 10 MB)</label>
        <input
          name="file"
          type="file"
          disabled={isPending}
          className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green disabled:opacity-60"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-ink">Description</label>
        <input
          name="description"
          disabled={isPending}
          className="w-56 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green disabled:opacity-60"
        />
      </div>
      <div className="flex flex-col gap-1">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-dark disabled:opacity-60"
        >
          {isPending ? "Uploading…" : "Add resource"}
        </button>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </form>
  );
}
