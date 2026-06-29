"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireClient } from "@/lib/guards";

export async function approveReport(reportId: string) {
  const session = await requireClient();

  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report || report.clientId !== session.user.clientId) {
    throw new Error("Not authorised");
  }

  await prisma.report.update({
    where: { id: reportId },
    data: { approved: true, approvedAt: new Date() },
  });

  revalidatePath("/portal");
  revalidatePath(`/admin/clients/${report.clientId}`);
}
