import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { FileShareSchema } from "@/lib/validations/files";
import { AuditLogger } from "@/lib/audit";
import { getClientIP, getUserAgent } from "@/lib/rateLimit";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const twoFactorVerified = req.headers.get("x-user-2fa-verified") === "true";

    if (user.twoFactorEnabled && !twoFactorVerified) {
      return NextResponse.json(
        { error: "2FA verification required" },
        { status: 403 }
      );
    }

    const json = await req.json().catch(() => ({}));
    const parsed = FileShareSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { fileId, granteeEmail, expiresAt } = parsed.data;
    const ip = getClientIP(req);
    const userAgent = getUserAgent(req);

    // Check if file exists and user owns it
    const file = await prisma.file.findFirst({
      where: {
        id: fileId,
        ownerId: user.id,
        isDeleted: false,
      },
      select: { id: true, ownerId: true },
    });

    if (!file) {
      return NextResponse.json({ error: "File not found or access denied" }, { status: 404 });
    }

    // Find grantee user
    const grantee = await prisma.user.findUnique({
      where: { emailLower: granteeEmail.toLowerCase() },
      select: { id: true, email: true, role: true },
    });

    if (!grantee) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Role-based sharing rules
    if (user.role === "PATIENT") {
      // Patients can only share with providers and admins
      if (!hasRole(grantee.role, ["PROVIDER", "ADMIN"])) {
        return NextResponse.json(
          { error: "Patients can only share files with providers or administrators" },
          { status: 403 }
        );
      }
    }

    // Check if share already exists
    const existingShare = await prisma.share.findUnique({
      where: {
        fileId_granteeId: {
          fileId,
          granteeId: grantee.id,
        },
      },
    });

    if (existingShare && !existingShare.revokedAt) {
      return NextResponse.json({ error: "File is already shared with this user" }, { status: 409 });
    }

    // Create or reactivate share
    const shareData = {
      fileId,
      granteeId: grantee.id,
      createdById: user.id,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      revokedAt: null,
      revokedById: null,
    };

    let share;
    if (existingShare) {
      // Reactivate existing share
      share = await prisma.share.update({
        where: { id: existingShare.id },
        data: shareData,
      });
    } else {
      // Create new share
      share = await prisma.share.create({
        data: shareData,
      });
    }

    // Log file share
    await AuditLogger.logFileShare(
      user.id,
      fileId,
      share.id,
      grantee.id,
      ip,
      userAgent
    );

    return NextResponse.json({
      shareId: share.id,
      granteeEmail: grantee.email,
      expiresAt: share.expiresAt,
      message: "File shared successfully",
    });
  } catch (error) {
    console.error("[/api/files/share] error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}