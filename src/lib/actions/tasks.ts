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

export type BulkTaskRow = {
  title: string;
  description?: string;
  dueDate?: string;
  assigneeId?: string;
  clientId?: string;
  status?: "TODO" | "IN_PROGRESS" | "DONE";
};

export async function createTasksBulk(rows: BulkTaskRow[]) {
  const session = await requireStaff();

  const validRows = rows.filter((r) => r.title.trim());
  if (validRows.length === 0) throw new Error("At least one task title is required");

  const created = await prisma.$transaction(
    validRows.map((r) =>
      prisma.task.create({
        data: {
          title: r.title.trim(),
          description: r.description?.trim() || null,
          dueDate: r.dueDate ? new Date(r.dueDate) : null,
          assigneeId: r.assigneeId || null,
          clientId: r.clientId || null,
          status: r.status || "TODO",
          createdById: session.user.id,
        },
      })
    )
  );

  for (const task of created) {
    if (task.assigneeId && task.assigneeId !== session.user.id) {
      await createNotification(
        task.assigneeId,
        "TASK_ASSIGNED",
        "New task assigned to you",
        task.title,
        `/admin/tasks/${task.id}`
      );
    }
  }

  revalidatePath("/admin/tasks");
}

export async function updateTaskField(
  taskId: string,
  field: "title" | "description" | "dueDate" | "assigneeId" | "clientId" | "status",
  value: string
) {
  const session = await requireStaff();

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new Error("Task not found");

  // Team members can only edit tasks assigned to them
  if (session.user.role === "TEAM" && task.assigneeId !== session.user.id) {
    throw new Error("Not authorized");
  }

  let data: Record<string, unknown> = {};
  if (field === "title") {
    if (!value.trim()) throw new Error("Title cannot be empty");
    data.title = value.trim();
  } else if (field === "description") {
    data.description = value.trim() || null;
  } else if (field === "dueDate") {
    data.dueDate = value ? new Date(value) : null;
  } else if (field === "assigneeId") {
    data.assigneeId = value || null;
  } else if (field === "clientId") {
    data.clientId = value || null;
  } else if (field === "status") {
    data.status = value;
  }

  await prisma.task.update({ where: { id: taskId }, data });

  if (field === "assigneeId" && value && value !== task.assigneeId) {
    await createNotification(
      value,
      "TASK_ASSIGNED",
      "Task assigned to you",
      task.title,
      `/admin/tasks/${taskId}`
    );
  }

  revalidatePath("/admin/tasks");
  revalidatePath(`/admin/tasks/${taskId}`);
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
