import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if 2FA is required and verified
    if (user.twoFactorEnabled && !user.twoFactorVerified) {
      return NextResponse.json({ error: "2FA verification required" }, { status: 403 });
    }

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);
    const skip = (page - 1) * limit;

    // Get user's own files
    const ownFiles = await prisma.file.findMany({
      where: {
        ownerId: user.id,
        isDeleted: false,
      },
      select: {
        id: true,
        filenameCipher: true,
        notesCipher: true,
        mimeType: true,
        size: true,
        createdAt: true,
        updatedAt: true,
        shares: {
          where: { revokedAt: null },
          select: {
            id: true,
            grantee: {
              select: { id: true, email: true, name: true },
            },
            expiresAt: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    // Get files shared with user
    const sharedFiles = await prisma.file.findMany({
      where: {
        shares: {
          some: {
            granteeId: user.id,
            revokedAt: null,
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
          },
        },
        isDeleted: false,
      },
      select: {
        id: true,
        filenameCipher: true,
        notesCipher: true,
        mimeType: true,
        size: true,
        createdAt: true,
        owner: {
          select: { id: true, email: true, name: true },
        },
        shares: {
          where: {
            granteeId: user.id,
            revokedAt: null,
          },
          select: {
            id: true,
            expiresAt: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    // Get total counts
    const [ownFilesCount, sharedFilesCount] = await Promise.all([
      prisma.file.count({
        where: {
          ownerId: user.id,
          isDeleted: false,
        },
      }),
      prisma.file.count({
        where: {
          shares: {
            some: {
              granteeId: user.id,
              revokedAt: null,
              OR: [
                { expiresAt: null },
                { expiresAt: { gt: new Date() } },
              ],
            },
          },
          isDeleted: false,
        },
      }),
    ]);

    return NextResponse.json({
      ownFiles: {
        files: ownFiles.map(file => ({
          ...file,
          size: file.size.toString(),
        })),
        total: ownFilesCount,
        page,
        limit,
        totalPages: Math.ceil(ownFilesCount / limit),
      },
      sharedFiles: {
        files: sharedFiles.map(file => ({
          ...file,
          size: file.size.toString(),
        })),
        total: sharedFilesCount,
        page,
        limit,
        totalPages: Math.ceil(sharedFilesCount / limit),
      },
    });
  } catch (error) {
    console.error("[/api/files] error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}