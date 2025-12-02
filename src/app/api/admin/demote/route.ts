// src/app/api/admin/demote/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AuditLogger } from '@/lib/audit';
import { getClientIP, getUserAgent } from '@/lib/rateLimit';
import { z } from 'zod';

const DemoteSchema = z.object({
  userId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentUserFromRequest(req);

    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { userId } = DemoteSchema.parse(body);

    // Get user to demote
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'User is not an admin' },
        { status: 400 }
      );
    }

    // Check if this is the last admin
    const adminCount = await prisma.user.count({
      where: { role: 'ADMIN' },
    });

    if (adminCount <= 1) {
      return NextResponse.json(
        { error: 'Cannot demote the last remaining admin' },
        { status: 400 }
      );
    }

    // Update role to PROVIDER (fallback role for demoted admins)
    await prisma.user.update({
      where: { id: userId },
      data: { role: 'PROVIDER' },
    });

    await AuditLogger.log({
      action: 'ADMIN_DEMOTE',
      target: 'USER',
      actorId: admin.id,
      subjectUserId: userId,
      ip: getClientIP(req),
      userAgent: getUserAgent(req),
      metadata: { demotedBy: admin.email, userEmail: user.email },
    });

    await AuditLogger.logRoleChange(
      admin.id,
      userId,
      user.role,
      'PROVIDER',
      getClientIP(req),
      getUserAgent(req)
    );

    return NextResponse.json({
      success: true,
      message: 'User demoted successfully',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Demote user error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to demote user' },
      { status: 500 }
    );
  }
}



