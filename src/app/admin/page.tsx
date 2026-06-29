import Link from "next/link";
import { prisma } from "@/lib/prisma";

function relativeTime(date: Date) {
  const diffMs = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

type ActivityItem = {
  id: string;
  text: string;
  href: string;
  at: Date;
};

export default async function AdminOverviewPage() {
  const now = new Date();
  const soon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [clientCount, teamCount, openTasks, dueSoon, outstandingInvoices] = await Promise.all([
    prisma.client.count(),
    prisma.user.count({ where: { role: "TEAM" } }),
    prisma.task.count({ where: { status: { not: "DONE" } } }),
    prisma.task.count({
      where: {
        status: { not: "DONE" },
        dueDate: { gte: now, lte: soon },
      },
    }),
    prisma.invoice.aggregate({
      where: { status: { in: ["SENT", "OVERDUE"] } },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  const stats = [
    { label: "Clients", value: clientCount, href: "/admin/clients" },
    { label: "Team members", value: teamCount, href: "/admin/team" },
    { label: "Open tasks", value: openTasks, href: "/admin/tasks" },
    { label: "Due in 7 days", value: dueSoon, href: "/admin/tasks" },
  ];

  const outstandingTotal = (outstandingInvoices._sum.amount ?? 0) / 100;

  const [recentTasks, recentMessages, recentTickets, recentInvoices, recentBookings] = await Promise.all([
    prisma.task.findMany({
      orderBy: { updatedAt: "desc" },
      take: 8,
      include: { client: true },
    }),
    prisma.message.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { sender: true, client: true },
    }),
    prisma.ticket.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { client: true },
    }),
    prisma.invoice.findMany({
      where: { status: { in: ["SENT", "PAID"] } },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { client: true },
    }),
    prisma.booking.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { client: true },
    }),
  ]);

  const activity: ActivityItem[] = [
    ...recentTasks.map((t) => ({
      id: `task-${t.id}`,
      text: `Task "${t.title}" ${t.status === "DONE" ? "completed" : t.status === "IN_PROGRESS" ? "in progress" : "created"}${t.client ? ` for ${t.client.name}` : ""}`,
      href: `/admin/tasks/${t.id}`,
      at: t.updatedAt,
    })),
    ...recentMessages.map((m) => ({
      id: `message-${m.id}`,
      text: `${m.sender.name} messaged ${m.client.name}`,
      href: `/admin/clients/${m.clientId}`,
      at: m.createdAt,
    })),
    ...recentTickets.map((t) => ({
      id: `ticket-${t.id}`,
      text: `New ticket from ${t.client.name}: "${t.title}"`,
      href: `/admin/tickets/${t.id}`,
      at: t.createdAt,
    })),
    ...recentInvoices.map((i) => ({
      id: `invoice-${i.id}`,
      text:
        i.status === "PAID" && i.paidAt
          ? `Invoice paid by ${i.client.name} — £${(i.amount / 100).toFixed(2)}`
          : `Invoice sent to ${i.client.name} — £${(i.amount / 100).toFixed(2)}`,
      href: `/admin/clients/${i.clientId}`,
      at: i.status === "PAID" && i.paidAt ? i.paidAt : i.createdAt,
    })),
    ...recentBookings.map((b) => ({
      id: `booking-${b.id}`,
      text: `${b.client.name} booked "${b.title}"`,
      href: `/admin/calendar`,
      at: b.createdAt,
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 15);

  return (
    <div>
      <h1 className="text-2xl text-ink">
        Overview<span className="brand-dot">.</span>
      </h1>
      <p className="mb-6 text-sm text-slate">A quick look at everything in motion.</p>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="card p-5 transition hover:border-green">
            <div className="stat-num">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </Link>
        ))}
      </div>

      <h2 className="mt-10 mb-3 text-lg text-ink">Billing overview</h2>
      <div className="card max-w-sm p-5">
        <div className="stat-num">£{outstandingTotal.toFixed(2)}</div>
        <div className="stat-label">
          Outstanding across {outstandingInvoices._count} sent / overdue invoice
          {outstandingInvoices._count === 1 ? "" : "s"}
        </div>
      </div>

      <h2 className="mt-10 mb-3 text-lg text-ink">Activity</h2>
      <div className="card divide-y divide-line">
        {activity.length === 0 && <p className="px-5 py-6 text-sm text-slate">No activity yet.</p>}
        {activity.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="flex items-center justify-between gap-4 px-5 py-3 text-sm text-ink transition hover:bg-paper"
          >
            <span>{item.text}</span>
            <span className="flex-none text-xs text-slate">{relativeTime(item.at)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
