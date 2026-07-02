import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ReportApproveButton } from "@/components/report-approve-button";

const PERIOD_LABELS: Record<string, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
};

function formatAmount(amount: number) {
  return `$${(amount / 100).toFixed(2)}`;
}

export default async function PortalPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "CLIENT" || !session.user.clientId) {
    redirect("/login");
  }

  const clientId = session.user.clientId;

  const [client, openTicketCount, nextBooking, outstandingInvoices, unreadCount] = await Promise.all([
    prisma.client.findUnique({
      where: { id: clientId },
      include: {
        stats: { orderBy: { order: "asc" } },
        checklist: { orderBy: { order: "asc" } },
        links: { orderBy: { order: "asc" } },
        reports: { orderBy: { createdAt: "desc" } },
        updates: { orderBy: { createdAt: "desc" } },
        milestones: { orderBy: { date: "asc" } },
      },
    }),
    prisma.ticket.count({ where: { clientId, status: { not: "RESOLVED" } } }),
    prisma.booking.findFirst({
      where: { clientId, status: "CONFIRMED", startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
    }),
    prisma.invoice.findMany({ where: { clientId, status: { in: ["SENT", "OVERDUE"] } } }),
    prisma.notification.count({ where: { userId: session.user.id, read: false } }),
  ]);

  if (!client) {
    redirect("/login");
  }

  const latestMonth = client.stats[0]?.month;
  const outstandingTotal = outstandingInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const liveDoneCount = client.checklist.filter((item) => item.done).length;
  const nextMilestone = client.milestones.find((m) => !m.done);

  return (
    <div className="flex flex-col gap-12">
      <section>
        <p className="text-sm text-slate">Welcome back,</p>
        <h1 className="text-2xl text-ink md:text-3xl">
          {client.name}
          <span className="brand-dot">.</span>
        </h1>

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="card p-4">
            <div className="stat-num">
              {nextBooking ? new Date(nextBooking.startsAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—"}
            </div>
            <div className="stat-label">
              {nextBooking
                ? `Next call, ${new Date(nextBooking.startsAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`
                : "No call booked"}
            </div>
          </div>
          <div className="card p-4">
            <div className="stat-num">{liveDoneCount}/{client.checklist.length || 0}</div>
            <div className="stat-label">Parts of your system live</div>
          </div>
          <div className="card p-4">
            <div className="stat-num">
              <em>{openTicketCount}</em>
            </div>
            <div className="stat-label">Open support request{openTicketCount === 1 ? "" : "s"}</div>
          </div>
          <div className="card p-4">
            <div className="stat-num">{outstandingTotal > 0 ? formatAmount(outstandingTotal) : "$0.00"}</div>
            <div className="stat-label">Outstanding invoices</div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/portal/book" className="rounded-lg bg-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-dark">
            Book a call
          </Link>
          <Link href="/portal/support" className="rounded-lg border border-line px-4 py-2 text-sm text-ink hover:border-green hover:text-green-dark">
            Raise a request
          </Link>
          <Link href="/portal/billing" className="rounded-lg border border-line px-4 py-2 text-sm text-ink hover:border-green hover:text-green-dark">
            View billing
          </Link>
          {unreadCount > 0 && (
            <span className="rounded-lg bg-paper px-4 py-2 text-sm text-slate">
              {unreadCount} unread notification{unreadCount === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-xl text-ink">
          Your numbers{latestMonth ? ` — ${latestMonth}` : ""}
          <span className="brand-dot">.</span>
        </h2>
        <p className="mb-4 text-sm text-slate">Updated monthly, same day as your report message.</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {client.stats.map((stat) => (
            <div key={stat.id} className="card p-4">
              <div className="stat-num">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
          {client.stats.length === 0 && (
            <p className="text-sm text-slate">Your numbers will appear here once they&apos;re added.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-xl text-ink">
          Updates<span className="brand-dot">.</span>
        </h2>
        <p className="mb-4 text-sm text-slate">Progress notes from your team, newest first.</p>
        <div className="flex flex-col gap-3">
          {client.updates.slice(0, 5).map((update) => (
            <div key={update.id} className="card p-4">
              <div className="flex items-center gap-2">
                <span className="status-pill">{PERIOD_LABELS[update.period]}</span>
                <b className="font-display">{update.title}</b>
              </div>
              <p className="mt-2 text-sm text-slate">{update.body}</p>
              <p className="mt-2 text-xs text-mist">
                {new Date(update.createdAt).toLocaleDateString("en-GB")}
              </p>
            </div>
          ))}
          {client.updates.length === 0 && <p className="text-sm text-slate">No updates yet.</p>}
        </div>
      </section>

      <section>
        <h2 className="text-xl text-ink">
          What&apos;s live<span className="brand-dot">.</span>
        </h2>
        <p className="mb-4 text-sm text-slate">Every part of your system and its status.</p>
        <div className="card p-2">
          <ul className="checklist">
            {client.checklist.map((item) => (
              <li key={item.id} className={item.done ? "done" : "todo"}>
                {item.label}
              </li>
            ))}
            {client.checklist.length === 0 && (
              <li className="todo">Nothing checked in yet.</li>
            )}
          </ul>
        </div>
      </section>

      <section>
        <h2 className="text-xl text-ink">
          Milestones<span className="brand-dot">.</span>
        </h2>
        <p className="mb-4 text-sm text-slate">
          {nextMilestone
            ? `Up next: ${nextMilestone.title} (${new Date(nextMilestone.date).toLocaleDateString("en-GB")})`
            : "Key dates on your roadmap."}
        </p>
        <div className="card p-2">
          <ul className="checklist">
            {client.milestones.map((milestone) => (
              <li key={milestone.id} className={milestone.done ? "done" : "todo"}>
                {milestone.title}
                <span className="ml-2 text-xs text-mist">
                  {new Date(milestone.date).toLocaleDateString("en-GB")}
                </span>
              </li>
            ))}
            {client.milestones.length === 0 && (
              <li className="todo">No milestones yet.</li>
            )}
          </ul>
        </div>
      </section>

      <section>
        <h2 className="text-xl text-ink">
          Quick links<span className="brand-dot">.</span>
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {client.links.map((link) => (
            <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="link-card">
              <b className="font-display block">{link.title}</b>
              {link.note && <span className="text-sm text-slate">{link.note}</span>}
              <br />
              <span className="go text-sm">Open &rarr;</span>
            </a>
          ))}
          {client.links.length === 0 && <p className="text-sm text-slate">No links yet.</p>}
        </div>
      </section>

      <section>
        <h2 className="text-xl text-ink">
          Monthly reports<span className="brand-dot">.</span>
        </h2>
        <div className="card mt-4 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-ink text-paper">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Month</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Headline</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"></th>
              </tr>
            </thead>
            <tbody>
              {client.reports.map((report) => (
                <tr key={report.id} className="border-t border-line">
                  <td className="px-4 py-3">{report.month}</td>
                  <td className="px-4 py-3">{report.headline}</td>
                  <td className="px-4 py-3">
                    {report.url && (
                      <a href={report.url} target="_blank" rel="noreferrer" className="mr-3 font-semibold text-green-dark">
                        View
                      </a>
                    )}
                    {report.approved ? (
                      <span className="status-pill">Approved</span>
                    ) : (
                      <ReportApproveButton reportId={report.id} />
                    )}
                  </td>
                </tr>
              ))}
              {client.reports.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-slate">
                    No reports yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
