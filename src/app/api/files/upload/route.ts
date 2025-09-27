import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { FileUploadSchema } from "@/lib/validations/files";
import { AuditLogger } from "@/lib/audit";
import { getClientIP, getUserAgent } from "@/lib/rateLimit";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if 2FA is required and verified
    if (user.twoFactorEnabled && !user.twoFactorVerified) {
      return NextResponse.json({ error: "2FA verification required" }, { status: 403 });
    }

    const json = await req.json().catch(() => ({}));
    const parsed = FileUploadSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      filename,
      mimeType,
      size,
      encFileKey,
      iv,
      filenameCipher,
      notesCipher,
    } = parsed.data;

    const ip = getClientIP(req);
    const userAgent = getUserAgent(req);

    // Generate object key for S3
    const { generateObjectKey } = await import("@/lib/storage");
    const objectKey = generateObjectKey(user.id, filename);

    // Store file metadata in database
    const file = await prisma.file.create({
      data: {
        ownerId: user.id,
        bucket: process.env.S3_BUCKET_NAME || "trustbridge-health-files",
        objectKey,
        size: BigInt(size),
        mimeType,
        encFileKey: Buffer.from(encFileKey, 'base64'),
        iv: Buffer.from(iv, 'base64'),
        filenameCipher,
        notesCipher,
      },
      select: {
        id: true,
        objectKey: true,
        createdAt: true,
      },
    });

    // Log file upload
    await AuditLogger.logFileUpload(
      user.id,
      file.id,
      filename,
      size,
      ip,
      userAgent
    );

    return NextResponse.json({
      fileId: file.id,
      objectKey: file.objectKey,
      message: "File metadata stored successfully",
    });
  } catch (error) {
    console.error("[/api/files/upload] error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}