import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { replyToTicket } from "@/lib/actions/tickets";
import { TicketStatusSelect } from "@/components/ticket-status-select";

export default async function AdminTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      client: true,
      createdBy: true,
      replies: { include: { author: true }, orderBy: { createdAt: "asc" } },
    },
  });

  if (!ticket) {
    notFound();
  }

  const replyWithId = replyToTicket.bind(null, ticket.id);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/admin/tickets" className="text-sm text-slate hover:text-green-dark">
          &larr; All tickets
        </Link>
        <div className="mt-2 flex items-start justify-between gap-3">
          <h1 className="text-2xl text-ink">
            {ticket.title}
            <span className="brand-dot">.</span>
          </h1>
          <TicketStatusSelect ticketId={ticket.id} status={ticket.status} />
        </div>
        <p className="mt-2 text-sm text-slate">{ticket.body}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate">
          <span className="rounded-full bg-paper px-2 py-1">{ticket.client.name}</span>
          <span className="rounded-full bg-paper px-2 py-1">Raised by {ticket.createdBy.name}</span>
          <span className="rounded-full bg-paper px-2 py-1">
            {new Date(ticket.createdAt).toLocaleString("en-GB")}
          </span>
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-lg text-ink">Replies</h2>
        <div className="card mb-4 flex flex-col gap-3 p-4">
          {ticket.replies.map((reply) => (
            <div key={reply.id} className="border-b border-line pb-3 last:border-none last:pb-0">
              <p className="text-sm text-ink">{reply.body}</p>
              <p className="mt-1 text-xs text-slate">
                {reply.author.name} &middot; {new Date(reply.createdAt).toLocaleString("en-GB")}
              </p>
            </div>
          ))}
          {ticket.replies.length === 0 && <p className="text-sm text-slate">No replies yet.</p>}
        </div>
        <form action={replyWithId} className="card flex flex-wrap items-end gap-3 p-4">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-ink">Add a reply</label>
            <input name="body" required className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green" />
          </div>
          <button type="submit" className="rounded-lg bg-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-dark">
            Reply
          </button>
        </form>
      </section>
    </div>
  );
}
