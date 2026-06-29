"use client";

import { useTransition } from "react";
import { updateTicketStatus } from "@/lib/actions/tickets";

const STATUS_OPTIONS = [
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "RESOLVED", label: "Resolved" },
] as const;

export function TicketStatusSelect({
  ticketId,
  status,
}: {
  ticketId: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      defaultValue={status}
      disabled={isPending}
      onChange={(event) =>
        startTransition(() =>
          updateTicketStatus(ticketId, event.target.value as "OPEN" | "IN_PROGRESS" | "RESOLVED")
        )
      }
      className="rounded-lg border border-line px-2 py-1 text-xs outline-none focus:border-green"
    >
      {STATUS_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
