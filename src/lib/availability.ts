import type { AvailabilityRule, Booking } from "@/generated/prisma/client";

/**
 * Pure function: given a calendar day, the full set of weekly availability rules,
 * and existing bookings, return the list of bookable slots for that day.
 *
 * - Finds rule(s) matching the day's weekday.
 * - Generates candidate slots of `slotMinutes` length across [startMinute, endMinute).
 * - Filters out slots overlapping a CONFIRMED booking.
 * - Filters out slots that start in the past.
 *
 * No DB calls — callers fetch rules/bookings ahead of time.
 */
export function getAvailableSlots(
  date: Date,
  rules: AvailabilityRule[],
  existingBookings: Booking[]
): { start: Date; end: Date }[] {
  const weekday = date.getDay();
  const dayRules = rules.filter((r) => r.weekday === weekday);
  if (dayRules.length === 0) return [];

  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);

  const confirmedBookings = existingBookings.filter((b) => b.status === "CONFIRMED");
  const now = new Date();

  const slots: { start: Date; end: Date }[] = [];

  for (const rule of dayRules) {
    for (
      let minute = rule.startMinute;
      minute + rule.slotMinutes <= rule.endMinute;
      minute += rule.slotMinutes
    ) {
      const start = new Date(dayStart.getTime() + minute * 60_000);
      const end = new Date(dayStart.getTime() + (minute + rule.slotMinutes) * 60_000);

      if (start < now) continue;

      const overlaps = confirmedBookings.some(
        (b) => start < new Date(b.endsAt) && end > new Date(b.startsAt)
      );
      if (overlaps) continue;

      slots.push({ start, end });
    }
  }

  slots.sort((a, b) => a.start.getTime() - b.start.getTime());
  return slots;
}
