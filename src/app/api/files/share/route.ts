// src/app/api/files/share/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth';
import { FileShareSchema } from '@/lib/validations/files';
import { prisma } from '@/lib/prisma';
import { AuditLogger } from '@/lib/audit';
import { getClientIP, getUserAgent } from '@/lib/rateLimit';
import { z } from 'zod';

const ShareRequestSchema = z.object({
  fileId: z.string().min(1),
  granteeId: z.string().min(1),
  canDownload: z.boolean().optional().default(true),
});

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
    const { fileId, granteeId, canDownload } = ShareRequestSchema.parse(body);

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

    // Verify grantee exists
    const grantee = await prisma.user.findUnique({
      where: { id: granteeId },
    });

    if (!grantee) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Create or update share
    const share = await prisma.share.upsert({
      where: {
        fileId_granteeId: {
          fileId,
          granteeId,
        },
      },
      update: {
        revokedAt: null,
        revokedById: null,
        permission: 'READ',
      },
      create: {
        fileId,
        granteeId,
        createdById: user.id,
        permission: 'READ',
      },
    });

    await AuditLogger.logFileShare(
      user.id,
      fileId,
      granteeId,
      getClientIP(req),
      getUserAgent(req)
    );

    return NextResponse.json({
      share: {
        id: share.id,
        fileId: share.fileId,
        granteeId: share.granteeId,
        canDownload: true,
        expiresAt: share.expiresAt?.toISOString() || null,
        createdAt: share.createdAt.toISOString(),
      },
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Share file error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to share file' },
      { status: 500 }
    );
  }
}



