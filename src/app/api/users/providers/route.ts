// src/app/api/users/providers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all providers
    const providers = await prisma.user.findMany({
      where: {
        role: 'PROVIDER',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({
      providers: providers.map(p => ({
        id: p.id,
        email: p.email,
        name: p.name,
        role: p.role,
      })),
    });
  } catch (error: any) {
    console.error('Get providers error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get providers' },
      { status: 500 }
    );
  }
}



