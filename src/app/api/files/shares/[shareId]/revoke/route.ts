// src/app/api/files/shares/[shareId]/revoke/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AuditLogger } from '@/lib/audit';
import { getClientIP, getUserAgent } from '@/lib/rateLimit';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { shareId: string } }
) {
  try {
    const user = await getCurrentUserFromRequest(req);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { shareId } = params;

    // Get share
    const share = await prisma.share.findUnique({
      where: { id: shareId },
      include: {
        file: {
          select: { ownerId: true },
        },
      },
    });

    if (!share) {
      return NextResponse.json(
        { error: 'Share not found' },
        { status: 404 }
      );
    }

    // Verify user owns the file
    if (share.file.ownerId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Revoke share
    await prisma.share.update({
      where: { id: shareId },
      data: {
        revokedAt: new Date(),
        revokedById: user.id,
      },
    });

    await AuditLogger.logFileShareRevoke(
      user.id,
      share.fileId,
      share.granteeId,
      getClientIP(req),
      getUserAgent(req)
    );

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



