import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJWT, generateJWT, verifyTotpCode } from "@/lib/auth";
import { TotpVerifySchema } from "@/lib/validations/auth";
import { AuditLogger } from "@/lib/audit";
import {
  twoFactorLimiter,
  handleFailedLogin,
  handleSuccessfulLogin,
  getClientIP,
  getUserAgent,
} from "@/lib/rateLimit";

export async function POST(req: Request) {
  const ip = getClientIP(req);
  const userAgent = getUserAgent(req);

  try {
    // Rate limiting for 2FA attempts
    if (twoFactorLimiter) {
      try {
        await twoFactorLimiter.consume(ip);
      } catch (rateLimitError) {
        return NextResponse.json(
          { error: "Too many 2FA attempts. Please try again later." },
          { status: 429 }
        );
      }
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

    // Get temp token from Authorization header or cookie
    let tempToken = req.headers.get("authorization")?.replace("Bearer ", "");

    if (!tempToken) {
      const cookieHeader = req.headers.get("cookie") || "";
      const tokenCookie = cookieHeader
        .split(";")
        .find((c) => c.trim().startsWith("token="));

      if (tokenCookie) {
        tempToken = tokenCookie.split("=")[1].trim();
      }
    }

    if (!tempToken) {
      return NextResponse.json(
        { error: "No authentication token provided" },
        { status: 401 }
      );
    }

    // Verify temp token
    let payload;
    try {
      payload = verifyJWT(tempToken);
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // If verifyJWT can return null/undefined, handle that first
    if (!payload) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Check if 2FA is already verified
    if (payload.twoFactorVerified) {
      return NextResponse.json(
        { error: "2FA already verified" },
        { status: 400 }
      );
    }

    // Get user with TOTP secret
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        twoFactorEnabled: true,
        totpSecret: true,
        backupCodes: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.twoFactorEnabled || !user.totpSecret) {
      return NextResponse.json({ error: "2FA not enabled for this user" }, { status: 400 });
    }

    let isValidCode = false;
    let usedBackupCode = false;

    // First try TOTP verification
    if (verifyTotpCode(user.totpSecret, totpCode)) {
      isValidCode = true;
    } else {
      // Try backup codes
      const backupCodeIndex = user.backupCodes.indexOf(totpCode.toUpperCase());
      if (backupCodeIndex !== -1) {
        isValidCode = true;
        usedBackupCode = true;

        // Remove used backup code
        const updatedBackupCodes = user.backupCodes.filter((_, index) => index !== backupCodeIndex);
        await prisma.user.update({
          where: { id: user.id },
          data: { backupCodes: updatedBackupCodes },
        });
      }
    }

    if (!isValidCode) {
      await handleFailedLogin(user.id, ip, userAgent);
      await AuditLogger.logTwoFactorVerify(user.id, false, ip, userAgent);
      return NextResponse.json({ error: "Invalid 2FA code" }, { status: 401 });
    }

    // Successful 2FA verification
    await handleSuccessfulLogin(user.id);
    await AuditLogger.logTwoFactorVerify(user.id, true, ip, userAgent);

    // Generate new token with 2FA verified
    const newToken = generateJWT(user, true);
    const isProd = process.env.NODE_ENV === "production";

    const res = NextResponse.json({
      token: newToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        twoFactorEnabled: user.twoFactorEnabled,
      },
      message: usedBackupCode
        ? "Backup code used successfully"
        : "2FA verified successfully",
    });

    // Set cookie on the response (Next.js 14+/15 way)
    res.cookies.set({
      name: "token",
      value: newToken,
      httpOnly: true,
      sameSite: "strict",
      secure: isProd,
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return res;
  } catch (error) {
    console.error("[/api/auth/totp/verify] error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}