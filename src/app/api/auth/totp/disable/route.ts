import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, verifyTotpCode } from "@/lib/auth";
import { TotpVerifySchema } from "@/lib/validations/auth";
import { AuditLogger } from "@/lib/audit";
import { getClientIP, getUserAgent } from "@/lib/rateLimit";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.twoFactorEnabled) {
      return NextResponse.json(
        { error: "Two-factor authentication is not enabled" },
        { status: 400 }
      );
    }

    const json = await req.json().catch(() => ({}));
    const parsed = TotpVerifySchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { totpCode } = parsed.data;
    const ip = getClientIP(req);
    const userAgent = getUserAgent(req);

    // Get the user's TOTP secret
    const userWithSecret = await prisma.user.findUnique({
      where: { id: user.id },
      select: { totpSecret: true, backupCodes: true },
    });

    if (!userWithSecret?.totpSecret) {
      return NextResponse.json(
        { error: "No TOTP secret found" },
        { status: 400 }
      );
    }

    let isValidCode = false;

    // Verify TOTP code or backup code
    if (verifyTotpCode(userWithSecret.totpSecret, totpCode)) {
      isValidCode = true;
    } else {
      // Try backup codes
      const backupCodeIndex = userWithSecret.backupCodes.indexOf(totpCode.toUpperCase());
      if (backupCodeIndex !== -1) {
        isValidCode = true;
      }
    }

    if (!isValidCode) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    // Disable 2FA
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: false,
        totpSecret: null,
        backupCodes: [],
      },
    });

    // Log the disable action
    await AuditLogger.log({
      action: "TWOFA_DISABLE",
      target: "USER",
      actorId: user.id,
      subjectUserId: user.id,
      ip,
      userAgent,
    });

    return NextResponse.json({
      message: "Two-factor authentication disabled successfully",
    });
  } catch (error) {
    console.error("[/api/auth/totp/disable] error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}