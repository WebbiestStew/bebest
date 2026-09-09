import { NextRequest, NextResponse } from 'next/server';
import { hasAdminAccess } from '@/lib/roles';
import { getCurrentUserFromRequest } from '@/lib/session';

export async function middleware(request: NextRequest) {
  // Auth endpoints must be reachable without an existing session
  if (request.nextUrl.pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  const PUBLIC_PATHS = ['/login', '/forgot-password', '/reset-password'];
  const isPublicPath = PUBLIC_PATHS.includes(request.nextUrl.pathname);

  const user = await getCurrentUserFromRequest(request);

  // Protect all routes except the public auth-flow pages. A present-but-
  // invalid/tampered/expired cookie is treated the same as no session at all.
  if (!user && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect logged-in users away from /login (but not away from
  // forgot/reset-password — someone can be logged in on one device while
  // resetting a password they forgot on another).
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
     * - any other static file under public/ (anything with a file
     *   extension, e.g. /bebest-logo.png) — those need to load on the
     *   login page itself, before there's any session to check.
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\..*).*)',
  ],
};
