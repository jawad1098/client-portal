import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Awaiting payment",
  PAID: "Paid",
  OVERDUE: "Overdue",
};

function formatAmount(amount: number, currency: string) {
  const symbol = currency === "GBP" ? "£" : currency + " ";
  return `${symbol}${(amount / 100).toFixed(2)}`;
}

export default async function PortalBillingPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "CLIENT" || !session.user.clientId) {
    redirect("/login");
  }

  const invoices = await prisma.invoice.findMany({
    where: { clientId: session.user.clientId, status: { not: "DRAFT" } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl text-ink">
          Billing<span className="brand-dot">.</span>
        </h2>
        <p className="mb-4 text-sm text-slate">Invoices and payment status for your account.</p>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-ink text-paper">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Description</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Due</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"></th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="border-t border-line">
                <td className="px-4 py-3 text-ink">
                  {invoice.description}
                  {invoice.isRecurring && <span className="ml-2 text-xs text-mist">(recurring)</span>}
                </td>
                <td className="px-4 py-3 font-semibold text-ink">
                  {formatAmount(invoice.amount, invoice.currency)}
                </td>
                <td className="px-4 py-3 text-slate">
                  {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("en-GB") : "—"}
                </td>
                <td className="px-4 py-3">
                  <span className="status-pill">{STATUS_LABELS[invoice.status]}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  {invoice.status !== "PAID" && invoice.paymentUrl && (
                    <a
                      href={invoice.paymentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block rounded-lg bg-green px-4 py-2 text-xs font-semibold text-white hover:bg-green-dark"
                    >
                      Pay now &rarr;
                    </a>
                  )}
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate">
                  No invoices yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
