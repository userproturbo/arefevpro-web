import { HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "@/lib/s3";

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
