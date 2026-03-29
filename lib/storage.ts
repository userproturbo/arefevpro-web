import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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
  endpoint: string;
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
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
    endpoint: getEnv("S3_ENDPOINT"),
    bucket: getEnv("S3_BUCKET"),
    region: getEnv("S3_REGION"),
    accessKeyId: getEnv("S3_ACCESS_KEY"),
    secretAccessKey: getEnv("S3_SECRET_KEY"),
    publicUrl: getEnv("S3_PUBLIC_URL").replace(/\/+$/, ""),
  };
}

const storageConfig = createStorageConfig();

const s3Client = new S3Client({
  endpoint: storageConfig.endpoint,
  region: storageConfig.region,
  credentials: {
    accessKeyId: storageConfig.accessKeyId,
    secretAccessKey: storageConfig.secretAccessKey,
  },
});

export async function generateUploadUrl(
  key: string,
  contentType: string,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: storageConfig.bucket,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(s3Client, command, { expiresIn: 60 * 5 });
}

export function getPublicUrl(key: string): string {
  const normalizedKey = key.replace(/^\/+/, "");

  return `${storageConfig.publicUrl}/${normalizedKey}`;
}
