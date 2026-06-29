"use client";

import { useTransition } from "react";
import { toggleMilestone } from "@/lib/actions/milestones";

export function MilestoneToggle({
  clientId,
  milestoneId,
  done,
}: {
  clientId: string;
  milestoneId: string;
  done: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => toggleMilestone(clientId, milestoneId, !done))}
      className="text-xs font-semibold text-green-dark underline disabled:opacity-50"
    >
      {done ? "Mark pending" : "Mark done"}
    </button>
  );
}
