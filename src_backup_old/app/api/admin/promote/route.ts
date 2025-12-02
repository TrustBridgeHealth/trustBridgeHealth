import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth"; // returns { id, email, role } | null

const ROLES = { ADMIN: "ADMIN", USER: "USER" } as const;

const PromoteBody = z.object({
  userId: z.string().min(1),
});

export async function POST(req: Request) {
  // Parse & validate body
  const json = await req.json().catch(() => ({}));
  const parsed = PromoteBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body. Expected { "userId": string }.' },
      { status: 400 }
    );
  }

  // AuthN/AuthZ
  let me: Awaited<ReturnType<typeof getCurrentUser>> | null = null;
  try {
    me = await getCurrentUser(req);
  } catch {
    me = null;
  }
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (me.role !== ROLES.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = parsed.data;

  try {
    // Update role to ADMIN; if user doesn't exist, Prisma throws P2025
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role: ROLES.ADMIN },
      select: { id: true, email: true, role: true, updatedAt: true },
    });

    // Flat response per spec
    return NextResponse.json(updated, { status: 200 });
  } catch (err: any) {
    if (err?.code === "P2025") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    console.error("[/api/admin/promote] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
