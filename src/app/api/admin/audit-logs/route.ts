import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasRole } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasRole(user.role, "ADMIN")) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);

    const action = url.searchParams.get("action");
    const target = url.searchParams.get("target");

    const actorId = url.searchParams.get("actorId") || "";
    const subjectUserId = url.searchParams.get("subjectUserId") || "";
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const skip = (page - 1) * limit;

    const where: any = {};

    if (action) where.action = action;
    if (target) where.target = target;

    if (actorId) where.actorId = actorId;
    if (subjectUserId) where.subjectUserId = subjectUserId;

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    // Get audit logs
    const auditLogs = await prisma.auditLog.findMany({
      where,
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        file: {
          select: {
            id: true,
            filenameCipher: true,
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        share: {
          select: {
            id: true,
            grantee: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { timestamp: "desc" },
      skip,
      take: limit,
    });

    // Get total count
    const totalLogs = await prisma.auditLog.count({ where });

    // Get summary statistics
    const [actionStats, targetStats] = await Promise.all([
      prisma.auditLog.groupBy({
        by: ["action"],
        where: {
          timestamp: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
        _count: {
          action: true,
        },
      }),
      prisma.auditLog.groupBy({
        by: ["target"],
        where: {
          timestamp: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
        _count: {
          target: true,
        },
      }),
    ]);

    return NextResponse.json({
      auditLogs,
      pagination: {
        total: totalLogs,
        page,
        limit,
        totalPages: Math.ceil(totalLogs / limit),
      },
      statistics: {
        actionStats,
        targetStats,
      },
    });
  } catch (error) {
    console.error("[/api/admin/audit-logs] error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}