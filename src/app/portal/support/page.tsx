import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createTicket } from "@/lib/actions/tickets";

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
};

export default async function PortalSupportPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "CLIENT" || !session.user.clientId) {
    redirect("/login");
  }

  const tickets = await prisma.ticket.findMany({
    where: { clientId: session.user.clientId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl text-ink">
          Support<span className="brand-dot">.</span>
        </h2>
        <p className="mb-4 text-sm text-slate">Raise a request and track its progress.</p>
      </div>

      <div className="flex flex-col gap-3">
        {tickets.map((ticket) => (
          <Link key={ticket.id} href={`/portal/support/${ticket.id}`} className="link-card">
            <div className="flex items-center justify-between gap-2">
              <b className="font-display">{ticket.title}</b>
              <span className="status-pill">{STATUS_LABELS[ticket.status]}</span>
            </div>
            <p className="mt-1 text-sm text-slate">{ticket.body}</p>
            <p className="mt-2 text-xs text-mist">
              Raised {new Date(ticket.createdAt).toLocaleDateString("en-GB")}
            </p>
          </Link>
        ))}
        {tickets.length === 0 && <p className="text-sm text-slate">No requests yet.</p>}
      </div>

      <section>
        <h3 className="mb-3 text-lg text-ink">Raise a new request</h3>
        <form action={createTicket} className="card flex flex-col gap-3 p-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink">Title</label>
            <input name="title" required className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink">Details</label>
            <textarea name="body" required rows={3} className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green" />
          </div>
          <button type="submit" className="self-start rounded-lg bg-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-dark">
            Submit
          </button>
        </form>
      </section>
    </div>
  );
}
