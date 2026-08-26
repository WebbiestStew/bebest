import { NextRequest, NextResponse } from 'next/server';
import { hasAdminAccess } from '@/lib/roles';

export function middleware(request: NextRequest) {
  // Auth endpoints must be reachable without an existing session
  if (request.nextUrl.pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  const session = request.cookies.get('consulta_session');

  // Protect all routes except /login
  if (!session && request.nextUrl.pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect logged-in users away from /login
  if (session && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Check admin routes
  if (request.nextUrl.pathname.startsWith('/admin') || request.nextUrl.pathname === '/alertas') {
    if (session) {
      try {
        const sessionData = JSON.parse(session.value);
        if (!hasAdminAccess(sessionData.rol)) {
          return NextResponse.redirect(new URL('/', request.url));
        }
      } catch (error) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
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
