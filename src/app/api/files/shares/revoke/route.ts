import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ShareRevokeSchema } from "@/lib/validations/files";
import { AuditLogger } from "@/lib/audit";
import { getClientIP, getUserAgent } from "@/lib/rateLimit";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if 2FA is required and verified
    const twoFactorVerified =
      req.headers.get("x-user-2fa-verified") === "true";

    if (user.twoFactorEnabled && !twoFactorVerified) {
      return NextResponse.json(
        { error: "2FA verification required" },
        { status: 403 }
      );
    }

    const json = await req.json().catch(() => ({}));
    const parsed = ShareRevokeSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { shareId } = parsed.data;
    const ip = getClientIP(req);
    const userAgent = getUserAgent(req);

    // Find the share and verify ownership
    const share = await prisma.share.findFirst({
      where: {
        id: shareId,
        revokedAt: null,
      },
      include: {
        file: {
          select: { ownerId: true, id: true },
        },
      },
    });

    if (!share) {
      return NextResponse.json({ error: "Share not found or already revoked" }, { status: 404 });
    }

    // Check if user owns the file or is admin
    const canRevoke = share.file.ownerId === user.id || user.role === "ADMIN";
    if (!canRevoke) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Revoke the share
    await prisma.share.update({
      where: { id: shareId },
      data: {
        revokedAt: new Date(),
        revokedById: user.id,
      },
    });

    // Log share revocation
    await AuditLogger.logShareRevoke(
      user.id,
      shareId,
      share.file.id,
      ip,
      userAgent
    );

    return NextResponse.json({
      message: "Share revoked successfully",
    });
  } catch (error) {
    console.error("[/api/files/shares/revoke] error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}