// src/app/api/files/[fileId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AuditLogger } from '@/lib/audit';
import { getClientIP, getUserAgent } from '@/lib/rateLimit';

export async function DELETE(req: NextRequest, context: any) {
  // no explicit type on context, we just cast inside
  const { params } = context as { params: { fileId: string } };
  const { fileId } = params;

  try {
    const user = await getCurrentUserFromRequest(req);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify file ownership
    const file = await prisma.file.findFirst({
      where: {
        id: fileId,
        ownerId: user.id,
        isDeleted: false,
      },
    });

    if (!file) {
      return NextResponse.json(
        { error: 'File not found or access denied' },
        { status: 403 }
      );
    }

    // Soft delete the file
    await prisma.file.update({
      where: { id: fileId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    // Revoke all shares for this file
    await prisma.share.updateMany({
      where: {
        fileId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revokedById: user.id,
      },
    });

    // Log file deletion
    await AuditLogger.log({
      action: 'FILE_UPLOAD', // placeholder
      target: 'FILE',
      actorId: user.id,
      fileId,
      targetId: fileId,
      ip: getClientIP(req),
      userAgent: getUserAgent(req),
      metadata: { action: 'DELETE' },
    });

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete file error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete file' },
      { status: 500 }
    );
  }
}

