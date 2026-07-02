"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaff, requireAdmin } from "@/lib/guards";
import { notifyClientUsers } from "@/lib/actions/notifications";

export async function addInvoice(clientId: string, formData: FormData) {
  const session = await requireStaff();

  const description = String(formData.get("description") || "").trim();
  const amountPounds = String(formData.get("amount") || "").trim();
  const dueDateRaw = String(formData.get("dueDate") || "").trim();
  const isRecurring = formData.get("isRecurring") === "on";
  const paymentUrl = String(formData.get("paymentUrl") || "").trim();

  if (!description || !amountPounds) {
    throw new Error("Description and amount are required");
  }

  const amount = Math.round(parseFloat(amountPounds) * 100);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be a positive number");
  }

  if (paymentUrl && !/^https?:\/\//i.test(paymentUrl)) {
    throw new Error("Payment link must start with http:// or https://");
  }

  await prisma.invoice.create({
    data: {
      clientId,
      description,
      amount,
      dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
      isRecurring,
      paymentUrl: paymentUrl || null,
      createdById: session.user.id,
    },
  });

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/admin");
}

export async function markInvoiceStatus(
  invoiceId: string,
  status: "DRAFT" | "SENT" | "PAID" | "OVERDUE"
) {
  await requireStaff();

  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) return;

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status,
      paidAt: status === "PAID" ? new Date() : invoice.paidAt,
    },
  });

  if (status === "SENT") {
    const formatted = `$${(invoice.amount / 100).toFixed(2)}`;
    await notifyClientUsers(
      invoice.clientId,
      "INVOICE_SENT",
      "New invoice",
      `${invoice.description} — ${formatted}`,
      "/portal/billing"
    );
  }

  revalidatePath(`/admin/clients/${invoice.clientId}`);
  revalidatePath("/portal/billing");
  revalidatePath("/admin");
}

export async function updateInvoicePaymentUrl(invoiceId: string, formData: FormData) {
  await requireStaff();

  const paymentUrl = String(formData.get("paymentUrl") || "").trim();
  if (paymentUrl && !/^https?:\/\//i.test(paymentUrl)) {
    throw new Error("Payment link must start with http:// or https://");
  }

  const invoice = await prisma.invoice.update({
    where: { id: invoiceId },
    data: { paymentUrl: paymentUrl || null },
  });

  revalidatePath(`/admin/clients/${invoice.clientId}`);
  revalidatePath("/portal/billing");
}

export async function deleteInvoice(invoiceId: string) {
  await requireAdmin();

  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) return;

  await prisma.invoice.delete({ where: { id: invoiceId } });

  revalidatePath(`/admin/clients/${invoice.clientId}`);
  revalidatePath("/portal/billing");
  revalidatePath("/admin");
}
