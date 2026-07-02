"use client";

import { useState, useTransition } from "react";
import { updateResource } from "@/lib/actions/resources";

interface Resource {
  id: string;
  title: string;
  description: string | null;
  url: string;
  filename: string | null;
}

export function EditResourceButton({ resource }: { resource: Resource }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-slate hover:text-green-dark"
      >
        Edit
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="card w-full max-w-md p-6">
        <h3 className="mb-4 text-base font-semibold text-ink">Edit resource</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              try {
                await updateResource(resource.id, fd);
                setOpen(false);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Something went wrong.");
              }
            });
          }}
          className="flex flex-col gap-3"
        >
          <div>
            <label className="mb-1 block text-xs font-medium text-ink">Title</label>
            <input
              name="title"
              required
              defaultValue={resource.title}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink">Description</label>
            <input
              name="description"
              defaultValue={resource.description ?? ""}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink">
              URL{resource.filename ? " (leave blank to keep current file)" : ""}
            </label>
            <input
              name="url"
              type="url"
              defaultValue={resource.filename ? "" : resource.url}
              placeholder={resource.filename ? "Or replace with a URL" : "https://..."}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink">
              Replace file{resource.filename ? ` (currently: ${resource.filename})` : " (optional)"}
            </label>
            <input
              name="file"
              type="file"
              className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-dark disabled:opacity-60"
            >
              {isPending ? "Saving..." : "Save changes"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={isPending}
              className="text-sm text-slate hover:underline"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
