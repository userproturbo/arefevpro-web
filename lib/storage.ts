import { DeleteObjectCommand, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { s3 } from "@/lib/s3";
import type { UploadMediaKind } from "@/lib/media-upload";

const REQUIRED_ENV_VARS = [
  "S3_ENDPOINT",
  "S3_BUCKET",
  "S3_REGION",
  "S3_ACCESS_KEY",
  "S3_SECRET_KEY",
  "S3_PUBLIC_URL",
] as const;

type RequiredEnvVar = (typeof REQUIRED_ENV_VARS)[number];

type StorageConfig = {
  bucket: string;
  publicUrl: string;
};

function getEnv(name: RequiredEnvVar): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function createStorageConfig(): StorageConfig {
  return {
    bucket: getEnv("S3_BUCKET"),
    publicUrl: getEnv("S3_PUBLIC_URL").replace(/\/+$/, ""),
  };
}

const storageConfig = createStorageConfig();

export async function generateUploadUrl(
  key: string,
  contentType: string,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: storageConfig.bucket,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(s3, command, {
    expiresIn: 60 * 5,
    signableHeaders: new Set(["content-type"]),
  });
}

export function buildMediaStorageKey(input: {
  kind: UploadMediaKind;
  albumId: string;
  fileName: string;
}): string {
  const safeFileName = sanitizeFileName(input.fileName);
  const extension = path.extname(safeFileName);
  const baseName = path.basename(safeFileName, extension) || "file";

  return `media/${input.kind.toLowerCase()}/${input.albumId}/${Date.now()}-${randomUUID()}-${baseName}${extension}`;
}

export function getPublicUrl(key: string): string {
  const normalizedKey = key.replace(/^\/+/, "");

  return `${storageConfig.publicUrl}/${normalizedKey}`;
}

export function getStorageBucket(): string {
  return storageConfig.bucket;
}

export async function storageObjectExists(key: string): Promise<boolean> {
  try {
    await s3.send(
      new HeadObjectCommand({
        Bucket: storageConfig.bucket,
        Key: key,
      }),
    );

    return true;
  } catch (error) {
    if (isMissingObjectError(error)) {
      return false;
    }

    throw error;
  }
}

export async function deleteStorageObject(key: string): Promise<void> {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: storageConfig.bucket,
      Key: key,
    }),
  );
}

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

function isMissingObjectError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const awsError = error as Error & {
    name?: string;
    Code?: string;
    $metadata?: {
      httpStatusCode?: number;
    };
  };

  return (
    awsError.name === "NotFound" ||
    awsError.name === "NoSuchKey" ||
    awsError.Code === "NotFound" ||
    awsError.Code === "NoSuchKey" ||
    awsError.$metadata?.httpStatusCode === 404
  );
}
