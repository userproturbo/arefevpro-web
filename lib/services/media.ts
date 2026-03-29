import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { MediaKind, Prisma, type MediaFile } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { s3 } from "@/lib/s3";
import { generateUniqueMediaSlug, slugify } from "@/lib/services/slugs";
import { getStorageBucket, storageObjectExists } from "@/lib/storage";

const MIME_TYPES_BY_KIND: Record<"VIDEO" | "IMAGE", readonly string[]> = {
  VIDEO: ["video/mp4", "video/webm"],
  IMAGE: ["image/jpeg", "image/png"],
};

const DEFAULT_MAX_FILE_SIZE_BYTES = 1024 * 1024 * 1024;
const DEFAULT_MAX_VIDEO_DURATION_SEC = 10 * 60;
const SLUG_MAX_ATTEMPTS = 5;

const mediaLimits = {
  maxFileSizeBytes: readPositiveIntEnv("MEDIA_MAX_SIZE_BYTES", DEFAULT_MAX_FILE_SIZE_BYTES),
  maxVideoDurationSec: readPositiveIntEnv(
    "MEDIA_MAX_VIDEO_DURATION_SEC",
    DEFAULT_MAX_VIDEO_DURATION_SEC,
  ),
  validateStorageObject: process.env.MEDIA_VALIDATE_S3_OBJECT === "true",
};

type MediaKindInput = "VIDEO" | "IMAGE";

type NullableNumber = number | null;

type MediaMetadataInput = {
  storageKey: string;
  publicUrl: string;
  mimeType: string;
  sizeBytes: number;
  width: NullableNumber;
  height: NullableNumber;
  durationSec: NullableNumber;
};

export type CreateMediaInput = MediaMetadataInput & {
  kind: MediaKindInput;
  albumId: string;
  title: string;
  isPublished?: boolean;
  isFeatured?: boolean;
  thumbnail?: Omit<MediaMetadataInput, "durationSec"> & {
    durationSec?: NullableNumber;
  };
};

type CreatedVideo = Prisma.VideoGetPayload<{
  include: {
    album: {
      select: {
        id: true;
        title: true;
        slug: true;
      };
    };
    videoFile: true;
    thumbnail: true;
  };
}>;

export type CreatedMediaResult = {
  mediaFile: MediaFile;
  video: CreatedVideo | null;
};

export type DeletedMediaResult = {
  deletedMediaId: string;
  deletedVideoCount: number;
  deletedThumbnailCount: number;
};

export type FeaturedVideo = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  createdAt: Date;
  sectionSlug: string;
  albumSlug: string;
  videoUrl: string;
  posterUrl: string | null;
};

export class MediaServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "MediaServiceError";
  }
}

export async function createMedia(rawInput: unknown): Promise<CreatedMediaResult> {
  const input = parseCreateMediaInput(rawInput);
  logMediaEvent("media.create.start", {
    albumId: input.albumId,
    kind: input.kind,
    storageKey: input.storageKey,
  });

  try {
    await validateStorageState(input);

    return await prisma.$transaction(async (tx) => {
      const album = await tx.album.findUnique({
        where: { id: input.albumId },
        select: { id: true, title: true, slug: true, coverId: true },
      });

      if (!album) {
        throw new MediaServiceError("Album not found", 404);
      }

      const mediaFileResult = await findOrCreateMediaFile(tx, {
        title: input.kind === "IMAGE" ? input.title : null,
        slug: input.kind === "IMAGE" ? await generateUniqueMediaSlug(input.title) : null,
        kind: input.kind,
        storageKey: input.storageKey,
        publicUrl: input.publicUrl,
        mimeType: input.mimeType,
        albumId: input.kind === "IMAGE" ? album.id : null,
        order: 0,
        isPublished: input.isPublished ?? false,
        sizeBytes: input.sizeBytes,
        width: input.width,
        height: input.height,
        durationSec: input.durationSec,
      });
      const mediaFile = mediaFileResult.mediaFile;

      if (input.kind !== "VIDEO") {
        if (input.isPublished && !album.coverId) {
          await tx.album.update({
            where: { id: album.id },
            data: {
              coverId: mediaFile.id,
              isPublished: true,
            },
          });
        }

        const result = {
          mediaFile,
          video: null,
        };

        logMediaEvent("media.create.success", {
          albumId: input.albumId,
          kind: input.kind,
          mediaFileId: mediaFile.id,
          storageKey: input.storageKey,
          videoId: null,
        });

        return result;
      }

      const thumbnail = input.thumbnail
        ? (
            await findOrCreateMediaFile(tx, {
            title: `${input.title} Poster`,
            slug: await generateUniqueMediaSlug(`${input.title} Poster`),
            kind: MediaKind.IMAGE,
            storageKey: input.thumbnail.storageKey,
            publicUrl: input.thumbnail.publicUrl,
            mimeType: input.thumbnail.mimeType,
            albumId: null,
            order: 0,
            isPublished: false,
            sizeBytes: input.thumbnail.sizeBytes,
            width: input.thumbnail.width,
            height: input.thumbnail.height,
            durationSec: null,
          })
          ).mediaFile
        : null;

      const existingVideo = await tx.video.findFirst({
        where: {
          videoFileId: mediaFile.id,
        },
        include: {
          album: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
          videoFile: true,
          thumbnail: true,
        },
      });

      const video =
        existingVideo
          ? await updateExistingVideo(tx, existingVideo.id, {
              title: input.title,
              thumbnailId: thumbnail?.id ?? existingVideo.thumbnail?.id ?? null,
              isPublished: input.isPublished ?? existingVideo.isPublished,
              isFeatured: input.isFeatured ?? existingVideo.isFeatured,
            })
          : await createVideoWithUniqueSlug(tx, {
              albumId: album.id,
              title: input.title,
              videoFileId: mediaFile.id,
              thumbnailId: thumbnail?.id ?? null,
              isPublished: input.isPublished ?? false,
              isFeatured: input.isFeatured ?? false,
              storageKey: input.storageKey,
            });

      const result = {
        mediaFile,
        video,
      };

        logMediaEvent("media.create.success", {
          albumId: input.albumId,
          kind: input.kind,
          mediaFileId: mediaFile.id,
          storageKey: input.storageKey,
          videoId: video.id,
          reusedMediaFile: !mediaFileResult.created,
          reusedVideo: Boolean(existingVideo),
        });

      return result;
    });
  } catch (error) {
    logMediaEvent("media.create.failure", {
      albumId: input.albumId,
      kind: input.kind,
      message: error instanceof Error ? error.message : "Unknown error",
      status: error instanceof MediaServiceError ? error.status : 500,
      storageKey: input.storageKey,
    });

    if (error instanceof MediaServiceError) {
      throw error;
    }

    if (isPrismaUniqueConstraintError(error)) {
      throw new MediaServiceError("Resource already exists", 409);
    }

    if (isPrismaValidationError(error)) {
      throw new MediaServiceError("Invalid media payload", 400);
    }

    console.error("Failed to create media", error);
    throw new MediaServiceError("Failed to create media", 500);
  }
}

export function parseCreateMediaInput(rawInput: unknown): CreateMediaInput {
  if (!isRecord(rawInput)) {
    throw new MediaServiceError("Request body must be a JSON object", 400);
  }

  const kind = parseMediaKind(rawInput.kind);
  const storageKey = parseRequiredString(rawInput.storageKey, "storageKey");
  const publicUrl = parseRequiredString(rawInput.publicUrl, "publicUrl");
  const mimeType = parseRequiredString(rawInput.mimeType, "mimeType").toLowerCase();
  const sizeBytes = parseRequiredInteger(rawInput.sizeBytes, "sizeBytes", { min: 0 });
  const width = parseNullableInteger(rawInput.width, "width", { min: 1 });
  const height = parseNullableInteger(rawInput.height, "height", { min: 1 });
  const durationSec = parseNullableInteger(rawInput.durationSec, "durationSec", {
    min: 0,
  });
  const albumId = parseRequiredString(rawInput.albumId, "albumId");
  const title = parseOptionalString(rawInput.title, "title") ?? deriveTitleFromStorageKey(storageKey);
  const isPublished = parseOptionalBoolean(rawInput.isPublished, "isPublished");
  const isFeatured = parseOptionalBoolean(rawInput.isFeatured, "isFeatured");

  validateMimeType(kind, mimeType);
  validateFileSize(sizeBytes);
  validateMediaDimensions(kind, width, height);
  validateMediaDuration(kind, durationSec);
  validateFeaturedFlag(kind, isFeatured);
  validateStorageKey(storageKey);
  validatePublicUrl(publicUrl);

  const thumbnail = parseThumbnailInput(rawInput.thumbnail, kind);

  return {
    kind,
    storageKey,
    publicUrl,
    mimeType,
    sizeBytes,
    width,
    height,
    durationSec,
    albumId,
    title,
    isPublished,
    isFeatured,
    thumbnail,
  };
}

export async function getFeaturedVideo(): Promise<FeaturedVideo | null> {
  const video = await prisma.video.findFirst({
    where: {
      isFeatured: true,
      isPublished: true,
      album: {
        isPublished: true,
        section: {
          type: "VIDEO",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      createdAt: true,
      videoFile: {
        select: {
          publicUrl: true,
        },
      },
      thumbnail: {
        select: {
          publicUrl: true,
        },
      },
      album: {
        select: {
          slug: true,
          section: {
            select: {
              slug: true,
            },
          },
        },
      },
    },
  });

  if (!video) {
    return null;
  }

  return {
    id: video.id,
    title: video.title,
    slug: video.slug,
    description: video.description,
    createdAt: video.createdAt,
    sectionSlug: video.album.section.slug,
    albumSlug: video.album.slug,
    videoUrl: video.videoFile.publicUrl,
    posterUrl: video.thumbnail?.publicUrl ?? null,
  };
}

export async function deleteMediaById(id: string): Promise<DeletedMediaResult> {
  const mediaFile = await prisma.mediaFile.findUnique({
    where: { id },
    include: {
      videoSources: {
        select: {
          id: true,
          thumbnail: {
            select: {
              id: true,
              albumId: true,
              storageKey: true,
              publicUrl: true,
              _count: {
                select: {
                  videoSources: true,
                  videoThumbnails: true,
                  albumCovers: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!mediaFile) {
    throw new MediaServiceError("Media not found", 404);
  }

  const removableThumbnails = mediaFile.videoSources
    .map((video) => video.thumbnail)
    .filter((thumbnail): thumbnail is NonNullable<typeof thumbnail> => Boolean(thumbnail))
    .filter((thumbnail) => {
      return (
        thumbnail.albumId === null &&
        thumbnail._count.videoSources === 0 &&
        thumbnail._count.videoThumbnails === 1 &&
        thumbnail._count.albumCovers === 0
      );
    });

  const storageKeys = [
    extractStorageKey(mediaFile.storageKey, mediaFile.publicUrl),
    ...removableThumbnails.map((thumbnail) =>
      extractStorageKey(thumbnail.storageKey, thumbnail.publicUrl),
    ),
  ];

  try {
    for (const key of new Set(storageKeys)) {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: getStorageBucket(),
          Key: key,
        }),
      );
    }

    return await prisma.$transaction(async (tx) => {
      const deletedVideos = await tx.video.deleteMany({
        where: {
          videoFileId: mediaFile.id,
        },
      });

      let deletedThumbnailCount = 0;

      if (removableThumbnails.length > 0) {
        const deletedThumbnails = await tx.mediaFile.deleteMany({
          where: {
            id: {
              in: removableThumbnails.map((thumbnail) => thumbnail.id),
            },
          },
        });

        deletedThumbnailCount = deletedThumbnails.count;
      }

      await tx.mediaFile.delete({
        where: { id: mediaFile.id },
      });

      return {
        deletedMediaId: mediaFile.id,
        deletedVideoCount: deletedVideos.count,
        deletedThumbnailCount,
      };
    });
  } catch (error) {
    console.error("Failed to delete media", {
      mediaId: id,
      error,
    });

    if (error instanceof MediaServiceError) {
      throw error;
    }

    throw new MediaServiceError("Failed to delete media", 500);
  }
}

function parseThumbnailInput(
  value: unknown,
  kind: MediaKindInput,
): CreateMediaInput["thumbnail"] | undefined {
  if (value == null) {
    return undefined;
  }

  if (kind !== "VIDEO") {
    throw new MediaServiceError("thumbnail is only supported for VIDEO media", 400);
  }

  if (!isRecord(value)) {
    throw new MediaServiceError("thumbnail must be an object", 400);
  }

  const storageKey = parseRequiredString(value.storageKey, "thumbnail.storageKey");
  const publicUrl = parseRequiredString(value.publicUrl, "thumbnail.publicUrl");
  const mimeType = parseRequiredString(value.mimeType, "thumbnail.mimeType").toLowerCase();
  const sizeBytes = parseRequiredInteger(value.sizeBytes, "thumbnail.sizeBytes", { min: 0 });
  const width = parseNullableInteger(value.width, "thumbnail.width", { min: 1 });
  const height = parseNullableInteger(value.height, "thumbnail.height", { min: 1 });

  validateMimeType("IMAGE", mimeType, "thumbnail.mimeType");
  validateFileSize(sizeBytes, "thumbnail.sizeBytes");
  validateStorageKey(storageKey, "thumbnail.storageKey");
  validatePublicUrl(publicUrl, "thumbnail.publicUrl");

  return {
    storageKey,
    publicUrl,
    mimeType,
    sizeBytes,
    width,
    height,
    durationSec: null,
  };
}

function validateMimeType(
  kind: MediaKindInput,
  mimeType: string,
  fieldName = "mimeType",
): void {
  const allowedMimeTypes = MIME_TYPES_BY_KIND[kind];

  if (!allowedMimeTypes.includes(mimeType)) {
    throw new MediaServiceError(
      `${fieldName} is invalid for ${kind}. Allowed types: ${allowedMimeTypes.join(", ")}`,
      400,
    );
  }
}

function validateFileSize(sizeBytes: number, fieldName = "sizeBytes"): void {
  if (sizeBytes > mediaLimits.maxFileSizeBytes) {
    const maxSizeMb = Math.round(mediaLimits.maxFileSizeBytes / (1024 * 1024));

    throw new MediaServiceError(
      `File exceeds maximum allowed size of ${maxSizeMb} MB`,
      400,
    );
  }
}

function validateMediaDimensions(
  kind: MediaKindInput,
  width: NullableNumber,
  height: NullableNumber,
): void {
  if (kind === "IMAGE" && (width === null || height === null)) {
    throw new MediaServiceError("width and height are required for IMAGE media", 400);
  }
}

function validateMediaDuration(kind: MediaKindInput, durationSec: NullableNumber): void {
  if (kind === "VIDEO" && durationSec === null) {
    throw new MediaServiceError("durationSec is required for VIDEO media", 400);
  }

  if (
    kind === "VIDEO" &&
    durationSec !== null &&
    durationSec > mediaLimits.maxVideoDurationSec
  ) {
    throw new MediaServiceError(
      `durationSec exceeds the maximum allowed duration of ${mediaLimits.maxVideoDurationSec} seconds`,
      400,
    );
  }

  if (kind === "IMAGE" && durationSec !== null) {
    throw new MediaServiceError("durationSec must be null for IMAGE media", 400);
  }
}

function validateFeaturedFlag(kind: MediaKindInput, isFeatured: boolean | undefined): void {
  if (kind !== "VIDEO" && isFeatured != null) {
    throw new MediaServiceError("isFeatured is only supported for VIDEO media", 400);
  }
}

function validateStorageKey(storageKey: string, fieldName = "storageKey"): void {
  const normalizedStorageKey = storageKey.trim();

  if (normalizedStorageKey.length === 0) {
    throw new MediaServiceError(`${fieldName} is required`, 400);
  }

  if (/^https?:\/\//i.test(normalizedStorageKey)) {
    throw new MediaServiceError(`${fieldName} must be an object key, not a full URL`, 400);
  }

  if (normalizedStorageKey.startsWith("blob:") || normalizedStorageKey.startsWith("/uploads/")) {
    throw new MediaServiceError(`${fieldName} contains a legacy local/blob path`, 400);
  }
}

function validatePublicUrl(publicUrl: string, fieldName = "publicUrl"): void {
  const normalizedUrl = publicUrl.trim();

  if (normalizedUrl.startsWith("blob:") || normalizedUrl.startsWith("/uploads/")) {
    throw new MediaServiceError(`${fieldName} contains a legacy local/blob URL`, 400);
  }
}

function extractStorageKey(storageKey: string | null | undefined, publicUrl: string): string {
  if (storageKey && storageKey.trim().length > 0) {
    const normalizedStorageKey = storageKey.trim();

    if (!/^https?:\/\//i.test(normalizedStorageKey)) {
      return normalizedStorageKey;
    }

    try {
      const parsedStorageKeyUrl = new URL(normalizedStorageKey);
      return parsedStorageKeyUrl.pathname.replace(/^\/+/, "");
    } catch {
      return normalizedStorageKey.split("/").filter(Boolean).pop() ?? normalizedStorageKey;
    }
  }

  const normalizedUrl = publicUrl.trim();

  try {
    const parsedUrl = new URL(normalizedUrl);
    return parsedUrl.pathname.replace(/^\/+/, "");
  } catch {
    return normalizedUrl.split("/").filter(Boolean).pop() ?? normalizedUrl;
  }
}

async function createVideoWithUniqueSlug(
  tx: Prisma.TransactionClient,
  input: {
    albumId: string;
    title: string;
    videoFileId: string;
    thumbnailId: string | null;
    isPublished: boolean;
    isFeatured: boolean;
    storageKey: string;
  },
): Promise<CreatedVideo> {
  const baseSlug = slugify(input.title) || "video";

  for (let attempt = 1; attempt <= SLUG_MAX_ATTEMPTS; attempt += 1) {
    const slug =
      attempt === 1 ? baseSlug : `${baseSlug}-${createRandomSuffix(6)}`;

    try {
      if (input.isFeatured) {
        await clearFeaturedVideos(tx);
      }

      return await tx.video.create({
        data: {
          title: input.title,
          slug,
          albumId: input.albumId,
          videoFileId: input.videoFileId,
          thumbnailId: input.thumbnailId,
          isPublished: input.isPublished,
          isFeatured: input.isFeatured,
        },
        include: {
          album: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
          videoFile: true,
          thumbnail: true,
        },
      });
    } catch (error) {
      if (isPrismaUniqueConstraintError(error) && isSlugConflictError(error)) {
        continue;
      }

      throw error;
    }
  }

  throw new MediaServiceError(
    `Could not generate a unique slug for storage key ${input.storageKey}`,
    409,
  );
}

async function updateExistingVideo(
  tx: Prisma.TransactionClient,
  videoId: string,
  input: {
    title: string;
    thumbnailId: string | null;
    isPublished: boolean;
    isFeatured: boolean;
  },
): Promise<CreatedVideo> {
  if (input.isFeatured) {
    await clearFeaturedVideos(tx, videoId);
  }

  return tx.video.update({
    where: { id: videoId },
    data: {
      title: input.title,
      thumbnailId: input.thumbnailId,
      isPublished: input.isPublished,
      isFeatured: input.isFeatured,
    },
    include: {
      album: {
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },
      videoFile: true,
      thumbnail: true,
    },
  });
}

async function clearFeaturedVideos(
  tx: Prisma.TransactionClient,
  excludeVideoId?: string,
): Promise<void> {
  await tx.video.updateMany({
    where: {
      isFeatured: true,
      ...(excludeVideoId ? { id: { not: excludeVideoId } } : {}),
    },
    data: {
      isFeatured: false,
    },
  });
}

function deriveTitleFromStorageKey(storageKey: string): string {
  const fileName = storageKey.split("/").pop() ?? storageKey;
  const withoutExtension = fileName.replace(/\.[^.]+$/, "");
  const withoutPrefix = withoutExtension.replace(/^\d+[-_]/, "");
  const normalized = withoutPrefix
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return "Untitled Media";
  }

  return normalized
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function parseMediaKind(value: unknown): MediaKindInput {
  if (value === "VIDEO" || value === "IMAGE") {
    return value;
  }

  throw new MediaServiceError('kind must be either "VIDEO" or "IMAGE"', 400);
}

function parseRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new MediaServiceError(`${fieldName} is required`, 400);
  }

  return value.trim();
}

function parseOptionalString(value: unknown, fieldName: string): string | undefined {
  if (value == null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new MediaServiceError(`${fieldName} must be a string`, 400);
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseOptionalBoolean(value: unknown, fieldName: string): boolean | undefined {
  if (value == null) {
    return undefined;
  }

  if (typeof value !== "boolean") {
    throw new MediaServiceError(`${fieldName} must be a boolean`, 400);
  }

  return value;
}

function parseRequiredInteger(
  value: unknown,
  fieldName: string,
  options: { min?: number } = {},
): number {
  if (!Number.isInteger(value)) {
    throw new MediaServiceError(`${fieldName} must be an integer`, 400);
  }

  if (options.min != null && (value as number) < options.min) {
    throw new MediaServiceError(`${fieldName} must be at least ${options.min}`, 400);
  }

  return value as number;
}

function parseNullableInteger(
  value: unknown,
  fieldName: string,
  options: { min?: number } = {},
): number | null {
  if (value == null) {
    return null;
  }

  return parseRequiredInteger(value, fieldName, options);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPrismaUniqueConstraintError(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
  );
}

function isPrismaValidationError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientValidationError ||
    (error instanceof Prisma.PrismaClientKnownRequestError &&
      ["P2000", "P2005", "P2006", "P2007", "P2011", "P2012", "P2013"].includes(error.code))
  );
}

function isSlugConflictError(error: Prisma.PrismaClientKnownRequestError): boolean {
  const target = Array.isArray(error.meta?.target) ? error.meta.target : [];
  return target.includes("slug");
}

async function findOrCreateMediaFile(
  tx: Prisma.TransactionClient,
  input: {
    title: string | null;
    slug: string | null;
    kind: MediaKind;
    storageKey: string;
    publicUrl: string;
    mimeType: string;
    albumId: string | null;
    order: number;
    isPublished: boolean;
    sizeBytes: number;
    width: number | null;
    height: number | null;
    durationSec: number | null;
  },
): Promise<{ mediaFile: MediaFile; created: boolean }> {
  const existingMediaFile = await tx.mediaFile.findUnique({
    where: { storageKey: input.storageKey },
  });

  if (existingMediaFile) {
    return {
      mediaFile: existingMediaFile,
      created: false,
    };
  }

  const mediaFile = await tx.mediaFile.create({
    data: input,
  });

  return {
    mediaFile,
    created: true,
  };
}

async function validateStorageState(input: CreateMediaInput): Promise<void> {
  if (!mediaLimits.validateStorageObject) {
    return;
  }

  const requiredKeys = [input.storageKey, input.thumbnail?.storageKey].filter(
    (value): value is string => Boolean(value),
  );

  for (const key of requiredKeys) {
    const exists = await storageObjectExists(key);

    if (!exists) {
      throw new MediaServiceError(`Storage object not found for key: ${key}`, 400);
    }
  }
}

function createRandomSuffix(length: number): string {
  return Math.random().toString(36).slice(2, 2 + length);
}

function readPositiveIntEnv(name: string, fallback: number): number {
  const rawValue = process.env[name];

  if (!rawValue) {
    return fallback;
  }

  const parsed = Number.parseInt(rawValue, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function logMediaEvent(event: string, data: Record<string, unknown>): void {
  const payload = {
    event,
    ...data,
  };

  if (event.endsWith(".failure")) {
    console.error(payload);
    return;
  }

  console.info(payload);
}
