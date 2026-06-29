"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@/generated/prisma/client";

/** Internal helper — create a notification for a single user. Not exported as a server action. */
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  link: string
) {
  await prisma.notification.create({
    data: { userId, type, title, body, link },
  });
}

/** Internal helper — notify every CLIENT-role user belonging to a client. */
export async function notifyClientUsers(
  clientId: string,
  type: NotificationType,
  title: string,
  body: string,
  link: string
) {
  const users = await prisma.user.findMany({
    where: { clientId, role: "CLIENT" },
    select: { id: true },
  });
  if (users.length === 0) return;
  await prisma.notification.createMany({
    data: users.map((u) => ({ userId: u.id, type, title, body, link })),
  });
}

/** Internal helper — notify every staff user (ADMIN + TEAM). */
export async function notifyStaffUsers(
  type: NotificationType,
  title: string,
  body: string,
  link: string,
  excludeUserId?: string
) {
  const users = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "TEAM"] }, ...(excludeUserId ? { id: { not: excludeUserId } } : {}) },
    select: { id: true },
  });
  if (users.length === 0) return;
  await prisma.notification.createMany({
    data: users.map((u) => ({ userId: u.id, type, title, body, link })),
  });
}

export async function getNotifications() {
  const session = await auth();
  if (!session?.user) return { notifications: [], unreadCount: 0 };

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const unreadCount = await prisma.notification.count({
    where: { userId: session.user.id, read: false },
  });

  return { notifications, unreadCount };
}

export async function markNotificationsRead() {
  const session = await auth();
  if (!session?.user) return;

  await prisma.notification.updateMany({
    where: { userId: session.user.id, read: false },
    data: { read: true },
  });

  revalidatePath("/admin");
  revalidatePath("/portal");
}
