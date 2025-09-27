import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, generateTotpSecret, verifyTotpCode, generateBackupCodes } from "@/lib/auth";
import { TotpEnrollSchema } from "@/lib/validations/auth";
import { AuditLogger } from "@/lib/audit";
import { getClientIP, getUserAgent } from "@/lib/rateLimit";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.twoFactorEnabled) {
      return NextResponse.json(
        { error: "Two-factor authentication is already enabled" },
        { status: 400 }
      );
    }

    const ip = getClientIP(req);
    const userAgent = getUserAgent(req);

    // Generate TOTP secret and QR code
    const totpData = await generateTotpSecret(user.id, user.email!);

    return NextResponse.json({
      secret: totpData.secret,
      qrCode: totpData.qrCode,
      manualEntryKey: totpData.manualEntryKey,
      message: "Scan the QR code with your authenticator app, then verify with a code",
    });
  } catch (error) {
    console.error("[/api/auth/totp/enroll] error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.twoFactorEnabled) {
      return NextResponse.json(
        { error: "Two-factor authentication is already enabled" },
        { status: 400 }
      );
    }

    const json = await req.json().catch(() => ({}));
    const parsed = TotpEnrollSchema.safeParse(json);

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
      select: { totpSecret: true },
    });

    if (!userWithSecret?.totpSecret) {
      return NextResponse.json(
        { error: "No TOTP secret found. Please start enrollment process again." },
        { status: 400 }
      );
    }

    // Verify the TOTP code
    if (!verifyTotpCode(userWithSecret.totpSecret, totpCode)) {
      return NextResponse.json({ error: "Invalid TOTP code" }, { status: 400 });
    }

    // Generate backup codes
    const backupCodes = generateBackupCodes();

    // Enable 2FA
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: true,
        backupCodes,
      },
    });

    // Log the enrollment
    await AuditLogger.logTwoFactorEnroll(user.id, ip, userAgent);

    return NextResponse.json({
      message: "Two-factor authentication enabled successfully",
      backupCodes,
    });
  } catch (error) {
    console.error("[/api/auth/totp/enroll] PUT error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}