// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { LoginSchema } from '@/lib/validations/auth';
import { authenticateUser, generateJWT, verifyTotpCode } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { loginLimiter, handleFailedLogin, handleSuccessfulLogin, getClientIP, getUserAgent } from '@/lib/rateLimit';
import { AuditLogger } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = LoginSchema.parse(body);

    // Rate limiting
    const ip = getClientIP(req);
    try {
      await loginLimiter?.consume(ip);
    } catch (rateLimiterRes: any) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Authenticate user
    const user = await authenticateUser(validated.email, validated.password);

    if (!user) {
      // Find user by email to log failed attempt
      const userByEmail = await prisma.user.findUnique({
        where: { emailLower: validated.email.toLowerCase() },
        select: { id: true },
      });

      if (userByEmail) {
        await handleFailedLogin(userByEmail.id, ip, getUserAgent(req));
        await AuditLogger.logLogin(userByEmail.id, false, ip, getUserAgent(req));
      }

      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check 2FA if enabled
    let twoFactorVerified = true;
    if (user.twoFactorEnabled) {
      if (!validated.totpCode) {
        return NextResponse.json(
          { error: '2FA code required' },
          { status: 403 }
        );
      }

      if (!user.twoFactorSecret) {
        return NextResponse.json(
          { error: '2FA not properly configured' },
          { status: 500 }
        );
      }

      const isValidTotp = verifyTotpCode(user.twoFactorSecret, validated.totpCode);
      if (!isValidTotp) {
        await AuditLogger.logTwoFactorVerify(user.id, false, ip, getUserAgent(req));
        return NextResponse.json(
          { error: 'Invalid 2FA code' },
          { status: 401 }
        );
      }

      twoFactorVerified = true;
      await AuditLogger.logTwoFactorVerify(user.id, true, ip, getUserAgent(req));
    }

    // Generate JWT token
    const token = generateJWT(user, twoFactorVerified);

    // Handle successful login
    await handleSuccessfulLogin(user.id);
    await AuditLogger.logLogin(user.id, true, ip, getUserAgent(req));

    // Set httpOnly cookie
    const response = NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        twoFactorEnabled: user.twoFactorEnabled,
      },
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    if (error.message?.includes('locked')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    console.error('Login error:', error);
    return NextResponse.json(
      { error: error.message || 'Login failed' },
      { status: 500 }
    );
  }
}



