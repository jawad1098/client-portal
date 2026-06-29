"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff, requireAdmin } from "@/lib/guards";
import { generateToken } from "@/lib/tokens";

export async function createClient(formData: FormData) {
  await requireStaff();

  const name = String(formData.get("name") || "").trim();
  const status = String(formData.get("status") || "Active").trim();

  if (!name) {
    throw new Error("Client name is required");
  }

  const client = await prisma.client.create({
    data: { name, status },
  });

  const sendInvite = formData.get("sendInvite") === "on";
  const inviteEmail = String(formData.get("inviteEmail") || "").trim().toLowerCase();
  const inviteName = String(formData.get("inviteName") || "").trim();

  revalidatePath("/admin/clients");

  if (sendInvite && inviteEmail && inviteName) {
    const session = await requireStaff();
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invite = await prisma.invite.create({
      data: {
        email: inviteEmail,
        name: inviteName,
        role: "CLIENT",
        token,
        clientId: client.id,
        invitedById: session.user.id,
        expiresAt,
      },
    });

    redirect(`/admin/clients/${client.id}?invite=${invite.token}`);
  }

  redirect(`/admin/clients/${client.id}`);
}

export async function updateClient(clientId: string, formData: FormData) {
  await requireStaff();

  const name = String(formData.get("name") || "").trim();
  const status = String(formData.get("status") || "Active").trim();

  if (!name) {
    throw new Error("Client name is required");
  }

  await prisma.client.update({
    where: { id: clientId },
    data: { name, status },
  });

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/admin/clients");
}

export async function inviteClientUser(clientId: string, formData: FormData) {
  const session = await requireStaff();

  const email = String(formData.get("email") || "").trim().toLowerCase();
  const name = String(formData.get("name") || "").trim();

  if (!email || !name) {
    throw new Error("Name and email are required");
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.invite.create({
    data: {
      email,
      name,
      role: "CLIENT",
      token,
      clientId,
      invitedById: session.user.id,
      expiresAt,
    },
  });

  revalidatePath(`/admin/clients/${clientId}`);
  redirect(`/admin/clients/${clientId}?invite=${token}`);
}

// --- Stats ---

export async function addClientStat(clientId: string, formData: FormData) {
  await requireStaff();

  const label = String(formData.get("label") || "").trim();
  const value = String(formData.get("value") || "").trim();
  const month = String(formData.get("month") || "").trim();

  if (!label || !value || !month) {
    throw new Error("Label, value and month are required");
  }

  const count = await prisma.clientStat.count({ where: { clientId } });

  await prisma.clientStat.create({
    data: { clientId, label, value, month, order: count },
  });

  revalidatePath(`/admin/clients/${clientId}`);
}

export async function deleteClientStat(clientId: string, statId: string) {
  await requireStaff();
  await prisma.clientStat.delete({ where: { id: statId } });
  revalidatePath(`/admin/clients/${clientId}`);
}

// --- Checklist ---

export async function addChecklistItem(clientId: string, formData: FormData) {
  await requireStaff();

  const label = String(formData.get("label") || "").trim();
  if (!label) {
    throw new Error("Label is required");
  }

  const count = await prisma.checklistItem.count({ where: { clientId } });

  await prisma.checklistItem.create({
    data: { clientId, label, order: count },
  });

  revalidatePath(`/admin/clients/${clientId}`);
}

export async function toggleChecklistItem(clientId: string, itemId: string, done: boolean) {
  await requireStaff();
  await prisma.checklistItem.update({
    where: { id: itemId },
    data: { done },
  });
  revalidatePath(`/admin/clients/${clientId}`);
}

export async function deleteChecklistItem(clientId: string, itemId: string) {
  await requireStaff();
  await prisma.checklistItem.delete({ where: { id: itemId } });
  revalidatePath(`/admin/clients/${clientId}`);
}

// --- Links ---

export async function addClientLink(clientId: string, formData: FormData) {
  await requireStaff();

  const title = String(formData.get("title") || "").trim();
  const url = String(formData.get("url") || "").trim();
  const note = String(formData.get("note") || "").trim();

  if (!title || !url) {
    throw new Error("Title and URL are required");
  }

  const count = await prisma.clientLink.count({ where: { clientId } });

  await prisma.clientLink.create({
    data: { clientId, title, url, note: note || null, order: count },
  });

  revalidatePath(`/admin/clients/${clientId}`);
}

export async function deleteClientLink(clientId: string, linkId: string) {
  await requireStaff();
  await prisma.clientLink.delete({ where: { id: linkId } });
  revalidatePath(`/admin/clients/${clientId}`);
}

// --- Reports ---

export async function addReport(clientId: string, formData: FormData) {
  await requireStaff();

  const month = String(formData.get("month") || "").trim();
  const headline = String(formData.get("headline") || "").trim();
  const url = String(formData.get("url") || "").trim();

  if (!month || !headline) {
    throw new Error("Month and headline are required");
  }

  await prisma.report.create({
    data: { clientId, month, headline, url: url || null },
  });

  revalidatePath(`/admin/clients/${clientId}`);
}

export async function deleteReport(clientId: string, reportId: string) {
  await requireStaff();
  await prisma.report.delete({ where: { id: reportId } });
  revalidatePath(`/admin/clients/${clientId}`);
}

/**
 * Permanently removes a client and everything tied to it (portal users,
 * stats, checklist, links, reports, resources, updates, invites, messages,
 * invoices, milestones, tickets, bookings). Tasks linked to this client are
 * kept but unlinked, since they may still matter as internal work history.
 * Admin-only — there is no undo.
 */
export async function deleteClient(clientId: string) {
  await requireAdmin();

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) {
    throw new Error("Client not found");
  }

  await prisma.client.delete({ where: { id: clientId } });

  revalidatePath("/admin/clients");
  redirect("/admin/clients");
}
