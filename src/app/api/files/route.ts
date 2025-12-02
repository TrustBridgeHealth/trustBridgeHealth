// src/app/api/files/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const [ownedFiles, sharedShares] = await Promise.all([
      prisma.file.findMany({
        where: {
          ownerId: user.id,
          isDeleted: false,
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          filenameCipher: true,
          notesCipher: true,
          size: true,
          mimeType: true,
          objectKey: true,
          createdAt: true,
          encFileKey: true,
          iv: true,
        },
      }),
      prisma.share.findMany({
        where: {
          granteeId: user.id,
          revokedAt: null,
          file: {
            isDeleted: false,
          },
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
        include: {
          file: {
            select: {
              id: true,
              filenameCipher: true,
              notesCipher: true,
              size: true,
              mimeType: true,
              objectKey: true,
              createdAt: true,
              encFileKey: true,
              iv: true,
              ownerId: true,
              owner: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    const ownFilePayload = ownedFiles.map(f => ({
      id: f.id,
      filenameCipher: f.filenameCipher,
      notesCipher: f.notesCipher,
      size: Number(f.size),
      mimeType: f.mimeType,
      objectKey: f.objectKey,
      createdAt: f.createdAt.toISOString(),
      encFileKey: Buffer.from(f.encFileKey).toString('base64'),
      iv: Buffer.from(f.iv).toString('hex'),
      shared: false,
    }));

    const sharedFilePayload = sharedShares
      .filter(share => Boolean(share.file))
      .map(share => {
        const file = share.file!;
        return {
          id: file.id,
          filenameCipher: file.filenameCipher,
          notesCipher: file.notesCipher,
          size: Number(file.size),
          mimeType: file.mimeType,
          objectKey: file.objectKey,
          createdAt: file.createdAt.toISOString(),
          encFileKey: Buffer.from(file.encFileKey).toString('base64'),
          iv: Buffer.from(file.iv).toString('hex'),
          shared: true,
          shareId: share.id,
          sharedAt: share.createdAt.toISOString(),
          sharedById: file.ownerId,
          sharedByName: file.owner?.name || null,
          sharedByEmail: file.owner?.email || null,
        };
      });

    return NextResponse.json({
      files: [...ownFilePayload, ...sharedFilePayload],
      total: ownFilePayload.length + sharedFilePayload.length,
      ownedTotal: ownFilePayload.length,
      sharedTotal: sharedFilePayload.length,
    });
  } catch (error: any) {
    console.error('List files error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list files' },
      { status: 500 }
    );
  }
}

