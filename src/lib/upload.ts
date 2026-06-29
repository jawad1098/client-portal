import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const BLOCKED_EXTENSIONS = [".exe", ".bat", ".sh", ".cmd", ".msi", ".com", ".scr"];

export class UploadError extends Error {}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-200);
}

/**
 * Saves an uploaded File to public/uploads/<cuid>/<original-filename> and
 * returns its public URL, sanitized filename, and size in bytes.
 * Throws UploadError for oversized files or blocked extensions.
 */
export async function saveUploadedFile(
  file: File
): Promise<{ url: string; filename: string; size: number }> {
  if (file.size === 0) {
    throw new UploadError("File is empty");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new UploadError("File exceeds the 10MB size limit");
  }

  const originalName = file.name || "upload";
  const ext = path.extname(originalName).toLowerCase();
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    throw new UploadError(`Files with extension "${ext}" are not allowed`);
  }

  const safeName = sanitizeFilename(originalName);
  const folderId = randomBytes(12).toString("hex");
  const uploadDir = path.join(process.cwd(), "public", "uploads", folderId);

  await mkdir(uploadDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, safeName), buffer);

  return {
    url: `/uploads/${folderId}/${safeName}`,
    filename: safeName,
    size: file.size,
  };
}
