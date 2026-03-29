import { S3Client } from "@aws-sdk/client-s3";

function getRequiredEnv(name: "S3_REGION" | "S3_ENDPOINT" | "S3_ACCESS_KEY" | "S3_SECRET_KEY"): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const s3 = new S3Client({
  region: getRequiredEnv("S3_REGION"),
  endpoint: getRequiredEnv("S3_ENDPOINT"),
  credentials: {
    accessKeyId: getRequiredEnv("S3_ACCESS_KEY"),
    secretAccessKey: getRequiredEnv("S3_SECRET_KEY"),
  },
});
