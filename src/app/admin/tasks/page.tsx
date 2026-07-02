import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { deleteTask } from "@/lib/actions/tasks";
import { TaskStatusSelect } from "./task-status-select";
import { TaskFilters } from "./task-filters";
import { BulkTaskForm } from "@/components/bulk-task-form";
import { InlineTaskTitle } from "@/components/inline-task-edit";
import { TaskProofButton } from "@/components/task-proof-button";

const COLUMNS = [
  { status: "TODO" as const, label: "To do" },
  { status: "IN_PROGRESS" as const, label: "In progress" },
  { status: "DONE" as const, label: "Done" },
];

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function TasksPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  const isAdmin = session?.user.role === "ADMIN";
  const userId = session?.user.id;

  const params = await searchParams;
  const filterStatus = typeof params.status === "string" ? params.status : "";
  const filterAssigneeId = typeof params.assigneeId === "string" ? params.assigneeId : "";
  const filterClientId = typeof params.clientId === "string" ? params.clientId : "";
  const filterDue = typeof params.due === "string" ? params.due : "";

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const endOfWeek = new Date(startOfToday);
  endOfWeek.setDate(startOfToday.getDate() + (6 - startOfToday.getDay()));

  // Build due-date filter
  type DateFilter = { lt?: Date; gte?: Date; lte?: Date } | null;
  let dueDateWhere: DateFilter = null;
  let noDueDate = false;
  if (filterDue === "overdue") dueDateWhere = { lt: startOfToday };
  else if (filterDue === "today") dueDateWhere = { gte: startOfToday, lte: endOfToday };
  else if (filterDue === "this_week") dueDateWhere = { gte: startOfToday, lte: endOfWeek };
  else if (filterDue === "no_date") noDueDate = true;

  const [tasks, team, clients] = await Promise.all([
    prisma.task.findMany({
      where: {
        ...(isAdmin ? {} : { assigneeId: userId }),
        ...(filterStatus ? { status: filterStatus as "TODO" | "IN_PROGRESS" | "DONE" } : {}),
        ...(filterAssigneeId === "__unassigned__"
          ? { assigneeId: null }
          : filterAssigneeId
          ? { assigneeId: filterAssigneeId }
          : {}),
        ...(filterClientId === "__none__"
          ? { clientId: null }
          : filterClientId
          ? { clientId: filterClientId }
          : {}),
        ...(noDueDate
          ? { dueDate: null }
          : dueDateWhere
          ? { dueDate: dueDateWhere }
          : {}),
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      include: { assignee: true, client: true, attachments: true },
    }),
    prisma.user.findMany({ where: { role: { in: ["ADMIN", "TEAM"] } }, orderBy: { name: "asc" } }),
    prisma.client.findMany({ orderBy: { name: "asc" } }),
  ]);

  const activeFilters = [filterStatus, filterAssigneeId, filterClientId, filterDue].filter(Boolean).length;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl text-ink">
            Tasks<span className="brand-dot">.</span>
          </h1>
          <p className="mt-1 text-sm text-slate">
            {isAdmin
              ? `${tasks.length} task${tasks.length === 1 ? "" : "s"}${activeFilters > 0 ? " matching filters" : " total"}`
              : `${tasks.length} task${tasks.length === 1 ? "" : "s"} assigned to you`}
          </p>
        </div>
        {isAdmin && <BulkTaskForm team={team} clients={clients} />}
      </div>

      <TaskFilters team={team} clients={clients} isAdmin={isAdmin} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {COLUMNS.map((column) => {
          const columnTasks = tasks.filter((t) => t.status === column.status);
          return (
            <div key={column.status}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate">
                {column.label} ({columnTasks.length})
              </h2>
              <div className="flex flex-col gap-3">
                {columnTasks.map((task) => {
                  const instructionCount = task.attachments.filter((a) => a.kind === "INSTRUCTION").length;
                  const proofCount = task.attachments.filter((a) => a.kind === "PROOF").length;
                  const isOverdue =
                    task.dueDate && task.status !== "DONE" && new Date(task.dueDate) < startOfToday;
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
                      {task.description && (
                        <p className="mt-1 text-sm text-slate">{task.description}</p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate">
                        {task.client && (
                          <span className="rounded-full bg-paper px-2 py-1">{task.client.name}</span>
                        )}
                        {task.assignee && (
                          <span className="rounded-full bg-paper px-2 py-1">{task.assignee.name}</span>
                        )}
                        {task.dueDate && (
                          <span
                            className={`rounded-full px-2 py-1 ${
                              isOverdue ? "bg-red-50 text-red-600" : "bg-paper"
                            }`}
                          >
                            {isOverdue ? "Overdue · " : "Due "}
                            {new Date(task.dueDate).toLocaleDateString("en-GB")}
                          </span>
                        )}
                        {instructionCount > 0 && (
                          <span className="rounded-full bg-paper px-2 py-1">📎 {instructionCount}</span>
                        )}
                        {proofCount > 0 && (
                          <Link href={`/admin/tasks/${task.id}`} className="rounded-full bg-paper px-2 py-1 hover:text-green-dark">
                            ✅ {proofCount} proof{proofCount > 1 ? "s" : ""}
                          </Link>
                        )}
                      </div>
                      <div className="mt-3">
                        <TaskStatusSelect taskId={task.id} status={task.status} />
                      </div>
                      <TaskProofButton taskId={task.id} />
                    </div>
                  );
                })}
                {columnTasks.length === 0 && (
                  <p className="text-sm text-slate">Nothing here.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
