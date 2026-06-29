"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export async function acceptInvite(token: string, formData: FormData) {
  const invite = await prisma.invite.findUnique({ where: { token } });

  if (!invite || invite.status !== "PENDING" || invite.expiresAt < new Date()) {
    throw new Error("This invite is no longer valid.");
  }

  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  if (password !== confirmPassword) {
    throw new Error("Passwords do not match.");
  }

  const existingUser = await prisma.user.findUnique({ where: { email: invite.email } });
  if (existingUser) {
    throw new Error("An account with this email already exists. Please sign in.");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.$transaction([
    prisma.user.create({
      data: {
        name: invite.name,
        email: invite.email,
        passwordHash,
        role: invite.role,
        clientId: invite.clientId,
      },
    }),
    prisma.invite.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED" },
    }),
  ]);

  redirect("/login");
}
