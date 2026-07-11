"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useState, useEffect } from "react";

type Member = { id: string; name: string };
type Client = { id: string; name: string };

const DUE_OPTIONS = [
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Today" },
  { value: "this_week", label: "This week" },
  { value: "no_date", label: "No due date" },
];

const STATUS_OPTIONS = [
  { value: "TODO", label: "To do" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "DONE", label: "Done" },
];

export function TaskFilters({
  team,
  clients,
  isAdmin,
}: {
  team: Member[];
  clients: Client[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const set = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      router.replace(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const clear = useCallback(() => router.replace(pathname), [router, pathname]);

  const status = searchParams.get("status") ?? "";
  const assigneeId = searchParams.get("assigneeId") ?? "";
  const clientId = searchParams.get("clientId") ?? "";
  const due = searchParams.get("due") ?? "";
  const q = searchParams.get("q") ?? "";

  // Local state for the search input so it feels instant; debounce URL update
  const [searchInput, setSearchInput] = useState(q);
  useEffect(() => { setSearchInput(q); }, [q]);

  useEffect(() => {
    const t = setTimeout(() => set("q", searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeCount = [status, assigneeId, clientId, due, q].filter(Boolean).length;

  const selectClass = (active: boolean) =>
    `rounded-lg border px-3 py-1.5 text-sm outline-none cursor-pointer transition-colors ${
      active
        ? "border-green bg-green text-white"
        : "border-line bg-paper text-ink hover:border-green"
    }`;

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      {/* Search input first — primary action */}
      <input
        type="search"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        placeholder="Search tasks…"
        className={`rounded-lg border px-3 py-1.5 text-sm outline-none transition-colors focus:border-green ${
          q ? "border-green" : "border-line"
        }`}
        style={{ minWidth: 180 }}
      />

      <span className="text-xs font-medium uppercase tracking-wide text-slate">Filter</span>

      <select
        value={status}
        onChange={(e) => set("status", e.target.value)}
        className={selectClass(!!status)}
      >
        <option value="">All statuses</option>
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {isAdmin && (
        <select
          value={assigneeId}
          onChange={(e) => set("assigneeId", e.target.value)}
          className={selectClass(!!assigneeId)}
        >
          <option value="">All assignees</option>
          <option value="__unassigned__">Unassigned</option>
          {team.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      )}

      <select
        value={clientId}
        onChange={(e) => set("clientId", e.target.value)}
        className={selectClass(!!clientId)}
      >
        <option value="">All clients</option>
        <option value="__none__">No client</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <select
        value={due}
        onChange={(e) => set("due", e.target.value)}
        className={selectClass(!!due)}
      >
        <option value="">Any due date</option>
        {DUE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {activeCount > 0 && (
        <button
          onClick={() => { setSearchInput(""); clear(); }}
          className="rounded-lg border border-line px-3 py-1.5 text-sm text-slate hover:border-red-400 hover:text-red-500"
        >
          Clear {activeCount} filter{activeCount > 1 ? "s" : ""}
        </button>
      )}
    </div>
  );
}
