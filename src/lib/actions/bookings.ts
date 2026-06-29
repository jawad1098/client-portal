"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireClient } from "@/lib/guards";
import { notifyClientUsers, notifyStaffUsers } from "@/lib/actions/notifications";

export async function bookSlot(formData: FormData) {
  const session = await requireClient();
  const clientId = session.user.clientId!;

  const startsAtRaw = String(formData.get("startsAt") || "");
  const endsAtRaw = String(formData.get("endsAt") || "");
  const notes = String(formData.get("notes") || "").trim();

  if (!startsAtRaw || !endsAtRaw) {
    throw new Error("Missing slot time");
  }

  const startsAt = new Date(startsAtRaw);
  const endsAt = new Date(endsAtRaw);

  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || startsAt >= endsAt) {
    throw new Error("Invalid slot time");
  }
  if (startsAt < new Date()) {
    throw new Error("Cannot book a slot in the past");
  }

  // Re-check server-side for overlap to handle races.
  const overlapping = await prisma.booking.findFirst({
    where: {
      status: "CONFIRMED",
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
  });
  if (overlapping) {
    throw new Error("That slot was just booked — please pick another time");
  }

  const client = await prisma.client.findUnique({ where: { id: clientId } });

  await prisma.booking.create({
    data: {
      clientId,
      startsAt,
      endsAt,
      notes: notes || null,
      title: `Call with builtbyjawad`,
    },
  });

  await notifyStaffUsers(
    "BOOKING_CREATED",
    "New meeting booked",
    `${client?.name ?? "A client"} booked a call for ${startsAt.toLocaleString("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    })}`,
    "/admin/calendar"
  );

  revalidatePath("/portal/book");
  revalidatePath("/admin/calendar");
}

export async function cancelBooking(bookingId: string) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authorised");
  }

  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { client: true } });
  if (!booking) {
    throw new Error("Booking not found");
  }

  const isStaff = session.user.role === "ADMIN" || session.user.role === "TEAM";
  const isOwningClient = session.user.role === "CLIENT" && session.user.clientId === booking.clientId;

  if (!isStaff && !isOwningClient) {
    throw new Error("Not authorised");
  }

  if (booking.status === "CANCELLED") {
    return;
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED" },
  });

  const whenLabel = new Date(booking.startsAt).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  if (isStaff) {
    await notifyClientUsers(
      booking.clientId,
      "BOOKING_CANCELLED",
      "Meeting cancelled",
      `Your call scheduled for ${whenLabel} has been cancelled`,
      "/portal/book"
    );
  } else {
    await notifyStaffUsers(
      "BOOKING_CANCELLED",
      "Meeting cancelled",
      `${booking.client.name} cancelled their call scheduled for ${whenLabel}`,
      "/admin/calendar"
    );
  }

  revalidatePath("/portal/book");
  revalidatePath("/admin/calendar");
}
