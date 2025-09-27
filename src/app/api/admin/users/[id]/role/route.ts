import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { RoleUpdateSchema } from "@/lib/validations/auth";
import { AuditLogger } from "@/lib/audit";
import { getClientIP, getUserAgent } from "@/lib/rateLimit";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    if (!hasRole(user.role, "ADMIN")) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const json = await req.json().catch(() => ({}));
    const parsed = RoleUpdateSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { role } = parsed.data;
    const targetUserId = params.id;
    const ip = getClientIP(req);
    const userAgent = getUserAgent(req);

    // Prevent self-demotion from admin
    if (targetUserId === user.id && user.role === "ADMIN" && role !== "ADMIN") {
      return NextResponse.json(
        { error: "Cannot change your own admin role" },
        { status: 400 }
      );
    }

    // Get target user
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update role
    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        updatedAt: true,
      },
    });

    // Log role change
    await AuditLogger.logRoleChange(
      user.id,
      targetUserId,
      targetUser.role,
      role,
      ip,
      userAgent
    );

    return NextResponse.json({
      user: updatedUser,
      message: `User role updated to ${role}`,
    });
  } catch (error) {
    console.error("[/api/admin/users/[id]/role] error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}