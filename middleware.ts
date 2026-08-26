import { NextRequest, NextResponse } from 'next/server';
import { hasAdminAccess } from '@/lib/roles';
import { getCurrentUserFromRequest } from '@/lib/session';

export async function middleware(request: NextRequest) {
  // Auth endpoints must be reachable without an existing session
  if (request.nextUrl.pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  const user = await getCurrentUserFromRequest(request);

  // Protect all routes except /login. A present-but-invalid/tampered/expired
  // cookie is treated the same as no session at all.
  if (!user && request.nextUrl.pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect logged-in users away from /login
  if (user && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Check admin routes
  if (request.nextUrl.pathname.startsWith('/admin') || request.nextUrl.pathname === '/alertas') {
    if (user && !hasAdminAccess(user.rol)) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
