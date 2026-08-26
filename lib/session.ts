import { NextRequest } from 'next/server';
import { User } from './types';
import { hasAdminAccess } from './roles';

export function getCurrentUserFromRequest(request: NextRequest): (User & { id: string }) | null {
  try {
    const session = request.cookies.get('consulta_session');
    if (!session) return null;

    const userData = JSON.parse(session.value);
    return userData as User & { id: string };
  } catch (error) {
    return null;
  }
}

export function isAdmin(request: NextRequest): boolean {
  const user = getCurrentUserFromRequest(request);
  return hasAdminAccess(user?.rol);
}
