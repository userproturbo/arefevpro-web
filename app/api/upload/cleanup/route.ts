import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteStorageObject } from "@/lib/storage";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = (await request.json()) as unknown;

    if (!isRecord(body)) {
      return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 });
    }

    const storageKey = typeof body.storageKey === "string" ? body.storageKey.trim() : "";

    if (!storageKey.startsWith("media/")) {
      return NextResponse.json({ error: "Invalid storage key" }, { status: 400 });
    }

    const mediaFile = await prisma.mediaFile.findUnique({
      where: { storageKey },
      select: { id: true },
    });

    if (mediaFile) {
      return NextResponse.json({ ok: true });
    }

    await deleteStorageObject(storageKey);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to cleanup uploaded object", {
      body,
      error,
    });

    return NextResponse.json({ error: "Failed to cleanup uploaded object" }, { status: 500 });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
