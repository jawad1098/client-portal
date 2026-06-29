"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { generateToken } from "@/lib/tokens";

export async function inviteTeamMember(formData: FormData) {
  const session = await requireAdmin();

  const email = String(formData.get("email") || "").trim().toLowerCase();
  const name = String(formData.get("name") || "").trim();

  if (!email || !name) {
    throw new Error("Name and email are required");
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invite = await prisma.invite.create({
    data: {
      email,
      name,
      role: "TEAM",
      token,
      invitedById: session.user.id,
      expiresAt,
    },
  });

  revalidatePath("/admin/team");
  return invite.token;
}

export async function updateTeamMember(userId: string, formData: FormData) {
  await requireAdmin();

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const role = String(formData.get("role") || "TEAM") as "ADMIN" | "TEAM";

  if (!name || !email) {
    throw new Error("Name and email are required");
  }
  if (role !== "ADMIN" && role !== "TEAM") {
    throw new Error("Invalid role");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.id !== userId) {
    throw new Error("That email is already in use");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { name, email, role },
  });

  revalidatePath("/admin/team");
  revalidatePath(`/admin/team/${userId}`);
}

/** Sets a new random temporary password for a team member and returns it (no email sending exists yet, so it must be shared manually). */
export async function resetTeamMemberPassword(userId: string) {
  await requireAdmin();

  const tempPassword = generateToken().slice(0, 12);
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  revalidatePath(`/admin/team/${userId}`);
  return tempPassword;
}

export async function removeTeamMember(userId: string) {
  const session = await requireAdmin();

  if (session.user.id === userId) {
    throw new Error("You can't remove your own account");
  }

  const openTasks = await prisma.task.count({ where: { assigneeId: userId, status: { not: "DONE" } } });
  if (openTasks > 0) {
    throw new Error("Reassign or complete this person's open tasks before removing them");
  }

  await prisma.user.delete({ where: { id: userId } });

  revalidatePath("/admin/team");
}
