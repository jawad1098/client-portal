"use server";

import { requireStaff, requireClient } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

export type SearchResult = {
  id: string;
  type: "Client" | "Task" | "Ticket" | "Team" | "Resource" | "Invoice" | "Booking";
  label: string;
  sublabel?: string;
  href: string;
};

/** Staff-only (ADMIN/TEAM): search across Clients, Tasks, Tickets, Team members. */
export async function globalSearch(query: string): Promise<SearchResult[]> {
  await requireStaff();

  const q = query.trim();
  if (!q) return [];

  const [clients, tasks, tickets, team] = await Promise.all([
    prisma.client.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      take: 5,
    }),
    prisma.task.findMany({
      where: { title: { contains: q, mode: "insensitive" } },
      take: 5,
      include: { client: true },
    }),
    prisma.ticket.findMany({
      where: { title: { contains: q, mode: "insensitive" } },
      take: 5,
      include: { client: true },
    }),
    prisma.user.findMany({
      where: { role: "TEAM", name: { contains: q, mode: "insensitive" } },
      take: 5,
    }),
  ]);

  const results: SearchResult[] = [
    ...clients.map((c) => ({
      id: c.id,
      type: "Client" as const,
      label: c.name,
      sublabel: c.status,
      href: `/admin/clients/${c.id}`,
    })),
    ...tasks.map((t) => ({
      id: t.id,
      type: "Task" as const,
      label: t.title,
      sublabel: t.client?.name,
      href: `/admin/tasks`,
    })),
    ...tickets.map((t) => ({
      id: t.id,
      type: "Ticket" as const,
      label: t.title,
      sublabel: t.client?.name,
      href: `/admin/tickets/${t.id}`,
    })),
    ...team.map((u) => ({
      id: u.id,
      type: "Team" as const,
      label: u.name,
      sublabel: u.email,
      href: `/admin/team`,
    })),
  ];

  return results;
}

/** Client-only: search across their own Resources and Tickets. */
export async function clientSearch(query: string): Promise<SearchResult[]> {
  const session = await requireClient();

  const q = query.trim();
  if (!q) return [];

  const [resources, tickets] = await Promise.all([
    prisma.resource.findMany({
      where: { clientId: session.user.clientId, audience: "CLIENT", title: { contains: q } },
      take: 5,
    }),
    prisma.ticket.findMany({
      where: { clientId: session.user.clientId!, title: { contains: q } },
      take: 5,
    }),
  ]);

  const results: SearchResult[] = [
    ...resources.map((r) => ({
      id: r.id,
      type: "Resource" as const,
      label: r.title,
      sublabel: r.description ?? undefined,
      href: `/portal/resources`,
    })),
    ...tickets.map((t) => ({
      id: t.id,
      type: "Ticket" as const,
      label: t.title,
      sublabel: t.status,
      href: `/portal/support/${t.id}`,
    })),
  ];

  return results;
}
