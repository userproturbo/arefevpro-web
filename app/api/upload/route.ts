import { NextResponse } from "next/server";
import { generateUploadUrl, getPublicUrl } from "@/lib/storage";

type UploadRequestBody = {
  fileName?: string;
  fileType?: string;
};

function sanitizeFileName(fileName: string): string {
  const baseName = fileName.split("/").pop()?.split("\\").pop() ?? "file";
  const sanitized = baseName
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return sanitized || "file";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as UploadRequestBody;
    const fileName = body.fileName?.trim();
    const fileType = body.fileType?.trim();

    if (!fileName || !fileType) {
      return NextResponse.json(
        { error: "fileName and fileType are required" },
        { status: 400 },
      );
    }

    const safeFileName = sanitizeFileName(fileName);
    const key = `media/videos/${Date.now()}-${safeFileName}`;
    const uploadUrl = await generateUploadUrl(key, fileType);
    const publicUrl = getPublicUrl(key);

    return NextResponse.json({
      uploadUrl,
      publicUrl,
      key,
    });
  } catch (error) {
    console.error("Failed to create upload URL", error);

    const message =
      error instanceof Error ? error.message : "Failed to create upload URL";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
