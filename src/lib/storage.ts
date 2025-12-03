// src/lib/storage.ts
import {
  S3Client,
PutObjectCommand,
GetObjectCommand,
PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Env vars from Amplify
const REGION = process.env.S3_REGION || "us-east-2";
const BUCKET_NAME = process.env.S3_BUCKET || "trustbridge-health-files";
const URL_EXPIRATION = 3600; // 1 hour

// S3 client using IAM access key + secret from env
const s3Client = new S3Client({
region: REGION,
credentials: {
accessKeyId: process.env.S3_ACCESS_KEY_ID!,
secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
},
});

export async function generatePresignedUploadUrl(
  objectKey: string,
  contentType?: string,
  contentLength?: number,
  bucket: string = BUCKET_NAME
): Promise<{
  uploadUrl: string;
  objectKey: string;
  requiredHeaders: Record<string, string>;
}> {
  try {
    const putParams: PutObjectCommandInput = {
      Bucket: bucket,
      Key: objectKey,
      // ContentType and ContentLength are optional for the signature,
      // but you can uncomment these if you want them enforced:
      // ContentType: contentType,
      // ContentLength: contentLength,
    };

    const command = new PutObjectCommand(putParams);
    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: URL_EXPIRATION,
    });

    // No special headers required by the signature
    const requiredHeaders: Record<string, string> = {};
    return { uploadUrl, objectKey, requiredHeaders };
  } catch (error: any) {
    console.error("Failed to generate presigned upload URL:", error);
    throw new Error(
      `Failed to generate upload URL: ${error.message || "Unknown error"}`
    );
  }
}

export async function generatePresignedDownloadUrl(
  objectKey: string,
  bucket: string = BUCKET_NAME
): Promise<{ downloadUrl: string; objectKey: string }> {
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: objectKey,
    });

    const downloadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: URL_EXPIRATION,
    });

    return { downloadUrl, objectKey };
  } catch (error: any) {
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

    const file = await prisma.file.findFirst({
      where: {
        id: fileId,
        ownerId: userId,
        isDeleted: false,
      },
    });

    if (file) return true;

    if (requiredPermission === "read") {
      const share = await prisma.share.findFirst({
        where: {
          fileId,
          granteeId: userId,
          revokedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
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
