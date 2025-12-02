import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Role } from "@prisma/client";

const ROLES = { ADMIN: "ADMIN", PROVIDER: "PROVIDER" } as const;

const DemoteBody = z.object({
  userId: z.string().min(1),
});

export async function POST(req: Request) {
  // 1) Validate body (must be { "userId": string })
  const json = await req.json().catch(() => ({}));
  const parsed = DemoteBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body. Expected { "userId": string }.' },
      { status: 400 }
    );
  }

  // 2) AuthN & AuthZ (admin only)
  let me: Awaited<ReturnType<typeof getCurrentUser>> | null = null;
  try {
    me = await getCurrentUser(req);
  } catch {
    me = null;
  }
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.role !== ROLES.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = parsed.data;

  try {
    // 3) Find target first (needed for last-admin protection)
    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true },
    });

    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 4) Last-admin protection: if target is ADMIN and it's the only admin -> block
    if (target.role === ROLES.ADMIN) {
      const adminCount = await prisma.user.count({ where: { role: ROLES.ADMIN } });
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Cannot demote the last remaining admin" },
          { status: 400 }
        );
      }
    }

    // 5) Demote (idempotent even if already USER)
    const updated = await prisma.user.update({
      where: { id: target.id },
      data: { role: ROLES.PROVIDER },
      select: { id: true, email: true, role: true, updatedAt: true },
    });

    // 6) Flat response per spec
    return NextResponse.json(updated, { status: 200 });
  } catch (err: any) {
    // Prisma not-found on update (shouldn't happen because we findUnique first),
    // but keep for completeness.
    if (err?.code === "P2025") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    console.error("[/api/admin/demote] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
