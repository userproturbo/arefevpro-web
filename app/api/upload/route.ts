import { PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import path from "node:path";
import { s3 } from "@/lib/s3";
import { getPublicUrl, getStorageBucket } from "@/lib/storage";

function sanitizeFileName(fileName: string): string {
  const baseName = path.basename(fileName);
  const normalized = baseName.normalize("NFKD");
  const extension = path.extname(normalized).toLowerCase();
  const nameWithoutExtension = path.basename(normalized, extension);
  const sanitizedName = nameWithoutExtension
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const sanitizedExtension = extension.replace(/[^a-z0-9.]/g, "");

  const safeName = sanitizedName || "file";
  return `${safeName}${sanitizedExtension}`;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "file must not be empty" }, { status: 400 });
    }

    const safeFileName = sanitizeFileName(file.name);
    const extension = path.extname(safeFileName);
    const baseName = path.basename(safeFileName, extension) || "file";
    const generatedFileName = `${Date.now()}-${randomUUID()}-${baseName}${extension}`;
    const key = generatedFileName;
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const contentType = file.type || "application/octet-stream";

    await s3.send(
      new PutObjectCommand({
        Bucket: getStorageBucket(),
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );

    return NextResponse.json({
      storageKey: key,
      publicUrl: getPublicUrl(key),
      mimeType: contentType,
      size: file.size,
    });
  } catch (error) {
    console.error("Failed to upload file", error);

    const message = error instanceof Error ? error.message : "Failed to upload file";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
