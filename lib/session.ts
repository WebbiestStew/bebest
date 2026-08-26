import { NextRequest } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';
import { User } from './types';
import { hasAdminAccess } from './roles';

const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

export interface SessionPayload {
  id: string;
  email: string;
  nombre: string;
  rol: string;
}

// Signs the session into a JWT so it can't be edited client-side — a plain
// JSON cookie can be rewritten by anyone (e.g. setting rol: "admin") since
// httpOnly only blocks page scripts, not the account holder's own browser.
export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function getCurrentUserFromRequest(
  request: NextRequest
): Promise<(User & { id: string }) | null> {
  try {
    const session = request.cookies.get('consulta_session');
    if (!session) return null;

    const { payload } = await jwtVerify(session.value, secret);
    return payload as unknown as User & { id: string };
  } catch (error) {
    // Invalid signature, expired, or tampered — treat as logged out.
    return null;
  }
}

export async function isAdmin(request: NextRequest): Promise<boolean> {
  const user = await getCurrentUserFromRequest(request);
  return hasAdminAccess(user?.rol);
}
