import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  endpoint: process.env.S3_ENDPOINT, // For MinIO or other S3-compatible services
  forcePathStyle: !!process.env.S3_ENDPOINT, // Required for MinIO
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || "trustbridge-health-files";
const URL_EXPIRATION = 3600; // 1 hour

export async function generatePresignedUploadUrl(
  objectKey: string,
  contentType?: string,
  contentLength?: number
): Promise<{ uploadUrl: string; objectKey: string }> {
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: objectKey,
      ContentType: contentType,
      ContentLength: contentLength,
      ServerSideEncryption: "AES256", // Server-side encryption
    });

    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: URL_EXPIRATION,
    });

    return { uploadUrl, objectKey };
  } catch (error) {
    console.error("Failed to generate presigned upload URL:", error);
    throw new Error("Failed to generate upload URL");
  }
}

export async function generatePresignedDownloadUrl(
  objectKey: string
): Promise<{ downloadUrl: string; objectKey: string }> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: objectKey,
    });

    const downloadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: URL_EXPIRATION,
    });

    return { downloadUrl, objectKey };
  } catch (error) {
    console.error("Failed to generate presigned download URL:", error);
    throw new Error("Failed to generate download URL");
  }
}

export function generateObjectKey(userId: string, filename: string): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 15);
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  
  return `users/${userId}/${timestamp}-${randomSuffix}-${sanitizedFilename}`;
}

export async function validateFileAccess(
  userId: string,
  fileId: string,
  requiredPermission: "read" | "write" = "read"
): Promise<boolean> {
  try {
    const { prisma } = await import("@/lib/prisma");
    
    // Check if user owns the file
    const file = await prisma.file.findFirst({
      where: {
        id: fileId,
        ownerId: userId,
        isDeleted: false,
      },
    });

    if (file) return true;

    // Check if file is shared with the user (for read access)
    if (requiredPermission === "read") {
      const share = await prisma.share.findFirst({
        where: {
          fileId,
          granteeId: userId,
          revokedAt: null,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
      });

      return !!share;
    }

    return false;
  } catch (error) {
    console.error("Failed to validate file access:", error);
    return false;
  }
}

// Legacy functions for backward compatibility
export async function getPresignedPutUrl(objectKey: string, mimeType?: string) {
  const q = new URLSearchParams({ key: objectKey });
  if (mimeType) q.set("contentType", mimeType);
  return `https://httpbin.org/put?${q.toString()}`;
}

export async function getPresignedGetUrl(objectKey: string) {
  const q = new URLSearchParams({ key: objectKey });
  return `https://httpbin.org/get?${q.toString()}`;
}