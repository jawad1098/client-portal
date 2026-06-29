import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day + 6) % 7; // make Monday the start
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeekLabel(date: Date) {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "TEAM")) {
    redirect("/login");
  }

  const WEEKS = 8;
  const now = new Date();
  const thisWeekStart = startOfWeek(now);
  const rangeStart = new Date(thisWeekStart);
  rangeStart.setDate(rangeStart.getDate() - (WEEKS - 1) * 7);

  const [tasks, team, clients] = await Promise.all([
    prisma.task.findMany({
      select: { id: true, status: true, createdAt: true, updatedAt: true, assigneeId: true, clientId: true },
    }),
    prisma.user.findMany({ where: { role: { in: ["ADMIN", "TEAM"] } }, orderBy: { name: "asc" } }),
    prisma.client.findMany({ orderBy: { name: "asc" } }),
  ]);

  // Task throughput per week
  const weeks: { start: Date; created: number; completed: number }[] = [];
  for (let i = 0; i < WEEKS; i++) {
    const start = new Date(rangeStart);
    start.setDate(start.getDate() + i * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const created = tasks.filter((t) => t.createdAt >= start && t.createdAt < end).length;
    const completed = tasks.filter(
      (t) => t.status === "DONE" && t.updatedAt >= start && t.updatedAt < end
    ).length;
    weeks.push({ start, created, completed });
  }
  const maxWeekValue = Math.max(1, ...weeks.map((w) => Math.max(w.created, w.completed)));

  // Team workload — open tasks per member
  const workload = team.map((member) => ({
    name: member.name,
    openCount: tasks.filter((t) => t.assigneeId === member.id && t.status !== "DONE").length,
  }));
  const unassignedOpen = tasks.filter((t) => !t.assigneeId && t.status !== "DONE").length;
  const maxWorkload = Math.max(1, ...workload.map((w) => w.openCount), unassignedOpen);

  // Completion rate by client
  const completionByClient = clients.map((client) => {
    const clientTasks = tasks.filter((t) => t.clientId === client.id);
    const done = clientTasks.filter((t) => t.status === "DONE").length;
    const rate = clientTasks.length > 0 ? Math.round((done / clientTasks.length) * 100) : 0;
    return { name: client.name, total: clientTasks.length, done, rate };
  });

  const totalDone = tasks.filter((t) => t.status === "DONE").length;
  const overallRate = tasks.length > 0 ? Math.round((totalDone / tasks.length) * 100) : 0;

  // ClientStat trends — group by client + label across months
  const allStats = await prisma.clientStat.findMany({
    orderBy: { month: "asc" },
    include: { client: true },
  });
  const trendsByClient = new Map<string, Map<string, { month: string; value: string }[]>>();
  for (const stat of allStats) {
    if (!trendsByClient.has(stat.clientId)) {
      trendsByClient.set(stat.clientId, new Map());
    }
    const labelMap = trendsByClient.get(stat.clientId)!;
    if (!labelMap.has(stat.label)) {
      labelMap.set(stat.label, []);
    }
    labelMap.get(stat.label)!.push({ month: stat.month, value: stat.value });
  }
  const trendEntries = Array.from(trendsByClient.entries())
    .map(([clientId, labelMap]) => ({
      client: allStats.find((s) => s.clientId === clientId)?.client.name ?? "Unknown",
      labels: Array.from(labelMap.entries())
        .map(([label, points]) => ({ label, points }))
        .filter((l) => l.points.length > 1),
    }))
    .filter((entry) => entry.labels.length > 0);

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-2xl text-ink">
          Analytics<span className="brand-dot">.</span>
        </h1>
        <p className="mb-6 text-sm text-slate">Throughput, workload, and completion across the agency.</p>
      </div>

      {/* Task throughput */}
      <section>
        <h2 className="mb-3 text-lg text-ink">Task throughput (last {WEEKS} weeks)</h2>
        <div className="card p-4">
          <div className="mb-2 flex items-center gap-4 text-xs text-slate">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-green" /> Created
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-ink" /> Completed
            </span>
          </div>
          <div className="flex items-end gap-3" style={{ height: 160 }}>
            {weeks.map((week) => (
              <div key={week.start.toISOString()} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex items-end gap-1" style={{ height: 130 }}>
                  <div
                    className="w-3 rounded-t bg-green"
                    style={{ height: `${(week.created / maxWeekValue) * 130}px` }}
                    title={`Created: ${week.created}`}
                  />
                  <div
                    className="w-3 rounded-t bg-ink"
                    style={{ height: `${(week.completed / maxWeekValue) * 130}px` }}
                    title={`Completed: ${week.completed}`}
                  />
                </div>
                <span className="text-[0.65rem] text-mist">{formatWeekLabel(week.start)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team workload */}
      <section>
        <h2 className="mb-3 text-lg text-ink">Team workload (open tasks)</h2>
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-ink text-paper">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Member</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Open tasks</th>
              </tr>
            </thead>
            <tbody>
              {workload.map((member) => (
                <tr key={member.name} className="border-t border-line">
                  <td className="px-4 py-3 text-ink">{member.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 rounded-full bg-paper">
                        <div
                          className="h-2 rounded-full bg-green"
                          style={{ width: `${(member.openCount / maxWorkload) * 100}%` }}
                        />
                      </div>
                      <span className="w-6 text-right text-slate">{member.openCount}</span>
                    </div>
                  </td>
                </tr>
              ))}
              <tr className="border-t border-line">
                <td className="px-4 py-3 text-slate">Unassigned</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 rounded-full bg-paper">
                      <div
                        className="h-2 rounded-full bg-mist"
                        style={{ width: `${(unassignedOpen / maxWorkload) * 100}%` }}
                      />
                    </div>
                    <span className="w-6 text-right text-slate">{unassignedOpen}</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Completion rate */}
      <section>
        <h2 className="mb-3 text-lg text-ink">
          Task completion rate <span className="text-slate">({overallRate}% overall)</span>
        </h2>
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-ink text-paper">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Client</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Done / Total</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Rate</th>
              </tr>
            </thead>
            <tbody>
              {completionByClient.map((client) => (
                <tr key={client.name} className="border-t border-line">
                  <td className="px-4 py-3 text-ink">{client.name}</td>
                  <td className="px-4 py-3 text-slate">
                    {client.done} / {client.total}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-32 rounded-full bg-paper">
                        <div className="h-2 rounded-full bg-green" style={{ width: `${client.rate}%` }} />
                      </div>
                      <span className="text-slate">{client.rate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
              {completionByClient.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-slate">
                    No client tasks yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Client stat trends */}
      <section>
        <h2 className="mb-3 text-lg text-ink">Client stat trends</h2>
        <div className="flex flex-col gap-4">
          {trendEntries.map((entry) => (
            <div key={entry.client} className="card p-4">
              <b className="font-display block">{entry.client}</b>
              <div className="mt-3 flex flex-col gap-3">
                {entry.labels.map((labelEntry) => (
                  <div key={labelEntry.label}>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate">{labelEntry.label}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {labelEntry.points.map((point) => (
                        <span key={point.month} className="rounded-full bg-paper px-2 py-1 text-xs text-ink">
                          {point.month}: <b>{point.value}</b>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {trendEntries.length === 0 && (
            <p className="text-sm text-slate">No clients with multiple months of stats yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
