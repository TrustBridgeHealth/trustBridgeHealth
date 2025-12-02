// src/lib/authorize.ts
import { getCurrentUserFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function requireRole(
  req: Request,
  roles: ('USER' | 'ADMIN')[]
): Promise<{ ok: true; user: { id: string; email: string | null; name: string | null; role: 'USER' | 'ADMIN' } } |
           { ok: false; status: 401 | 403 | 500 }> {
  try {
    const user = await getCurrentUserFromRequest(req as any);
    if (!user) return { ok: false, status: 401 };

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!dbUser) return { ok: false, status: 401 };

    // Prisma returns enum as string 'USER' | 'ADMIN' – compare directly
    if (!roles.includes(dbUser.role as 'USER' | 'ADMIN')) {
      return { ok: false, status: 403 };
    }

    return { ok: true, user: { ...dbUser, role: dbUser.role as 'USER' | 'ADMIN' } };
  } catch (e) {
    console.error('[authorize.requireRole]', e);
    return { ok: false, status: 500 };
  }
}
