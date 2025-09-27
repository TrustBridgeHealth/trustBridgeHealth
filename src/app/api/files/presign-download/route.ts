import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { generatePresignedDownloadUrl, validateFileAccess } from "@/lib/storage";
import { AuditLogger } from "@/lib/audit";
import { getClientIP, getUserAgent } from "@/lib/rateLimit";
import { z } from "zod";

const PresignDownloadSchema = z.object({
  fileId: z.string().cuid("Invalid file ID"),
});

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
    const parsed = PresignDownloadSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { fileId } = parsed.data;
    const ip = getClientIP(req);
    const userAgent = getUserAgent(req);

    // Validate file access
    const hasAccess = await validateFileAccess(user.id, fileId, "read");
    if (!hasAccess) {
      return NextResponse.json({ error: "File not found or access denied" }, { status: 404 });
    }

    // Get file information
    const file = await prisma.file.findFirst({
      where: {
        id: fileId,
        isDeleted: false,
      },
      select: {
        id: true,
        objectKey: true,
        encFileKey: true,
        iv: true,
        filenameCipher: true,
        notesCipher: true,
        mimeType: true,
        size: true,
      },
    });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Generate presigned download URL
    const { downloadUrl } = await generatePresignedDownloadUrl(file.objectKey);

    // Log file download
    await AuditLogger.logFileDownload(user.id, fileId, ip, userAgent);

    return NextResponse.json({
      downloadUrl,
      fileMetadata: {
        id: file.id,
        encFileKey: file.encFileKey.toString('base64'),
        iv: file.iv.toString('base64'),
        filenameCipher: file.filenameCipher,
        notesCipher: file.notesCipher,
        mimeType: file.mimeType,
        size: file.size.toString(),
      },
      expiresIn: 3600, // 1 hour
    });
  } catch (error) {
    console.error("[/api/files/presign-download] error:", error);
    return NextResponse.json({ error: "Failed to generate download URL" }, { status: 500 });
  }
}