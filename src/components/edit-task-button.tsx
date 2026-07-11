"use client";

import { useState, useTransition } from "react";
import { updateTask } from "@/lib/actions/tasks";

type Member = { id: string; name: string };
type Client = { id: string; name: string };

type Task = {
  id: string;
  title: string;
  description: string | null;
  dueDate: Date | null;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  assigneeId: string | null;
  clientId: string | null;
};

export function EditTaskButton({
  task,
  team,
  clients,
}: {
  task: Task;
  team: Member[];
  clients: Client[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await updateTask(task.id, formData);
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  const dueDateValue = task.dueDate
    ? new Date(task.dueDate).toISOString().split("T")[0]
    : "";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-slate hover:text-green-dark"
        title="Edit task"
      >
        Edit
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 px-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="card w-full max-w-lg p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink">Edit task</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-slate hover:text-ink"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-ink">Title *</label>
                <input
                  name="title"
                  defaultValue={task.title}
                  required
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-ink">Description</label>
                <textarea
                  name="description"
                  defaultValue={task.description ?? ""}
                  rows={3}
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink">Status</label>
                  <select
                    name="status"
                    defaultValue={task.status}
                    className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green"
                  >
                    <option value="TODO">To do</option>
                    <option value="IN_PROGRESS">In progress</option>
                    <option value="DONE">Done</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-ink">Due date</label>
                  <input
                    name="dueDate"
                    type="date"
                    defaultValue={dueDateValue}
                    className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink">Assignee</label>
                  <select
                    name="assigneeId"
                    defaultValue={task.assigneeId ?? ""}
                    className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green"
                  >
                    <option value="">Unassigned</option>
                    {team.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-ink">Client</label>
                  <select
                    name="clientId"
                    defaultValue={task.clientId ?? ""}
                    className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green"
                  >
                    <option value="">No client</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-line px-4 py-2 text-sm text-slate hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-lg bg-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-dark disabled:opacity-50"
                >
                  {isPending ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
