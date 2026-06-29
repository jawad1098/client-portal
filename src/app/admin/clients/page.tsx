import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const clients = await prisma.client.findMany({
    where: q
      ? {
          name: { contains: q },
        }
      : undefined,
    orderBy: { name: "asc" },
    include: { _count: { select: { users: true, tasks: true } } },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl text-ink">
            Clients<span className="brand-dot">.</span>
          </h1>
          <p className="text-sm text-slate">{clients.length} total</p>
        </div>
        <Link
          href="/admin/clients/new"
          className="rounded-lg bg-green px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-dark"
        >
          Add client
        </Link>
      </div>

      <form className="mb-5" method="get">
        <input
          type="search"
          name="q"
          defaultValue={q || ""}
          placeholder="Search clients..."
          className="w-full max-w-sm rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green"
        />
      </form>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-ink text-paper">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Users</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Tasks</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id} className="border-t border-line">
                <td className="px-4 py-3">
                  <Link href={`/admin/clients/${client.id}`} className="font-medium text-ink hover:text-green-dark">
                    {client.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate">{client.status}</td>
                <td className="px-4 py-3 text-slate">{client._count.users}</td>
                <td className="px-4 py-3 text-slate">{client._count.tasks}</td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate">
                  No clients yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
