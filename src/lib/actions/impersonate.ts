"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { generateToken } from "@/lib/tokens";

const GRANT_TTL_MS = 60 * 1000;

/** Admin-only: create a one-time token to switch the active session to another user's view. */
export async function startImpersonation(targetUserId: string) {
  const session = await requireAdmin();

  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target) {
    throw new Error("User not found");
  }

  const token = generateToken();
  await prisma.impersonationGrant.create({
    data: {
      token,
      adminId: session.user.id,
      targetUserId: target.id,
      expiresAt: new Date(Date.now() + GRANT_TTL_MS),
    },
  });

  return { token, role: target.role };
}

/** Switch back to the original admin account from an impersonated session. */
export async function endImpersonation() {
  const session = await auth();
  if (!session?.user?.impersonatorId) {
    throw new Error("Not currently viewing as another user");
  }

  const adminId = session.user.impersonatorId;
  const token = generateToken();
  await prisma.impersonationGrant.create({
    data: {
      token,
      adminId,
      targetUserId: adminId,
      expiresAt: new Date(Date.now() + GRANT_TTL_MS),
    },
  });

  return { token };
}
