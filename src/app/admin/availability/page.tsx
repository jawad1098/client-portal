import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addAvailabilityRule, deleteAvailabilityRule } from "@/lib/actions/availability";

const WEEKDAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function minutesToTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export default async function AdminAvailabilityPage() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "TEAM")) {
    redirect("/login");
  }
  const isAdmin = session.user.role === "ADMIN";

  const rules = await prisma.availabilityRule.findMany({
    orderBy: [{ weekday: "asc" }, { startMinute: "asc" }],
  });

  const rulesByWeekday = new Map<number, typeof rules>();
  for (const rule of rules) {
    if (!rulesByWeekday.has(rule.weekday)) rulesByWeekday.set(rule.weekday, []);
    rulesByWeekday.get(rule.weekday)!.push(rule);
  }

  return (
    <div>
      <h1 className="text-2xl text-ink">
        Availability<span className="brand-dot">.</span>
      </h1>
      <p className="mb-6 text-sm text-slate">
        Set your weekly office hours. Clients can book calls during these windows from the portal.
      </p>

      <div className="mb-8 grid grid-cols-1 gap-3 md:grid-cols-2">
        {WEEKDAY_LABELS.map((label, weekday) => {
          const dayRules = rulesByWeekday.get(weekday) ?? [];
          return (
            <div key={weekday} className="card p-4">
              <b className="font-display block">{label}</b>
              {dayRules.length === 0 ? (
                <p className="mt-1 text-sm text-slate">No availability</p>
              ) : (
                <div className="mt-2 flex flex-col gap-2">
                  {dayRules.map((rule) => (
                    <div key={rule.id} className="flex items-center justify-between rounded bg-paper px-3 py-2 text-sm">
                      <span>
                        {minutesToTime(rule.startMinute)} – {minutesToTime(rule.endMinute)}{" "}
                        <span className="text-slate">({rule.slotMinutes}min slots)</span>
                      </span>
                      {isAdmin && (
                        <form action={deleteAvailabilityRule.bind(null, rule.id)}>
                          <button type="submit" className="text-xs text-slate hover:text-red-600">
                            Remove
                          </button>
                        </form>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isAdmin && (
        <form action={addAvailabilityRule} className="card flex flex-wrap items-end gap-3 p-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink">Day</label>
            <select
              name="weekday"
              required
              className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green"
            >
              {WEEKDAY_LABELS.map((label, weekday) => (
                <option key={weekday} value={weekday}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink">Start time</label>
            <input
              name="startTime"
              type="time"
              required
              className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink">End time</label>
            <input
              name="endTime"
              type="time"
              required
              className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink">Slot length</label>
            <select
              name="slotMinutes"
              defaultValue="30"
              className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green"
            >
              <option value="15">15 min</option>
              <option value="30">30 min</option>
              <option value="45">45 min</option>
              <option value="60">60 min</option>
            </select>
          </div>
          <button type="submit" className="rounded-lg bg-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-dark">
            Add rule
          </button>
        </form>
      )}
    </div>
  );
}
