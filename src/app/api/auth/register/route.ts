import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { RegisterSchema } from "@/lib/validations/auth";
import { AuditLogger } from "@/lib/audit";
import { getClientIP, getUserAgent } from "@/lib/rateLimit";

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => ({}));
    const parsed = RegisterSchema.safeParse(json);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, password, role } = parsed.data;
    const emailLower = email.trim().toLowerCase();
    const ip = getClientIP(req);
    const userAgent = getUserAgent(req);

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { emailLower },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user with enhanced security fields
    const user = await prisma.user.create({
      data: {
        email: email.trim(),
        emailLower,
        name: name.trim(),
        hashedPassword,
        role: role || "PATIENT",
        loginAttempts: 0,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    // Log successful registration
    await AuditLogger.log({
      action: "LOGIN_SUCCESS", // Using existing enum value for registration
      target: "USER",
      actorId: user.id,
      subjectUserId: user.id,
      ip,
      userAgent,
      metadata: { action: "registration", role: user.role },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    console.error("[/api/auth/register] error:", err);
    
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json(
        {
          error: "DEV_REG_ERROR",
          code: err?.code ?? null,
          meta: err?.meta ?? null,
          message: err?.message ?? String(err),
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}