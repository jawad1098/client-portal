"use client";

import { useState, useTransition } from "react";
import { createTasksBulk, type BulkTaskRow } from "@/lib/actions/tasks";

type Member = { id: string; name: string };
type Client = { id: string; name: string };

const EMPTY_ROW: BulkTaskRow = {
  title: "",
  description: "",
  dueDate: "",
  assigneeId: "",
  clientId: "",
  status: "TODO",
};

export function BulkTaskForm({ team, clients }: { team: Member[]; clients: Client[] }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<BulkTaskRow[]>([{ ...EMPTY_ROW }]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateRow(i: number, field: keyof BulkTaskRow, value: string) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, { ...EMPTY_ROW }]);
  }

  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await createTasksBulk(rows);
        setRows([{ ...EMPTY_ROW }]);
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create tasks");
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-8 rounded-lg bg-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-dark"
      >
        + Add tasks
      </button>
    );
  }

  return (
    <div className="card mb-8 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Add tasks</h2>
        <button onClick={() => setOpen(false)} className="text-xs text-slate hover:text-ink">
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-medium text-slate">
                <th className="pb-2 pr-2 min-w-[200px]">Title *</th>
                <th className="pb-2 pr-2 min-w-[180px]">Description</th>
                <th className="pb-2 pr-2 min-w-[130px]">Due date</th>
                <th className="pb-2 pr-2 min-w-[140px]">Assignee</th>
                <th className="pb-2 pr-2 min-w-[140px]">Client</th>
                <th className="pb-2 pr-2 min-w-[120px]">Status</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-line last:border-0">
                  <td className="py-2 pr-2">
                    <input
                      value={row.title}
                      onChange={(e) => updateRow(i, "title", e.target.value)}
                      placeholder="Task title"
                      className="w-full rounded border border-line px-2 py-1.5 text-sm outline-none focus:border-green"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      value={row.description}
                      onChange={(e) => updateRow(i, "description", e.target.value)}
                      placeholder="Optional"
                      className="w-full rounded border border-line px-2 py-1.5 text-sm outline-none focus:border-green"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="date"
                      value={row.dueDate}
                      onChange={(e) => updateRow(i, "dueDate", e.target.value)}
                      className="w-full rounded border border-line px-2 py-1.5 text-sm outline-none focus:border-green"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <select
                      value={row.assigneeId}
                      onChange={(e) => updateRow(i, "assigneeId", e.target.value)}
                      className="w-full rounded border border-line px-2 py-1.5 text-sm outline-none focus:border-green"
                    >
                      <option value="">Unassigned</option>
                      {team.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-2">
                    <select
                      value={row.clientId}
                      onChange={(e) => updateRow(i, "clientId", e.target.value)}
                      className="w-full rounded border border-line px-2 py-1.5 text-sm outline-none focus:border-green"
                    >
                      <option value="">No client</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-2">
                    <select
                      value={row.status}
                      onChange={(e) => updateRow(i, "status", e.target.value as BulkTaskRow["status"])}
                      className="w-full rounded border border-line px-2 py-1.5 text-sm outline-none focus:border-green"
                    >
                      <option value="TODO">To do</option>
                      <option value="IN_PROGRESS">In progress</option>
                      <option value="DONE">Done</option>
                    </select>
                  </td>
                  <td className="py-2">
                    {rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRow(i)}
                        className="text-slate hover:text-red-500"
                        title="Remove row"
                      >
                        &times;
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={addRow}
            className="text-sm text-slate hover:text-green-dark"
          >
            + Add row
          </button>
          <span className="flex-1" />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-dark disabled:opacity-50"
          >
            {isPending ? "Saving…" : `Save ${rows.filter((r) => r.title.trim()).length || ""} task${rows.filter((r) => r.title.trim()).length === 1 ? "" : "s"}`}
          </button>
        </div>
      </form>
    </div>
  );
}
