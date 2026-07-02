import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { deleteTask } from "@/lib/actions/tasks";
import { TaskStatusSelect } from "./task-status-select";
import { BulkTaskForm } from "@/components/bulk-task-form";
import { InlineTaskTitle } from "@/components/inline-task-edit";

const COLUMNS = [
  { status: "TODO" as const, label: "To do" },
  { status: "IN_PROGRESS" as const, label: "In progress" },
  { status: "DONE" as const, label: "Done" },
];

export default async function TasksPage() {
  const session = await auth();
  const isAdmin = session?.user.role === "ADMIN";
  const userId = session?.user.id;

  const [tasks, team, clients] = await Promise.all([
    prisma.task.findMany({
      where: isAdmin ? undefined : { assigneeId: userId },
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
      <p className="mb-6 text-sm text-slate">
        {isAdmin
          ? `${tasks.length} total across all clients`
          : `${tasks.length} task${tasks.length === 1 ? "" : "s"} assigned to you`}
      </p>

      {isAdmin && <BulkTaskForm team={team} clients={clients} />}

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
                        <div className="flex-1 min-w-0">
                          <InlineTaskTitle taskId={task.id} title={task.title} />
                        </div>
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
