"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaff, requireAdmin } from "@/lib/guards";
import { createNotification } from "@/lib/actions/notifications";
import { saveUploadedFile, UploadError } from "@/lib/upload";

export async function createTask(formData: FormData) {
  const session = await requireStaff();

  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const dueDateRaw = String(formData.get("dueDate") || "").trim();
  const assigneeId = String(formData.get("assigneeId") || "").trim();
  const clientId = String(formData.get("clientId") || "").trim();

  if (!title) {
    throw new Error("Title is required");
  }

  // Parse repeatable attachment rows serialized as attachmentLabel_0/attachmentUrl_0, etc.
  const attachments: { label: string; url: string }[] = [];
  let i = 0;
  while (formData.has(`attachmentUrl_${i}`)) {
    const label = String(formData.get(`attachmentLabel_${i}`) || "").trim();
    const url = String(formData.get(`attachmentUrl_${i}`) || "").trim();
    if (url) {
      attachments.push({ label: label || url, url });
    }
    i++;
  }

  const task = await prisma.$transaction(async (tx) => {
    const createdTask = await tx.task.create({
      data: {
        title,
        description: description || null,
        dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
        assigneeId: assigneeId || null,
        clientId: clientId || null,
        createdById: session.user.id,
      },
    });

    if (attachments.length > 0) {
      await tx.taskAttachment.createMany({
        data: attachments.map((a) => ({
          taskId: createdTask.id,
          url: a.url,
          label: a.label,
          kind: "INSTRUCTION" as const,
          addedById: session.user.id,
        })),
      });
    }

    return createdTask;
  });

  if (assigneeId && assigneeId !== session.user.id) {
    await createNotification(
      assigneeId,
      "TASK_ASSIGNED",
      "New task assigned to you",
      title,
      `/admin/tasks/${task.id}`
    );
  }

  revalidatePath("/admin/tasks");
}

export async function updateTaskStatus(taskId: string, status: "TODO" | "IN_PROGRESS" | "DONE") {
  await requireStaff();
  await prisma.task.update({
    where: { id: taskId },
    data: { status },
  });
  revalidatePath("/admin/tasks");
}

export async function addTaskComment(taskId: string, formData: FormData) {
  const session = await requireStaff();
  const body = String(formData.get("body") || "").trim();

  if (!body) {
    throw new Error("Comment cannot be empty");
  }

  await prisma.taskComment.create({
    data: { taskId, authorId: session.user.id, body },
  });

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (task) {
    const notifyIds = new Set<string>();
    if (task.assigneeId && task.assigneeId !== session.user.id) notifyIds.add(task.assigneeId);
    if (task.createdById !== session.user.id) notifyIds.add(task.createdById);
    for (const userId of notifyIds) {
      await createNotification(
        userId,
        "TASK_COMMENT",
        `New comment on "${task.title}"`,
        body.slice(0, 140),
        `/admin/tasks/${taskId}`
      );
    }
  }

  revalidatePath("/admin/tasks");
  revalidatePath(`/admin/tasks/${taskId}`);
}

export async function updateTask(taskId: string, formData: FormData) {
  await requireAdmin();

  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const dueDateRaw = String(formData.get("dueDate") || "").trim();
  const assigneeId = String(formData.get("assigneeId") || "").trim();
  const clientId = String(formData.get("clientId") || "").trim();
  const status = String(formData.get("status") || "TODO") as "TODO" | "IN_PROGRESS" | "DONE";

  if (!title) {
    throw new Error("Title is required");
  }

  const existing = await prisma.task.findUnique({ where: { id: taskId } });

  await prisma.task.update({
    where: { id: taskId },
    data: {
      title,
      description: description || null,
      dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
      assigneeId: assigneeId || null,
      clientId: clientId || null,
      status,
    },
  });

  if (assigneeId && assigneeId !== existing?.assigneeId) {
    await createNotification(
      assigneeId,
      "TASK_ASSIGNED",
      "Task assigned to you",
      title,
      `/admin/tasks/${taskId}`
    );
  }

  revalidatePath("/admin/tasks");
  revalidatePath(`/admin/tasks/${taskId}`);
}

export async function deleteTask(taskId: string) {
  await requireAdmin();
  await prisma.task.delete({ where: { id: taskId } });
  revalidatePath("/admin/tasks");
}

export async function addTaskAttachment(
  taskId: string,
  kind: "INSTRUCTION" | "PROOF",
  formData: FormData
) {
  const session = await requireStaff();

  let url = String(formData.get("url") || "").trim();
  const label = String(formData.get("label") || "").trim();
  const file = formData.get("file");

  if (!url && file instanceof File && file.size > 0) {
    try {
      const saved = await saveUploadedFile(file);
      url = saved.url;
    } catch (error) {
      if (error instanceof UploadError) {
        throw new Error(error.message);
      }
      throw error;
    }
  }

  if (!url) {
    throw new Error("A URL or file is required");
  }

  await prisma.taskAttachment.create({
    data: {
      taskId,
      url,
      label: label || url,
      kind,
      addedById: session.user.id,
    },
  });

  revalidatePath(`/admin/tasks/${taskId}`);
  revalidatePath("/admin/tasks");
}

export async function deleteTaskAttachment(attachmentId: string) {
  await requireAdmin();

  const attachment = await prisma.taskAttachment.findUnique({ where: { id: attachmentId } });
  if (!attachment) return;

  await prisma.taskAttachment.delete({ where: { id: attachmentId } });

  revalidatePath(`/admin/tasks/${attachment.taskId}`);
  revalidatePath("/admin/tasks");
}
