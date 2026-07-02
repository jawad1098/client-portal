"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaff, requireAdmin } from "@/lib/guards";
import { saveUploadedFile, UploadError } from "@/lib/upload";

async function resolveLinkOrUpload(formData: FormData) {
  const url = String(formData.get("url") || "").trim();
  const file = formData.get("file");

  if (file instanceof File && file.size > 0) {
    try {
      const saved = await saveUploadedFile(file);
      return { url: saved.url, filename: saved.filename, size: saved.size };
    } catch (error) {
      if (error instanceof UploadError) {
        throw new Error(error.message);
      }
      throw error;
    }
  }

  if (!url) {
    throw new Error("Provide a URL or upload a file");
  }

  return { url, filename: null, size: null };
}

// --- Client resources (audience = CLIENT, scoped to a client) ---

export async function addClientResource(clientId: string, formData: FormData) {
  const session = await requireStaff();

  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();

  if (!title) {
    throw new Error("Title is required");
  }

  const { url, filename, size } = await resolveLinkOrUpload(formData);

  const count = await prisma.resource.count({ where: { clientId, audience: "CLIENT" } });

  await prisma.resource.create({
    data: {
      title,
      url,
      filename,
      size,
      description: description || null,
      clientId,
      audience: "CLIENT",
      order: count,
      createdById: session.user.id,
    },
  });

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/portal/resources");
}

// --- Team resources (audience = TEAM, global) ---

export async function addTeamResource(formData: FormData) {
  const session = await requireAdmin();

  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();

  if (!title) {
    throw new Error("Title is required");
  }

  const { url, filename, size } = await resolveLinkOrUpload(formData);

  const count = await prisma.resource.count({ where: { audience: "TEAM" } });

  await prisma.resource.create({
    data: {
      title,
      url,
      filename,
      size,
      description: description || null,
      clientId: null,
      audience: "TEAM",
      order: count,
      createdById: session.user.id,
    },
  });

  revalidatePath("/admin/resources");
}

export async function updateResource(resourceId: string, formData: FormData) {
  await requireStaff();

  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();

  if (!title) {
    throw new Error("Title is required");
  }

  const existing = await prisma.resource.findUnique({ where: { id: resourceId } });
  if (!existing) throw new Error("Resource not found");

  // If a new file is uploaded, replace the stored URL/filename/size
  const file = formData.get("file");
  let updateData: {
    title: string;
    description: string | null;
    url?: string;
    filename?: string | null;
    size?: number | null;
  } = { title, description: description || null };

  if (file instanceof File && file.size > 0) {
    try {
      const saved = await saveUploadedFile(file);
      updateData = { ...updateData, url: saved.url, filename: saved.filename, size: saved.size };
    } catch (error) {
      if (error instanceof UploadError) throw new Error(error.message);
      throw error;
    }
  } else {
    const url = String(formData.get("url") || "").trim();
    if (url) {
      updateData = { ...updateData, url, filename: null, size: null };
    }
  }

  await prisma.resource.update({ where: { id: resourceId }, data: updateData });

  if (existing.clientId) {
    revalidatePath(`/admin/clients/${existing.clientId}`);
    revalidatePath("/portal/resources");
  } else {
    revalidatePath("/admin/resources");
  }
}

export async function deleteResource(resourceId: string) {
  await requireAdmin();

  const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
  if (!resource) return;

  await prisma.resource.delete({ where: { id: resourceId } });

  if (resource.clientId) {
    revalidatePath(`/admin/clients/${resource.clientId}`);
    revalidatePath("/portal/resources");
  } else {
    revalidatePath("/admin/resources");
  }
}
