import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { LoginSchema } from "@/lib/validations/auth";
import { generateJWT, verifyTotpCode } from "@/lib/auth";
import { AuditLogger } from "@/lib/audit";
import {
  handleFailedLogin,
  handleSuccessfulLogin,
  isAccountLocked,
  getClientIP,
  getUserAgent,
} from "@/lib/rateLimit";

export async function POST(req: Request) {
  const ip = getClientIP(req);
  const userAgent = getUserAgent(req);

  try {
    const json = await req.json().catch(() => ({}));
    const parsed = LoginSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password, totpCode } = parsed.data;
    const emailLower = email.trim().toLowerCase();

    // Find user first
    const user = await prisma.user.findUnique({
      where: { emailLower },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        hashedPassword: true,
        twoFactorEnabled: true,
        totpSecret: true,
        lockedUntil: true,
      },
    });

    if (!user) {
      await AuditLogger.logLogin(
        "unknown",
        false,
        ip,
        userAgent,
        { reason: "user_not_found", email: emailLower }
      );
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Check if THIS SPECIFIC USER ACCOUNT is locked (not IP-based)
    const locked = await isAccountLocked(user.id);
    if (locked) {
      await AuditLogger.logLogin(
        user.id,
        false,
        ip,
        userAgent,
        { reason: "account_locked" }
      );
      return NextResponse.json(
        { error: "Account is temporarily locked due to too many failed attempts" },
        { status: 423 }
      );
    }

    // Verify password
    if (!user.hashedPassword) {
      await AuditLogger.logLogin(
        user.id,
        false,
        ip,
        userAgent,
        { reason: "no_password_set" }
      );
      return NextResponse.json({ error: "Password not set" }, { status: 500 });
    }

    const passwordValid = await bcrypt.compare(password, user.hashedPassword);
    if (!passwordValid) {
      await handleFailedLogin(user.id, ip, userAgent);
      await AuditLogger.logLogin(
        user.id,
        false,
        ip,
        userAgent,
        { reason: "invalid_password" }
      );
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Handle 2FA if enabled
    if (user.twoFactorEnabled) {
      if (!totpCode) {
        // Password is correct but 2FA code is required
        const tempToken = generateJWT(user, false);
        return NextResponse.json({
          requiresTwoFactor: true,
          tempToken,
          message: "Please provide your 2FA code",
        });
      }

      // Verify 2FA code
      if (!user.totpSecret || !verifyTotpCode(user.totpSecret, totpCode)) {
        await handleFailedLogin(user.id, ip, userAgent);
        await AuditLogger.logTwoFactorVerify(user.id, false, ip, userAgent);
        return NextResponse.json({ error: "Invalid 2FA code" }, { status: 401 });
      }

      await AuditLogger.logTwoFactorVerify(user.id, true, ip, userAgent);
    }

    // Successful login
    await handleSuccessfulLogin(user.id);
    await AuditLogger.logLogin(user.id, true, ip, userAgent);

    const token = generateJWT(user, true);

    const isProd = process.env.NODE_ENV === "production";
    cookies().set("token", token, {
      httpOnly: true,
      sameSite: "strict",
      secure: isProd,
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        twoFactorEnabled: user.twoFactorEnabled,
      },
    });
  } catch (error) {
    console.error("[/api/auth/login] error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}