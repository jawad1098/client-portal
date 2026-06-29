"use client";

import { useTransition } from "react";
import { approveReport } from "@/lib/actions/reports";

export function ReportApproveButton({ reportId }: { reportId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => approveReport(reportId))}
      className="text-xs font-semibold text-green-dark underline disabled:opacity-50"
    >
      Approve
    </button>
  );
}
