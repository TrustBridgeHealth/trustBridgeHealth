// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJwt } from '@/lib/auth-enhanced';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Define protected routes with their required roles
  const protectedRoutes = {
    '/api/me': [], // Any authenticated user
    '/api/files': [], // Any authenticated user
    '/api/auth/totp': [], // Any authenticated user
    '/api/admin': ['ADMIN'], // Admin only
  };

  // Check if path matches any protected route
  const matchedRoute = Object.keys(protectedRoutes).find(route => 
    pathname.startsWith(route)
  );

  if (matchedRoute) {
    // Get token from cookie or Authorization header
    let token = req.cookies.get('token')?.value;

    if (!token) {
      const authHeader = req.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.slice(7).trim();
      }
    }

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const payload = verifyJwt(token);
      
      // Check role requirements
      const requiredRoles = protectedRoutes[matchedRoute as keyof typeof protectedRoutes];
      if (requiredRoles.length > 0 && !requiredRoles.includes(payload.role)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }

      // Check 2FA verification for sensitive operations
      const requires2FA = pathname.startsWith('/api/files') || pathname.startsWith('/api/admin');
      if (requires2FA && payload.twoFactorEnabled && !payload.twoFactorVerified) {
        return NextResponse.json({ error: '2FA verification required' }, { status: 403 });
      }

      // Add user info to headers for downstream use
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set('x-user-id', payload.sub);
      requestHeaders.set('x-user-role', payload.role);
      requestHeaders.set('x-user-2fa-verified', payload.twoFactorVerified?.toString() || 'false');

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'], // run middleware on all API routes
};