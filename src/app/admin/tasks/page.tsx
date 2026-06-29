import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createTask, deleteTask } from "@/lib/actions/tasks";
import { TaskStatusSelect } from "./task-status-select";
import { TaskAttachmentFields } from "./task-attachment-fields";

const COLUMNS = [
  { status: "TODO" as const, label: "To do" },
  { status: "IN_PROGRESS" as const, label: "In progress" },
  { status: "DONE" as const, label: "Done" },
];

export default async function TasksPage() {
  const session = await auth();
  const isAdmin = session?.user.role === "ADMIN";

  const [tasks, team, clients] = await Promise.all([
    prisma.task.findMany({
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      include: { assignee: true, client: true, attachments: true },
    }),
    prisma.user.findMany({ where: { role: { in: ["ADMIN", "TEAM"] } }, orderBy: { name: "asc" } }),
    prisma.client.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl text-ink">
        Tasks<span className="brand-dot">.</span>
      </h1>
      <p className="mb-6 text-sm text-slate">{tasks.length} total across all clients</p>

      <form action={createTask} className="card mb-8 flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink">Title</label>
          <input name="title" required className="w-56 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink">Description</label>
          <input name="description" className="w-64 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink">Due date</label>
          <input name="dueDate" type="date" className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink">Assignee</label>
          <select name="assigneeId" className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green">
            <option value="">Unassigned</option>
            {team.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink">Client</label>
          <select name="clientId" className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green">
            <option value="">No client</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>
        <TaskAttachmentFields />
        <button type="submit" className="rounded-lg bg-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-dark">
          Add task
        </button>
      </form>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {COLUMNS.map((column) => (
          <div key={column.status}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate">
              {column.label} ({tasks.filter((t) => t.status === column.status).length})
            </h2>
            <div className="flex flex-col gap-3">
              {tasks
                .filter((task) => task.status === column.status)
                .map((task) => {
                  const instructionCount = task.attachments.filter((a) => a.kind === "INSTRUCTION").length;
                  const proofCount = task.attachments.filter((a) => a.kind === "PROOF").length;
                  return (
                    <div key={task.id} className="card p-4">
                      <div className="flex items-start justify-between gap-2">
                        <Link href={`/admin/tasks/${task.id}`} className="font-medium text-ink hover:text-green-dark">
                          {task.title}
                        </Link>
                        {isAdmin && (
                          <form action={deleteTask.bind(null, task.id)}>
                            <button type="submit" className="text-xs text-slate hover:text-red-600">
                              &times;
                            </button>
                          </form>
                        )}
                      </div>
                      {task.description && <p className="mt-1 text-sm text-slate">{task.description}</p>}
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate">
                        {task.client && <span className="rounded-full bg-paper px-2 py-1">{task.client.name}</span>}
                        {task.assignee && <span className="rounded-full bg-paper px-2 py-1">{task.assignee.name}</span>}
                        {task.dueDate && (
                          <span className="rounded-full bg-paper px-2 py-1">
                            Due {new Date(task.dueDate).toLocaleDateString("en-GB")}
                          </span>
                        )}
                        {instructionCount > 0 && (
                          <span className="rounded-full bg-paper px-2 py-1">📎 {instructionCount}</span>
                        )}
                        {task.status === "DONE" && proofCount > 0 && (
                          <span className="rounded-full bg-paper px-2 py-1">✅ {proofCount}</span>
                        )}
                      </div>
                      <div className="mt-3">
                        <TaskStatusSelect taskId={task.id} status={task.status} />
                      </div>
                    </div>
                  );
                })}
              {tasks.filter((t) => t.status === column.status).length === 0 && (
                <p className="text-sm text-slate">Nothing here.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
