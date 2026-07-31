const PKT_OFFSET_MS = 5 * 60 * 60 * 1000; // Pakistan Time is UTC+5, no DST

/** UTC instants bounding "today" in Pakistan Time — use for dueDate range queries. */
export function todayRangePKT() {
  const now = new Date();
  const pktNow = new Date(now.getTime() + PKT_OFFSET_MS);
  const startOfDayPKT = Date.UTC(pktNow.getUTCFullYear(), pktNow.getUTCMonth(), pktNow.getUTCDate());
  const start = new Date(startOfDayPKT - PKT_OFFSET_MS);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}
