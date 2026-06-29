"use client";

import { useTransition } from "react";
import { updateTaskStatus } from "@/lib/actions/tasks";

const STATUS_OPTIONS = [
  { value: "TODO", label: "To do" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "DONE", label: "Done" },
] as const;

export function TaskStatusSelect({
  taskId,
  status,
}: {
  taskId: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      defaultValue={status}
      disabled={isPending}
      onChange={(event) =>
        startTransition(() =>
          updateTaskStatus(taskId, event.target.value as "TODO" | "IN_PROGRESS" | "DONE")
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
