"use client";

import { useTransition } from "react";
import { markInvoiceStatus } from "@/lib/actions/invoices";

export function InvoiceStatusButtons({
  invoiceId,
  status,
}: {
  invoiceId: string;
  status: "DRAFT" | "SENT" | "PAID" | "OVERDUE";
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      {status === "DRAFT" && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => markInvoiceStatus(invoiceId, "SENT"))}
          className="text-xs font-semibold text-green-dark underline disabled:opacity-50"
        >
          Mark sent
        </button>
      )}
      {(status === "SENT" || status === "OVERDUE") && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => markInvoiceStatus(invoiceId, "PAID"))}
          className="text-xs font-semibold text-green-dark underline disabled:opacity-50"
        >
          Mark paid
        </button>
      )}
    </div>
  );
}
