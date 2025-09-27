// src/app/api/admin/ping/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/authorize';

export async function GET(req: Request) {
  const gate = await requireRole(req, ['ADMIN']);
  if (!gate.ok) {
    const code = gate.status ?? 500;
    return NextResponse.json(
      { error: code === 401 ? 'Unauthorized' : code === 403 ? 'Forbidden' : 'Internal error' },
      { status: code }
    );
  }

  return NextResponse.json({
    message: `Hello Admin ${gate.user.name ?? gate.user.email}`,
  });
}
