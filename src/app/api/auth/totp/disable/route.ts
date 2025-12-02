// src/app/api/auth/totp/disable/route.ts
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
      select: { totpSecret: true, backupCodes: true },
    });

    if (!dbUser?.totpSecret) {
      return NextResponse.json(
        { error: '2FA not enabled' },
        { status: 400 }
      );
    }

    // Verify TOTP code or backup code
    const isValidTotp = verifyTotpCode(dbUser.totpSecret, validated.totpCode);
    const isValidBackup = dbUser.backupCodes?.includes(validated.totpCode);

    if (!isValidTotp && !isValidBackup) {
      return NextResponse.json(
        { error: 'Invalid TOTP code or backup code' },
        { status: 401 }
      );
    }

    // Remove used backup code if it was used
    if (isValidBackup) {
      const updatedBackupCodes = dbUser.backupCodes?.filter(code => code !== validated.totpCode) || [];
      await prisma.user.update({
        where: { id: user.id },
        data: {
          twoFactorEnabled: false,
          totpSecret: null,
          backupCodes: updatedBackupCodes,
        },
      });
    } else {
      // Disable 2FA
      await prisma.user.update({
        where: { id: user.id },
        data: {
          twoFactorEnabled: false,
          totpSecret: null,
          backupCodes: [],
        },
      });
    }

    await AuditLogger.log({
      action: 'TWOFA_DISABLE',
      target: 'USER',
      actorId: user.id,
      subjectUserId: user.id,
      ip: getClientIP(req),
      userAgent: getUserAgent(req),
    });

    return NextResponse.json({
      success: true,
      message: 'Two-factor authentication disabled successfully',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('TOTP disable error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to disable 2FA' },
      { status: 500 }
    );
  }
}



