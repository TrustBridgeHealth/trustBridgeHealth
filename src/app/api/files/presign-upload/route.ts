// src/app/api/files/presign-upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth';
import { PresignUploadSchema } from '@/lib/validations/file';
import { generatePresignedUploadUrl, generateObjectKey } from '@/lib/storage';
import { prisma } from '@/lib/prisma';
import { AuditLogger } from '@/lib/audit';
import { getClientIP, getUserAgent } from '@/lib/rateLimit';
// Note: hexToUint8Array is browser-only, using Buffer directly in Node.js

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
    const validated = PresignUploadSchema.parse(body);

    // Generate object key
    const objectKey = generateObjectKey(user.id, `file-${Date.now()}`);

    // Get presigned URL
    // Use application/octet-stream for encrypted files to avoid Content-Type mismatch
    const { uploadUrl, requiredHeaders } = await generatePresignedUploadUrl(
      objectKey,
      'application/octet-stream', // Always use this for encrypted files
      validated.size
    );

    // Create file record in database
    const file = await prisma.file.create({
      data: {
        ownerId: user.id,
        bucket: process.env.S3_BUCKET_NAME || 'trustbridge-health-files',
        objectKey,
        size: BigInt(validated.size),
        mimeType: validated.mimeType,
        filenameCipher: validated.filenameCipher,
        notesCipher: validated.notesCipher,
        encFileKey: Buffer.from(validated.encFileKey, 'base64'),
        encFileKeyAlg: validated.encFileKeyAlg || 'AES-GCM-256',
        iv: Buffer.from(validated.iv, 'hex'),
      },
    });

    await AuditLogger.logFileUpload(
      user.id,
      file.id,
      validated.filenameCipher.substring(0, 50),
      validated.size,
      getClientIP(req),
      getUserAgent(req)
    );

    return NextResponse.json({
      uploadUrl,
      fileId: file.id,
      requiredHeaders,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Presign upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}

