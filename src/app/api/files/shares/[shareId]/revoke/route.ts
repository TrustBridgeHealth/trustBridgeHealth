// src/app/api/files/shares/[shareId]/revoke/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AuditLogger } from '@/lib/audit';
import { getClientIP, getUserAgent } from '@/lib/rateLimit';

export async function DELETE(req: NextRequest, context: any) {
  // NOTE: we keep `context` as `any` so Next.js's route validator is happy.
  const { params } = context as { params: { shareId: string } };
  const { shareId } = params;

  try {
    const user = await getCurrentUserFromRequest(req);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Find the share and ensure it belongs to a file owned by this user
    const share = await prisma.share.findFirst({
      where: {
        id: shareId,
        revokedAt: null,
      },
      include: {
        file: true,
      },
    });

    if (!share || !share.file || share.file.ownerId !== user.id) {
      return NextResponse.json(
        { error: 'Share not found or access denied' },
        { status: 403 }
      );
    }

    // Revoke this share
    await prisma.share.update({
      where: { id: shareId },
      data: {
        revokedAt: new Date(),
        revokedById: user.id,
      },
    });

    // Audit log for revoking a share
    await AuditLogger.log({
      action: 'FILE_SHARE_REVOKE',
      target: 'SHARE',
      actorId: user.id,
      shareId,
      targetId: shareId,
      fileId: share.fileId,
      ip: getClientIP(req),
      userAgent: getUserAgent(req),
      metadata: { action: 'DELETE' },
    });

    return NextResponse.json({
      success: true,
      message: 'Share revoked successfully',
    });
  } catch (error: any) {
    console.error('Revoke share error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to revoke share' },
      { status: 500 }
    );
  }
}
