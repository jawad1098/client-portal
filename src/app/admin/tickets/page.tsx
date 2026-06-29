import Link from "next/link";
import { prisma } from "@/lib/prisma";

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
};

export default async function AdminTicketsPage() {
  const tickets = await prisma.ticket.findMany({
    include: { client: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl text-ink">
        Tickets<span className="brand-dot">.</span>
      </h1>
      <p className="mb-6 text-sm text-slate">{tickets.length} support requests across all clients</p>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-ink text-paper">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Client</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Title</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Updated</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr key={ticket.id} className="border-t border-line">
                <td className="px-4 py-3 text-slate">{ticket.client.name}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/tickets/${ticket.id}`} className="font-medium text-ink hover:text-green-dark">
                    {ticket.title}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className="status-pill">{STATUS_LABELS[ticket.status]}</span>
                </td>
                <td className="px-4 py-3 text-slate">
                  {new Date(ticket.updatedAt).toLocaleString("en-GB")}
                </td>
              </tr>
            ))}
            {tickets.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate">
                  No tickets yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
