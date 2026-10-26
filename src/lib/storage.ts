import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB

let s3ClientInstance: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3ClientInstance) {
    const endpoint = `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
    s3ClientInstance = new S3Client({
      region: "auto",
      endpoint,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3ClientInstance;
}

export function validateUploadFile(contentType: string, sizeBytes: number): void {
  if (!ALLOWED_MIME_TYPES.includes(contentType as AllowedMimeType)) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Invalid file format "${contentType}". Only JPEG, PNG, WebP, and PDF are supported.`
    );
  }

  if (sizeBytes <= 0 || sizeBytes > MAX_FILE_SIZE_BYTES) {
    throw new AppError(
      "VALIDATION_ERROR",
      `File size exceeds 8 MB limit (${(sizeBytes / (1024 * 1024)).toFixed(2)} MB).`
    );
  }
}

export function generateStorageKey(prefix: "expenses" | "deposits", extension: string): string {
  const dateStr = new Date().toISOString().slice(0, 10);
  const randomHex = crypto.randomBytes(12).toString("hex");
  const cleanExt = extension.replace(/^\./, "").toLowerCase() || "bin";
  return `${prefix}/${dateStr}/${randomHex}.${cleanExt}`;
}

export async function createPresignedUploadUrl(
  key: string,
  contentType: string,
  sizeBytes: number,
  expiresInSeconds: number = 900 // 15 minutes
): Promise<string> {
  validateUploadFile(contentType, sizeBytes);

  const client = getS3Client();
  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
    ContentLength: sizeBytes,
  });

  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

export async function createPresignedViewUrl(
  key: string,
  expiresInSeconds: number = 900 // 15 minutes
): Promise<string> {
  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

export async function deleteStoredFile(key: string): Promise<void> {
  const client = getS3Client();
  const command = new DeleteObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
  });
  await client.send(command);
}
