import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest, isAdmin } from '@/lib/session';
import { getAuditLog } from '@/lib/auditLog';

export async function GET(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: 'Only admins can view the audit log' }, { status: 403 });
  }

  try {
    const entries = await getAuditLog();
    return NextResponse.json({ entries });
  } catch (error) {
    console.error('Error fetching audit log:', error);
    return NextResponse.json({ error: 'Error al obtener el historial' }, { status: 500 });
  }
}
