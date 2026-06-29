"use client";

import { useTransition } from "react";
import { toggleChecklistItem } from "@/lib/actions/clients";

export function ChecklistToggle({
  clientId,
  itemId,
  done,
}: {
  clientId: string;
  itemId: string;
  done: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => toggleChecklistItem(clientId, itemId, !done))}
      className="text-xs font-semibold text-green-dark underline disabled:opacity-50"
    >
      {done ? "Mark todo" : "Mark done"}
    </button>
  );
}
