import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const admin = await getCurrentUserFromRequest(req);
    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const searchParams = req.nextUrl.searchParams;
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const pageSize = Math.min(Math.max(parseInt(searchParams.get('pageSize') || '20', 10), 1), 100);
    const action = searchParams.get('action');
    const actorId = searchParams.get('actorId');
    const target = searchParams.get('target');

    const where: Record<string, any> = {};
    if (action) {
      where.action = action;
    }
    if (actorId) {
      where.actorId = actorId;
    }
    if (target) {
      where.target = target;
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          actor: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      logs: logs.map((log) => ({
        id: log.id,
        timestamp: log.timestamp.toISOString(),
        action: log.action,
        target: log.target,
        actorId: log.actorId,
        actorName: log.actor?.name ?? null,
        actorEmail: log.actor?.email ?? null,
        targetId: log.targetId,
        fileId: log.fileId,
        shareId: log.shareId,
        subjectUserId: log.subjectUserId,
        ip: log.ip,
        userAgent: log.userAgent,
        metadata: log.metadata,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error: any) {
    console.error('Audit logs error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}


