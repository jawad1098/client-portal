import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const BLOCKED_EXTENSIONS = [".exe", ".bat", ".sh", ".cmd", ".msi", ".com", ".scr"];

export class UploadError extends Error {}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
}

async function uploadToSupabase(
  arrayBuffer: ArrayBuffer,
  filename: string,
  contentType: string
): Promise<string> {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_ANON_KEY!;
  const objectPath = `${randomBytes(12).toString("hex")}/${filename}`;

  const res = await fetch(
    `${supabaseUrl}/storage/v1/object/resources/${objectPath}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": contentType,
        "x-upsert": "false",
      },
      body: arrayBuffer,
    }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => res.status.toString());
    throw new UploadError(`Storage upload failed: ${body}`);
  }

  return `${supabaseUrl}/storage/v1/object/public/resources/${objectPath}`;
}

export async function saveUploadedFile(
  file: File
): Promise<{ url: string; filename: string; size: number }> {
  if (file.size === 0) throw new UploadError("File is empty");
  if (file.size > MAX_FILE_SIZE) throw new UploadError("File exceeds the 10MB size limit");

  const originalName = file.name || "upload";
  const ext = path.extname(originalName).toLowerCase();
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    throw new UploadError(`Files with extension "${ext}" are not allowed`);
  }

  const safeName = sanitizeFilename(originalName);
  const arrayBuffer = await file.arrayBuffer();
  const contentType = file.type || "application/octet-stream";

  // Production: use Supabase Storage (Vercel filesystem is read-only)
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    const url = await uploadToSupabase(arrayBuffer, safeName, contentType);
    return { url, filename: safeName, size: file.size };
  }

  // Local dev fallback: write to public/uploads
  const buffer = Buffer.from(arrayBuffer);
  const folderId = randomBytes(12).toString("hex");
  const uploadDir = path.join(process.cwd(), "public", "uploads", folderId);
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, safeName), buffer);
  return {
    url: `/uploads/${folderId}/${safeName}`,
    filename: safeName,
    size: file.size,
  };
}
