import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cancelBooking } from "@/lib/actions/bookings";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function parseMonthParam(month: string | undefined): { year: number; monthIndex: number } {
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [year, m] = month.split("-").map(Number);
    return { year, monthIndex: m - 1 };
  }
  const now = new Date();
  return { year: now.getFullYear(), monthIndex: now.getMonth() };
}

function formatMonthParam(year: number, monthIndex: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

export default async function AdminCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "TEAM")) {
    redirect("/login");
  }

  const { month } = await searchParams;
  const { year, monthIndex } = parseMonthParam(month);

  const firstOfMonth = new Date(year, monthIndex, 1);
  const lastOfMonth = new Date(year, monthIndex + 1, 0);

  const prevMonthDate = new Date(year, monthIndex - 1, 1);
  const nextMonthDate = new Date(year, monthIndex + 1, 1);

  const tasks = await prisma.task.findMany({
    where: {
      dueDate: { gte: firstOfMonth, lte: new Date(year, monthIndex + 1, 0, 23, 59, 59) },
    },
    include: { client: true },
    orderBy: { dueDate: "asc" },
  });

  const tasksByDay = new Map<number, typeof tasks>();
  for (const task of tasks) {
    if (!task.dueDate) continue;
    const day = new Date(task.dueDate).getDate();
    if (!tasksByDay.has(day)) tasksByDay.set(day, []);
    tasksByDay.get(day)!.push(task);
  }

  const bookings = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      startsAt: { gte: firstOfMonth, lte: new Date(year, monthIndex + 1, 0, 23, 59, 59) },
    },
    include: { client: true },
    orderBy: { startsAt: "asc" },
  });

  const bookingsByDay = new Map<number, typeof bookings>();
  for (const booking of bookings) {
    const day = new Date(booking.startsAt).getDate();
    if (!bookingsByDay.has(day)) bookingsByDay.set(day, []);
    bookingsByDay.get(day)!.push(booking);
  }

  // Monday-first grid
  const startWeekday = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = lastOfMonth.getDate();
  const cells: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = firstOfMonth.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === monthIndex;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl text-ink">
            Calendar<span className="brand-dot">.</span>
          </h1>
          <p className="text-sm text-slate">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/calendar?month=${formatMonthParam(prevMonthDate.getFullYear(), prevMonthDate.getMonth())}`}
            className="rounded-lg border border-line px-3 py-2 text-sm text-slate hover:border-green hover:text-green-dark"
          >
            &larr; Prev
          </Link>
          <Link
            href={`/admin/calendar?month=${formatMonthParam(nextMonthDate.getFullYear(), nextMonthDate.getMonth())}`}
            className="rounded-lg border border-line px-3 py-2 text-sm text-slate hover:border-green hover:text-green-dark"
          >
            Next &rarr;
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-wide text-slate">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label}>{label}</div>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-2">
        {cells.map((day, index) => {
          const isToday = isCurrentMonth && day === today.getDate();
          const dayTasks = day ? tasksByDay.get(day) ?? [] : [];
          const dayBookings = day ? bookingsByDay.get(day) ?? [] : [];
          return (
            <div
              key={index}
              className={`card min-h-28 p-2 ${day === null ? "border-none bg-transparent" : ""} ${
                isToday ? "border-green" : ""
              }`}
            >
              {day !== null && (
                <>
                  <p className={`text-xs ${isToday ? "font-bold text-green-dark" : "text-slate"}`}>{day}</p>
                  <div className="mt-1 flex flex-col gap-1">
                    {dayBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="flex items-center justify-between gap-1 truncate rounded bg-green/15 px-1.5 py-1 text-[0.65rem] text-green-dark"
                        title={`${booking.title} — ${booking.client.name}`}
                      >
                        <span className="truncate">
                          &#9201; {new Date(booking.startsAt).toLocaleTimeString("en-GB", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          — {booking.client.name}
                        </span>
                        <form action={cancelBooking.bind(null, booking.id)}>
                          <button
                            type="submit"
                            className="ml-1 flex-none text-green-dark/70 hover:text-red-600"
                            title="Cancel booking"
                          >
                            &times;
                          </button>
                        </form>
                      </div>
                    ))}
                    {dayTasks.map((task) => (
                      <Link
                        key={task.id}
                        href={`/admin/tasks/${task.id}`}
                        className="block truncate rounded bg-paper px-1.5 py-1 text-[0.65rem] text-ink hover:bg-green/10"
                        title={task.title}
                      >
                        {task.title}
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
