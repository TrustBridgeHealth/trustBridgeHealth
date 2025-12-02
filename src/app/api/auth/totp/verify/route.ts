// src/app/api/auth/totp/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth';
import { verifyTotpCode } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AuditLogger } from '@/lib/audit';
import { getClientIP, getUserAgent } from '@/lib/rateLimit';
import { TotpVerifySchema } from '@/lib/validations/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validated = TotpVerifySchema.parse(body);

    // Get user with TOTP secret
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { totpSecret: true },
    });

    if (!dbUser?.totpSecret) {
      return NextResponse.json(
        { error: '2FA not enrolled' },
        { status: 400 }
      );
    }

    // Verify TOTP code
    const isValid = verifyTotpCode(dbUser.totpSecret, validated.totpCode);

    if (!isValid) {
      await AuditLogger.logTwoFactorVerify(user.id, false, getClientIP(req), getUserAgent(req));
      return NextResponse.json(
        { error: 'Invalid TOTP code' },
        { status: 401 }
      );
    }

    // Enable 2FA
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: true,
      },
    });

    await AuditLogger.logTwoFactorVerify(user.id, true, getClientIP(req), getUserAgent(req));

    return NextResponse.json({
      success: true,
      message: 'Two-factor authentication enabled successfully',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('TOTP verify error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify 2FA' },
      { status: 500 }
    );
  }
}



