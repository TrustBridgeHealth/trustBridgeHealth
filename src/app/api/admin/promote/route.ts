// src/app/api/admin/promote/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AuditLogger } from '@/lib/audit';
import { getClientIP, getUserAgent } from '@/lib/rateLimit';
import { z } from 'zod';

const PromoteSchema = z.object({
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
    const { userId } = PromoteSchema.parse(body);

    // Get user to promote
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

    if (user.role === 'ADMIN') {
      return NextResponse.json(
        { error: 'User is already an admin' },
        { status: 400 }
      );
    }

    if (user.role !== 'PROVIDER') {
      return NextResponse.json(
        { error: 'Only providers can be promoted to admin' },
        { status: 400 }
      );
    }

    // Update role to ADMIN
    await prisma.user.update({
      where: { id: userId },
      data: { role: 'ADMIN' },
    });

    await AuditLogger.log({
      action: 'ADMIN_PROMOTE',
      target: 'USER',
      actorId: admin.id,
      subjectUserId: userId,
      ip: getClientIP(req),
      userAgent: getUserAgent(req),
      metadata: { promotedBy: admin.email, userEmail: user.email },
    });

    await AuditLogger.logRoleChange(
      admin.id,
      userId,
      user.role,
      'ADMIN',
      getClientIP(req),
      getUserAgent(req)
    );

    return NextResponse.json({
      success: true,
      message: 'User promoted to admin successfully',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Promote user error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to promote user' },
      { status: 500 }
    );
  }
}



