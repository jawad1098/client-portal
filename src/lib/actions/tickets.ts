"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireStaff, requireClient } from "@/lib/guards";
import { notifyClientUsers, notifyStaffUsers } from "@/lib/actions/notifications";

export async function createTicket(formData: FormData) {
  const session = await requireClient();

  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim();

  if (!title || !body) {
    throw new Error("Title and body are required");
  }

  const ticket = await prisma.ticket.create({
    data: {
      clientId: session.user.clientId!,
      title,
      body,
      createdById: session.user.id,
    },
  });

  const client = await prisma.client.findUnique({ where: { id: session.user.clientId! } });

  await notifyStaffUsers(
    "TICKET_NEW",
    `New support request: ${title}`,
    `${client?.name ?? "A client"} raised a new ticket`,
    `/admin/tickets/${ticket.id}`
  );

  revalidatePath("/portal/support");
  redirect(`/portal/support/${ticket.id}`);
}

export async function replyToTicket(ticketId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authorised");
  }

  const isStaff = session.user.role === "ADMIN" || session.user.role === "TEAM";
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) {
    throw new Error("Ticket not found");
  }

  const isOwner = session.user.role === "CLIENT" && session.user.clientId === ticket.clientId;
  if (!isStaff && !isOwner) {
    throw new Error("Not authorised");
  }

  const body = String(formData.get("body") || "").trim();
  if (!body) {
    throw new Error("Reply cannot be empty");
  }

  await prisma.ticketReply.create({
    data: { ticketId, authorId: session.user.id, body },
  });

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { updatedAt: new Date(), status: isStaff && ticket.status === "OPEN" ? "IN_PROGRESS" : ticket.status },
  });

  if (isStaff) {
    await notifyClientUsers(
      ticket.clientId,
      "TICKET_REPLY",
      `Reply on "${ticket.title}"`,
      body.slice(0, 140),
      `/portal/support/${ticketId}`
    );
  } else {
    await notifyStaffUsers(
      "TICKET_REPLY",
      `Client replied on "${ticket.title}"`,
      body.slice(0, 140),
      `/admin/tickets/${ticketId}`
    );
  }

  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath(`/portal/support/${ticketId}`);
}

export async function updateTicketStatus(
  ticketId: string,
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED"
) {
  await requireStaff();

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return;

  await prisma.ticket.update({ where: { id: ticketId }, data: { status } });

  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath("/admin/tickets");
  revalidatePath(`/portal/support/${ticketId}`);
}
