// src/app/api/auth/totp/enroll/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth';
import { generateTotpSecret } from '@/lib/auth';
import { AuditLogger } from '@/lib/audit';
import { getClientIP, getUserAgent } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!user.email) {
      return NextResponse.json(
        { error: 'User email not found' },
        { status: 400 }
      );
    }

    const { secret, qrCode, manualEntryKey } = await generateTotpSecret(user.id, user.email);

    // Generate backup codes
    const backupCodes: string[] = [];
    for (let i = 0; i < 10; i++) {
      backupCodes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
    }

    // Store backup codes (you might want to hash these)
    const { prisma } = await import('@/lib/prisma');
    await prisma.user.update({
      where: { id: user.id },
      data: {
        backupCodes,
      },
    });

    await AuditLogger.logTwoFactorEnroll(user.id, getClientIP(req), getUserAgent(req));

    return NextResponse.json({
      qrCodeUrl: qrCode,
      secret: manualEntryKey,
      backupCodes,
    });
  } catch (error: any) {
    console.error('TOTP enroll error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to enroll in 2FA' },
      { status: 500 }
    );
  }
}



