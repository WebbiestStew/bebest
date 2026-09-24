import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest, hasFullAccess } from '@/lib/session';
import { getRecord } from '@/lib/airtable';
import { Cita, Patient } from '@/lib/types';
import { buildCitaIcs } from '@/lib/utils';

// Serves a single appointment as a downloadable .ics file — opening it on a
// phone triggers "Add to Calendar" in whatever app is set as default there.
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cita = await getRecord<Cita>('citas', params.id);
  if (!cita) {
    return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
  }

  if (!(await hasFullAccess(request)) && (cita as any).terapeuta !== user.nombre) {
    const patientId = ((cita as any).paciente || [])[0];
    const patient = patientId ? await getRecord<Patient>('pacientes_2025_2026', patientId) : null;
    if (!patient || (patient as any).coterapeuta !== user.nombre) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const ics = buildCitaIcs(cita);

  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="cita-${params.id}.ics"`,
    },
  });
}
