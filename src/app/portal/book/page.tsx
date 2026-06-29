import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAvailableSlots } from "@/lib/availability";
import { cancelBooking } from "@/lib/actions/bookings";
import { BookingSlotGrid } from "@/components/booking-slot-grid";

const DAYS_AHEAD = 14;

export default async function PortalBookPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "CLIENT" || !session.user.clientId) {
    redirect("/login");
  }
  const clientId = session.user.clientId;

  const today = new Date();
  const rangeStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
  const rangeEnd = new Date(rangeStart);
  rangeEnd.setDate(rangeEnd.getDate() + DAYS_AHEAD);

  const [rules, bookingsInRange, myUpcomingBookings] = await Promise.all([
    prisma.availabilityRule.findMany(),
    prisma.booking.findMany({
      where: {
        status: "CONFIRMED",
        startsAt: { gte: rangeStart, lt: rangeEnd },
      },
    }),
    prisma.booking.findMany({
      where: {
        clientId,
        status: "CONFIRMED",
        startsAt: { gte: new Date() },
      },
      orderBy: { startsAt: "asc" },
    }),
  ]);

  const days: { date: Date; slots: { start: Date; end: Date }[] }[] = [];
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const date = new Date(rangeStart);
    date.setDate(date.getDate() + i);
    const slots = getAvailableSlots(date, rules, bookingsInRange);
    if (slots.length > 0) {
      days.push({ date, slots });
    }
  }

  return (
    <div>
      <h1 className="text-2xl text-ink">
        Book a meeting<span className="brand-dot">.</span>
      </h1>
      <p className="mb-6 text-sm text-slate">
        Pick a time below to schedule a call. You&apos;ll get a confirmation and so will the team.
      </p>

      {days.length === 0 ? (
        <p className="text-sm text-slate">No availability in the next {DAYS_AHEAD} days. Check back soon.</p>
      ) : (
        <BookingSlotGrid
          days={days.map(({ date, slots }) => ({
            key: date.toISOString(),
            dateLabel: date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }),
            slots: slots.map((slot) => ({
              startIso: slot.start.toISOString(),
              endIso: slot.end.toISOString(),
              label: slot.start.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
            })),
          }))}
        />
      )}

      <h2 className="mb-3 mt-10 text-lg font-display text-ink">Your upcoming calls</h2>
      {myUpcomingBookings.length === 0 ? (
        <p className="text-sm text-slate">No upcoming calls booked.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {myUpcomingBookings.map((booking) => (
            <div key={booking.id} className="link-card flex items-center justify-between">
              <div>
                <b className="font-display block">{booking.title}</b>
                <span className="text-sm text-slate">
                  {new Date(booking.startsAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                </span>
                {booking.notes && <p className="mt-1 text-sm text-slate">{booking.notes}</p>}
              </div>
              <form action={cancelBooking.bind(null, booking.id)}>
                <button type="submit" className="text-xs text-slate hover:text-red-600">
                  Cancel
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
