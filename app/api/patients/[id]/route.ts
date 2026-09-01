import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest, isAdmin } from '@/lib/session';
import { getRecord } from '@/lib/airtable';
import { Patient } from '@/lib/types';
import { logAccess } from '@/lib/auditLog';
import { reportServerError } from '@/lib/errorMonitor';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const patient = await getRecord<Patient>('pacientes_2025_2026', params.id);

    if (!patient) {
      return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 });
    }

    // Check permissions — own patients plus any where the user is coterapeuta
    const patientAny = patient as any;
    const isAssigned =
      patientAny.terapeuta === user.nombre || patientAny.coterapeuta === user.nombre;
    if (!(await isAdmin(request)) && patientAny.terapeuta && !isAssigned) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    logAccess(user.nombre, 'ver_paciente', params.id, patientAny.paciente);

    return NextResponse.json({ patient });
  } catch (error) {
    reportServerError('GET /api/patients/[id]', error);
    return NextResponse.json(
      { error: 'Error al obtener paciente' },
      { status: 500 }
    );
  }
}
