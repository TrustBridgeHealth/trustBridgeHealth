// src/app/api/files/presign-download/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth';
import { PresignDownloadSchema } from '@/lib/validations/file';
import { generatePresignedDownloadUrl, validateFileAccess } from '@/lib/storage';
import { AuditLogger } from '@/lib/audit';
import { getClientIP, getUserAgent } from '@/lib/rateLimit';
import { prisma } from '@/lib/prisma';

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
    const { fileId } = PresignDownloadSchema.parse(body);

    // Validate file access
    const hasAccess = await validateFileAccess(user.id, fileId, 'read');

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'File not found or access denied' },
        { status: 403 }
      );
    }

    // Get file
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      select: { objectKey: true, bucket: true },
    });

    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Generate presigned download URL
    const { downloadUrl } = await generatePresignedDownloadUrl(file.objectKey, file.bucket);

    await AuditLogger.logFileDownload(
      user.id,
      fileId,
      getClientIP(req),
      getUserAgent(req)
    );

    return NextResponse.json({
      downloadUrl,
      expiresIn: 3600,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Presign download error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate download URL' },
      { status: 500 }
    );
  }
}



