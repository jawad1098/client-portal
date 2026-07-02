import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  updateClient,
  addClientStat,
  deleteClientStat,
  addChecklistItem,
  deleteChecklistItem,
  addClientLink,
  deleteClientLink,
  addReport,
  deleteReport,
  inviteClientUser,
} from "@/lib/actions/clients";
import { deleteResource } from "@/lib/actions/resources";
import { EditResourceButton } from "@/components/edit-resource-button";
import { addUpdate, deleteUpdate } from "@/lib/actions/updates";
import { sendMessage } from "@/lib/actions/messages";
import { addInvoice, deleteInvoice, updateInvoicePaymentUrl } from "@/lib/actions/invoices";
import { addMilestone, deleteMilestone } from "@/lib/actions/milestones";
import { ChecklistToggle } from "./checklist-toggle";
import { InviteLink } from "./invite-link";
import { MilestoneToggle } from "./milestone-toggle";
import { InvoiceStatusButtons } from "./invoice-status-buttons";
import { ImpersonateButton } from "@/components/impersonate-button";
import { AddResourceForm } from "@/components/add-resource-form";
import { DeleteClientButton } from "@/components/delete-client-button";

const PERIOD_LABELS: Record<string, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
};

const INVOICE_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  PAID: "Paid",
  OVERDUE: "Overdue",
};

function formatAmount(amount: number, currency: string) {
  const symbol = currency === "GBP" ? "£" : currency + " ";
  return `${symbol}${(amount / 100).toFixed(2)}`;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ invite?: string }>;
}) {
  const { id } = await params;
  const { invite: inviteToken } = await searchParams;
  const session = await auth();
  const isAdmin = session?.user.role === "ADMIN";

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      stats: { orderBy: { order: "asc" } },
      checklist: { orderBy: { order: "asc" } },
      links: { orderBy: { order: "asc" } },
      reports: { orderBy: { createdAt: "desc" } },
      resources: { where: { audience: "CLIENT" }, orderBy: { order: "asc" } },
      updates: { orderBy: { createdAt: "desc" } },
      users: true,
      invites: { where: { status: "PENDING" }, orderBy: { createdAt: "desc" } },
      messages: { include: { sender: true }, orderBy: { createdAt: "asc" } },
      invoices: { orderBy: { createdAt: "desc" } },
      milestones: { orderBy: { date: "asc" } },
    },
  });

  if (!client) {
    notFound();
  }

  const updateClientWithId = updateClient.bind(null, client.id);
  const addStatWithId = addClientStat.bind(null, client.id);
  const addChecklistWithId = addChecklistItem.bind(null, client.id);
  const addLinkWithId = addClientLink.bind(null, client.id);
  const addReportWithId = addReport.bind(null, client.id);
  const inviteUserWithId = inviteClientUser.bind(null, client.id);
const addUpdateWithId = addUpdate.bind(null, client.id);
  const sendMessageWithId = sendMessage.bind(null, client.id);
  const addInvoiceWithId = addInvoice.bind(null, client.id);
  const addMilestoneWithId = addMilestone.bind(null, client.id);

  return (
    <div className="flex flex-col gap-10">
      <div>
        <Link href="/admin/clients" className="text-sm text-slate hover:text-green-dark">
          &larr; All clients
        </Link>
        <h1 className="mt-2 text-2xl text-ink">
          {client.name}
          <span className="brand-dot">.</span>
        </h1>
        <p className="text-sm text-slate">Status: {client.status}</p>
      </div>

      {inviteToken && <InviteLink token={inviteToken} />}

      {/* Client details */}
      <section>
        <h2 className="mb-3 text-lg text-ink">Details</h2>
        <form action={updateClientWithId} className="card flex max-w-lg flex-col gap-3 p-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">Name</label>
            <input
              name="name"
              defaultValue={client.name}
              required
              className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">Status</label>
            <select
              name="status"
              defaultValue={client.status}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green"
            >
              <option value="Onboarding">Onboarding</option>
              <option value="Active">Active</option>
              <option value="Paused">Paused</option>
            </select>
          </div>
          <button
            type="submit"
            className="mt-1 self-start rounded-lg bg-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-dark"
          >
            Save
          </button>
        </form>
      </section>

      {/* Stats */}
      <section>
        <h2 className="mb-3 text-lg text-ink">Your numbers</h2>
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
          {client.stats.map((stat) => (
            <div key={stat.id} className="card relative p-4">
              <div className="stat-num">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
              <div className="mt-1 text-[0.65rem] text-mist">{stat.month}</div>
              <form action={deleteClientStat.bind(null, client.id, stat.id)} className="absolute top-2 right-2">
                <button type="submit" className="text-xs text-slate hover:text-red-600">
                  &times;
                </button>
              </form>
            </div>
          ))}
        </div>
        <form action={addStatWithId} className="card flex flex-wrap items-end gap-3 p-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink">Label</label>
            <input name="label" required className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink">Value</label>
            <input name="value" required className="w-24 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink">Month</label>
            <input name="month" required placeholder="June 2026" className="w-32 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green" />
          </div>
          <button type="submit" className="rounded-lg bg-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-dark">
            Add stat
          </button>
        </form>
      </section>

      {/* Checklist */}
      <section>
        <h2 className="mb-3 text-lg text-ink">What&apos;s live</h2>
        <div className="card mb-4 p-2">
          <ul className="checklist">
            {client.checklist.map((item) => (
              <li key={item.id} className={item.done ? "done" : "todo"}>
                <div className="flex items-center justify-between gap-3 pr-2">
                  <span>{item.label}</span>
                  <div className="flex items-center gap-3">
                    <ChecklistToggle clientId={client.id} itemId={item.id} done={item.done} />
                    <form action={deleteChecklistItem.bind(null, client.id, item.id)}>
                      <button type="submit" className="text-xs text-slate hover:text-red-600">
                        Remove
                      </button>
                    </form>
                  </div>
                </div>
              </li>
            ))}
            {client.checklist.length === 0 && (
              <li className="todo">No checklist items yet.</li>
            )}
          </ul>
        </div>
        <form action={addChecklistWithId} className="card flex items-end gap-3 p-4">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-ink">New checklist item</label>
            <input name="label" required className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green" />
          </div>
          <button type="submit" className="rounded-lg bg-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-dark">
            Add
          </button>
        </form>
      </section>

      {/* Links */}
      <section>
        <h2 className="mb-3 text-lg text-ink">Quick links</h2>
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {client.links.map((link) => (
            <div key={link.id} className="link-card">
              <b className="font-display block">{link.title}</b>
              <span className="text-sm text-slate">{link.note}</span>
              <div className="mt-2 flex items-center justify-between">
                <a href={link.url} target="_blank" rel="noreferrer" className="go text-sm">
                  Open &rarr;
                </a>
                <form action={deleteClientLink.bind(null, client.id, link.id)}>
                  <button type="submit" className="text-xs text-slate hover:text-red-600">
                    Remove
                  </button>
                </form>
              </div>
            </div>
          ))}
          {client.links.length === 0 && <p className="text-sm text-slate">No links yet.</p>}
        </div>
        <form action={addLinkWithId} className="card flex flex-wrap items-end gap-3 p-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink">Title</label>
            <input name="title" required className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink">URL</label>
            <input name="url" required type="url" className="w-56 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink">Note</label>
            <input name="note" className="w-56 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green" />
          </div>
          <button type="submit" className="rounded-lg bg-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-dark">
            Add link
          </button>
        </form>
      </section>

      {/* Reports */}
      <section>
        <h2 className="mb-3 text-lg text-ink">Monthly reports</h2>
        <div className="card mb-4 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-ink text-paper">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Month</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Headline</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Approval</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"></th>
              </tr>
            </thead>
            <tbody>
              {client.reports.map((report) => (
                <tr key={report.id} className="border-t border-line">
                  <td className="px-4 py-3">{report.month}</td>
                  <td className="px-4 py-3">{report.headline}</td>
                  <td className="px-4 py-3">
                    {report.approved ? (
                      <span className="status-pill">Approved</span>
                    ) : (
                      <span className="text-xs text-slate">Pending</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {report.url && (
                      <a href={report.url} target="_blank" rel="noreferrer" className="mr-3 font-semibold text-green-dark">
                        View
                      </a>
                    )}
                    <form action={deleteReport.bind(null, client.id, report.id)} className="inline">
                      <button type="submit" className="text-xs text-slate hover:text-red-600">
                        Remove
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {client.reports.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate">
                    No reports yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <form action={addReportWithId} className="card flex flex-wrap items-end gap-3 p-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink">Month</label>
            <input name="month" required placeholder="June 2026" className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink">Headline</label>
            <input name="headline" required className="w-72 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink">Report URL (optional)</label>
            <input name="url" type="url" className="w-56 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green" />
          </div>
          <button type="submit" className="rounded-lg bg-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-dark">
            Add report
          </button>
        </form>
      </section>

      {/* Messages */}
      <section>
        <h2 className="mb-3 text-lg text-ink">Messages</h2>
        <div className="card mb-4 flex flex-col gap-3 p-4">
          {client.messages.map((message) => (
            <div key={message.id} className="border-b border-line pb-3 last:border-none last:pb-0">
              <p className="text-sm text-ink">{message.body}</p>
              <p className="mt-1 text-xs text-slate">
                {message.sender.name} &middot; {new Date(message.createdAt).toLocaleString("en-GB")}
              </p>
            </div>
          ))}
          {client.messages.length === 0 && <p className="text-sm text-slate">No messages yet.</p>}
        </div>
        <form action={sendMessageWithId} className="card flex flex-wrap items-end gap-3 p-4">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-ink">Message</label>
            <input name="body" required className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green" />
          </div>
          <button type="submit" className="rounded-lg bg-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-dark">
            Send
          </button>
        </form>
      </section>

      {/* Billing */}
      <section>
        <h2 className="mb-3 text-lg text-ink">Billing</h2>
        <div className="card mb-4 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-ink text-paper">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Description</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Due</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Payment link</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"></th>
              </tr>
            </thead>
            <tbody>
              {client.invoices.map((invoice) => (
                <tr key={invoice.id} className="border-t border-line">
                  <td className="px-4 py-3">{invoice.description}</td>
                  <td className="px-4 py-3 font-semibold text-ink">{formatAmount(invoice.amount, invoice.currency)}</td>
                  <td className="px-4 py-3 text-slate">
                    {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("en-GB") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="status-pill">{INVOICE_STATUS_LABELS[invoice.status]}</span>
                  </td>
                  <td className="px-4 py-3">
                    <form action={updateInvoicePaymentUrl.bind(null, invoice.id)} className="flex items-center gap-2">
                      <input
                        name="paymentUrl"
                        type="url"
                        placeholder="https://pay.example.com/..."
                        defaultValue={invoice.paymentUrl ?? ""}
                        className="w-44 rounded-lg border border-line px-2 py-1.5 text-xs outline-none focus:border-green"
                      />
                      <button type="submit" className="text-xs font-semibold text-green-dark hover:underline">
                        Save
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <InvoiceStatusButtons invoiceId={invoice.id} status={invoice.status} />
                      {isAdmin && (
                        <form action={deleteInvoice.bind(null, invoice.id)}>
                          <button type="submit" className="text-xs text-slate hover:text-red-600">
                            Remove
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {client.invoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate">
                    No invoices yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <form action={addInvoiceWithId} className="card flex flex-wrap items-end gap-3 p-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink">Description</label>
            <input name="description" required className="w-56 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink">Amount (£)</label>
            <input name="amount" required type="number" step="0.01" min="0.01" className="w-28 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink">Due date</label>
            <input name="dueDate" type="date" className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink">Payment link</label>
            <input
              name="paymentUrl"
              type="url"
              placeholder="https://pay.example.com/..."
              className="w-56 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green"
            />
          </div>
          <label className="mb-1 flex items-center gap-2 text-xs font-medium text-ink">
            <input name="isRecurring" type="checkbox" />
            Recurring
          </label>
          <button type="submit" className="rounded-lg bg-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-dark">
            Add invoice
          </button>
        </form>
      </section>

      {/* Milestones */}
      <section>
        <h2 className="mb-3 text-lg text-ink">Milestones</h2>
        <div className="card mb-4 p-2">
          <ul className="checklist">
            {client.milestones.map((milestone) => (
              <li key={milestone.id} className={milestone.done ? "done" : "todo"}>
                <div className="flex items-center justify-between gap-3 pr-2">
                  <span>
                    {milestone.title}
                    <span className="ml-2 text-xs text-mist">
                      {new Date(milestone.date).toLocaleDateString("en-GB")}
                    </span>
                  </span>
                  <div className="flex items-center gap-3">
                    <MilestoneToggle clientId={client.id} milestoneId={milestone.id} done={milestone.done} />
                    {isAdmin && (
                      <form action={deleteMilestone.bind(null, client.id, milestone.id)}>
                        <button type="submit" className="text-xs text-slate hover:text-red-600">
                          Remove
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </li>
            ))}
            {client.milestones.length === 0 && (
              <li className="todo">No milestones yet.</li>
            )}
          </ul>
        </div>
        <form action={addMilestoneWithId} className="card flex flex-wrap items-end gap-3 p-4">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-ink">Title</label>
            <input name="title" required className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink">Date</label>
            <input name="date" required type="date" className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green" />
          </div>
          <button type="submit" className="rounded-lg bg-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-dark">
            Add milestone
          </button>
        </form>
      </section>

      {/* Resources */}
      <section>
        <h2 className="mb-3 text-lg text-ink">Resources</h2>
        <p className="mb-3 text-sm text-slate">Links and files shared with this client — brand assets, guides, contracts, photos.</p>
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {client.resources.map((resource) => (
            <div key={resource.id} className="link-card">
              <b className="font-display block">{resource.title}</b>
              {resource.filename ? (
                <span className="text-sm text-slate">
                  {resource.filename} &middot; {formatSize(resource.size ?? 0)}
                </span>
              ) : (
                resource.description && <span className="text-sm text-slate">{resource.description}</span>
              )}
              <div className="mt-2 flex items-center justify-between">
                <a href={resource.url} target="_blank" rel="noreferrer" className="go text-sm">
                  {resource.filename ? "Download" : "Open"} &rarr;
                </a>
                {isAdmin && (
                  <div className="flex items-center gap-3">
                    <EditResourceButton resource={resource} />
                    <form action={deleteResource.bind(null, resource.id)}>
                      <button type="submit" className="text-xs text-slate hover:text-red-600">
                        Remove
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          ))}
          {client.resources.length === 0 && <p className="text-sm text-slate">No resources yet.</p>}
        </div>
        <AddResourceForm clientId={client.id} />
      </section>

      {/* Updates */}
      <section>
        <h2 className="mb-3 text-lg text-ink">Updates</h2>
        <div className="mb-4 flex flex-col gap-3">
          {client.updates.map((update) => (
            <div key={update.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="status-pill">{PERIOD_LABELS[update.period]}</span>
                  <b className="font-display">{update.title}</b>
                </div>
                <form action={deleteUpdate.bind(null, update.id)}>
                  <button type="submit" className="text-xs text-slate hover:text-red-600">
                    &times;
                  </button>
                </form>
              </div>
              <p className="mt-2 text-sm text-slate">{update.body}</p>
              <p className="mt-2 text-xs text-mist">
                {new Date(update.createdAt).toLocaleString("en-GB")}
              </p>
            </div>
          ))}
          {client.updates.length === 0 && <p className="text-sm text-slate">No updates yet.</p>}
        </div>
        <form action={addUpdateWithId} className="card flex flex-wrap items-end gap-3 p-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink">Period</label>
            <select name="period" defaultValue="DAILY" className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green">
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink">Title</label>
            <input name="title" required className="w-56 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green" />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-ink">Body</label>
            <textarea name="body" required rows={2} className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green" />
          </div>
          <button type="submit" className="rounded-lg bg-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-dark">
            Post update
          </button>
        </form>
      </section>

      {/* Client users + invites */}
      <section>
        <h2 className="mb-3 text-lg text-ink">Portal users</h2>
        <div className="card mb-4 p-4">
          {client.users.length === 0 && <p className="text-sm text-slate">No portal users yet.</p>}
          <ul className="flex flex-col gap-2">
            {client.users.map((user) => (
              <li key={user.id} className="flex items-center justify-between gap-3 text-sm text-ink">
                <span>
                  {user.name} &mdash; <span className="text-slate">{user.email}</span>
                </span>
                {isAdmin && <ImpersonateButton targetUserId={user.id} />}
              </li>
            ))}
          </ul>
          {client.invites.length > 0 && (
            <div className="mt-4 border-t border-line pt-3">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate">Pending invites</p>
              <ul className="flex flex-col gap-1">
                {client.invites.map((invite) => (
                  <li key={invite.id} className="text-sm text-slate">
                    {invite.name} ({invite.email})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <form action={inviteUserWithId} className="card flex flex-wrap items-end gap-3 p-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink">Name</label>
            <input name="name" required className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink">Email</label>
            <input name="email" required type="email" className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green" />
          </div>
          <button type="submit" className="rounded-lg bg-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-dark">
            Send invite
          </button>
        </form>
      </section>

      {isAdmin && (
        <section>
          <h2 className="mb-3 text-lg text-ink">Danger zone</h2>
          <DeleteClientButton clientId={client.id} clientName={client.name} />
        </section>
      )}
    </div>
  );
}
