"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyClientUsers, notifyStaffUsers } from "@/lib/actions/notifications";

/**
 * Send a message on a client's thread. Works for staff (ADMIN/TEAM) viewing any
 * client, or for a CLIENT user sending on their own thread.
 */
export async function sendMessage(clientId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authorised");
  }

  const isStaff = session.user.role === "ADMIN" || session.user.role === "TEAM";
  const isOwnClient = session.user.role === "CLIENT" && session.user.clientId === clientId;

  if (!isStaff && !isOwnClient) {
    throw new Error("Not authorised");
  }

  const body = String(formData.get("body") || "").trim();
  if (!body) {
    throw new Error("Message cannot be empty");
  }

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) {
    throw new Error("Client not found");
  }

  await prisma.message.create({
    data: { clientId, senderId: session.user.id, body },
  });

  if (isStaff) {
    await notifyClientUsers(
      clientId,
      "MESSAGE",
      `New message from ${session.user.name}`,
      body.slice(0, 140),
      "/portal/messages"
    );
  } else {
    await notifyStaffUsers(
      "MESSAGE",
      `New message from ${session.user.name} (${client.name})`,
      body.slice(0, 140),
      `/admin/clients/${clientId}`
    );
  }

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/portal/messages");
}
