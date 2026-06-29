"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaff, requireAdmin } from "@/lib/guards";
import { notifyClientUsers } from "@/lib/actions/notifications";

export async function addUpdate(clientId: string, formData: FormData) {
  const session = await requireStaff();

  const period = String(formData.get("period") || "DAILY") as "DAILY" | "WEEKLY" | "MONTHLY";
  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim();

  if (!title || !body) {
    throw new Error("Title and body are required");
  }

  await prisma.update.create({
    data: {
      clientId,
      period,
      title,
      body,
      createdById: session.user.id,
    },
  });

  await notifyClientUsers(clientId, "UPDATE_POSTED", title, body.slice(0, 140), "/portal");

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/portal");
}

export async function deleteUpdate(updateId: string) {
  await requireAdmin();

  const update = await prisma.update.findUnique({ where: { id: updateId } });
  if (!update) return;

  await prisma.update.delete({ where: { id: updateId } });

  revalidatePath(`/admin/clients/${update.clientId}`);
  revalidatePath("/portal");
}
