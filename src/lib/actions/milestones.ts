"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaff, requireAdmin } from "@/lib/guards";

export async function addMilestone(clientId: string, formData: FormData) {
  await requireStaff();

  const title = String(formData.get("title") || "").trim();
  const dateRaw = String(formData.get("date") || "").trim();

  if (!title || !dateRaw) {
    throw new Error("Title and date are required");
  }

  await prisma.milestone.create({
    data: { clientId, title, date: new Date(dateRaw) },
  });

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/portal");
}

export async function toggleMilestone(clientId: string, milestoneId: string, done: boolean) {
  await requireStaff();
  await prisma.milestone.update({
    where: { id: milestoneId },
    data: { done },
  });
  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/portal");
}

export async function deleteMilestone(clientId: string, milestoneId: string) {
  await requireAdmin();
  await prisma.milestone.delete({ where: { id: milestoneId } });
  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/portal");
}
