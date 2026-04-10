import { SectionType } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getUploadSizeLimitBytes,
  isAllowedMimeTypeForKind,
  isUploadMediaKind,
  MEDIA_SECTION_SLUG_BY_KIND,
  normalizeMimeType,
} from "@/lib/media-upload";
import { buildMediaStorageKey, generateUploadUrl, getPublicUrl } from "@/lib/storage";

type PresignUploadRequest = {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  albumId: string;
  kind: "IMAGE" | "VIDEO";
};

class PresignUploadError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "PresignUploadError";
  }
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = (await request.json()) as unknown;
    const input = parsePresignUploadRequest(body);
    const album = await prisma.album.findUnique({
      where: { id: input.albumId },
      select: {
        id: true,
        section: {
          select: {
            slug: true,
            type: true,
          },
        },
      },
    });

    if (!album) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    const expectedSectionSlug = MEDIA_SECTION_SLUG_BY_KIND[input.kind];
    const expectedSectionType =
      input.kind === "VIDEO" ? SectionType.VIDEO : SectionType.PHOTO;

    if (
      album.section.slug !== expectedSectionSlug ||
      album.section.type !== expectedSectionType
    ) {
      return NextResponse.json(
        {
          error: `Album does not accept ${input.kind.toLowerCase()} uploads`,
        },
        { status: 400 },
      );
    }

    const storageKey = buildMediaStorageKey({
      kind: input.kind,
      albumId: input.albumId,
      fileName: input.filename,
    });

    return NextResponse.json({
      uploadUrl: await generateUploadUrl(storageKey, input.mimeType),
      storageKey,
      publicUrl: getPublicUrl(storageKey),
      mimeType: input.mimeType,
      headers: {
        "Content-Type": input.mimeType,
      },
      expiresIn: 60 * 5,
    });
  } catch (error) {
    console.error("Failed to create presigned upload", {
      body,
      error,
    });

    return NextResponse.json(
      {
        error:
          error instanceof PresignUploadError
            ? error.message
            : "Failed to create presigned upload",
      },
      { status: error instanceof PresignUploadError ? error.status : 500 },
    );
  }
}

function parsePresignUploadRequest(rawInput: unknown): PresignUploadRequest {
  if (!isRecord(rawInput)) {
    throw new PresignUploadError("Request body must be a JSON object", 400);
  }

  const filename = parseRequiredString(rawInput.filename, "filename");
  const mimeType = normalizeMimeType(parseRequiredString(rawInput.mimeType, "mimeType"));
  const sizeBytes = parsePositiveInteger(rawInput.sizeBytes, "sizeBytes");
  const albumId = parseRequiredString(rawInput.albumId, "albumId");
  const kind = rawInput.kind;

  if (!isUploadMediaKind(kind)) {
    throw new PresignUploadError('kind must be either "IMAGE" or "VIDEO"', 400);
  }

  if (!isAllowedMimeTypeForKind(kind, mimeType)) {
    throw new PresignUploadError(`Unsupported mime type for ${kind}: ${mimeType}`, 400);
  }

  const maxSizeBytes = getUploadSizeLimitBytes(kind);

  if (sizeBytes > maxSizeBytes) {
    const maxSizeMb = Math.round(maxSizeBytes / (1024 * 1024));
    throw new PresignUploadError(`File exceeds maximum allowed size of ${maxSizeMb} MB`, 400);
  }

  return {
    filename,
    mimeType,
    sizeBytes,
    albumId,
    kind,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new PresignUploadError(`${fieldName} is required`, 400);
  }

  return value.trim();
}

function parsePositiveInteger(value: unknown, fieldName: string): number {
  if (!Number.isInteger(value) || Number(value) < 0) {
    throw new PresignUploadError(`${fieldName} must be a non-negative integer`, 400);
  }

  return Number(value);
}
