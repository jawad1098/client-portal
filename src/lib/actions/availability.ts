"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";

function timeToMinutes(value: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) throw new Error("Invalid time format");
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error("Invalid time value");
  }
  return hours * 60 + minutes;
}

export async function addAvailabilityRule(formData: FormData) {
  await requireAdmin();

  const weekday = Number(formData.get("weekday"));
  const startRaw = String(formData.get("startTime") || "").trim();
  const endRaw = String(formData.get("endTime") || "").trim();
  const slotMinutes = Number(formData.get("slotMinutes"));

  if (Number.isNaN(weekday) || weekday < 0 || weekday > 6) {
    throw new Error("Invalid weekday");
  }
  if (!startRaw || !endRaw) {
    throw new Error("Start and end time are required");
  }
  if (![15, 30, 45, 60].includes(slotMinutes)) {
    throw new Error("Invalid slot length");
  }

  const startMinute = timeToMinutes(startRaw);
  const endMinute = timeToMinutes(endRaw);

  if (startMinute >= endMinute) {
    throw new Error("Start time must be before end time");
  }
  if (endMinute - startMinute < slotMinutes) {
    throw new Error("Window must fit at least one slot");
  }

  await prisma.availabilityRule.create({
    data: { weekday, startMinute, endMinute, slotMinutes },
  });

  revalidatePath("/admin/availability");
}

export async function deleteAvailabilityRule(ruleId: string) {
  await requireAdmin();
  await prisma.availabilityRule.delete({ where: { id: ruleId } });
  revalidatePath("/admin/availability");
}
