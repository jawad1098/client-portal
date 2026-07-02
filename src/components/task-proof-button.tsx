"use client";

import { useState, useRef, useTransition } from "react";
import { addTaskAttachment } from "@/lib/actions/tasks";

export function TaskProofButton({ taskId }: { taskId: string }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"url" | "file">("url");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formRef.current) return;
    setError(null);
    const formData = new FormData(formRef.current);
    startTransition(async () => {
      try {
        await addTaskAttachment(taskId, "PROOF", formData);
        formRef.current?.reset();
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-2 text-xs text-slate hover:text-green-dark"
      >
        + Add proof
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-line bg-paper p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-ink">Add proof</span>
        <button
          onClick={() => { setOpen(false); setError(null); }}
          className="text-xs text-slate hover:text-ink"
        >
          Cancel
        </button>
      </div>

      <div className="mb-2 flex gap-2">
        <button
          type="button"
          onClick={() => setMode("url")}
          className={`rounded px-2 py-1 text-xs ${mode === "url" ? "bg-green text-white" : "border border-line text-slate hover:border-green"}`}
        >
          URL
        </button>
        <button
          type="button"
          onClick={() => setMode("file")}
          className={`rounded px-2 py-1 text-xs ${mode === "file" ? "bg-green text-white" : "border border-line text-slate hover:border-green"}`}
        >
          Upload file
        </button>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-2">
        <input
          name="label"
          placeholder="Label (optional)"
          className="rounded border border-line px-2 py-1.5 text-xs outline-none focus:border-green"
        />
        {mode === "url" ? (
          <input
            name="url"
            type="url"
            placeholder="https://..."
            className="rounded border border-line px-2 py-1.5 text-xs outline-none focus:border-green"
          />
        ) : (
          <input
            name="file"
            type="file"
            className="rounded border border-line px-2 py-1.5 text-xs"
          />
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-green px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-dark disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save proof"}
        </button>
      </form>
    </div>
  );
}
