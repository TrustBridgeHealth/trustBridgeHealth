// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { RegisterSchema } from '@/lib/validations/auth';
import { hashPassword, generateJWT } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AuditLogger } from '@/lib/audit';
import { getClientIP, getUserAgent } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = RegisterSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { emailLower: validated.email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(validated.password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: validated.email,
        emailLower: validated.email.toLowerCase(),
        name: validated.name,
        hashedPassword,
        role: validated.role || 'PATIENT',
      },
    });

    // Generate JWT token
    const token = generateJWT(user, true);

    // Set httpOnly cookie
    const response = NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        twoFactorEnabled: user.twoFactorEnabled,
      },
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    // Log registration
    await AuditLogger.log({
      action: 'LOGIN_SUCCESS',
      target: 'USER',
      actorId: user.id,
      subjectUserId: user.id,
      ip: getClientIP(req),
      userAgent: getUserAgent(req),
    });

    return response;
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Registration error:', error);
    return NextResponse.json(
      { error: error.message || 'Registration failed' },
      { status: 500 }
    );
  }
}



