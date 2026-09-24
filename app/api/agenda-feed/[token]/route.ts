import { NextRequest, NextResponse } from 'next/server';
import { verifyCalendarFeedToken } from '@/lib/calendarFeed';
import { findRecords, getRecord, escapeAirtableFormula } from '@/lib/airtable';
import { HARDCODED_ADMIN } from '@/lib/auth';
import { hasFullAccess } from '@/lib/roles';
import { Cita, User } from '@/lib/types';
import { buildCitasFeedIcs } from '@/lib/utils';

// The subscribable calendar feed itself — no session cookie here on purpose,
// since a calendar app re-fetching this in the background can't send one.
// The token (see lib/calendarFeed.ts) is the only credential; anyone who
// obtains a therapist's feed link can read their own future citas, same
// exposure as any calendar app's "secret address" feature.
export async function GET(_request: NextRequest, { params }: { params: { token: string } }) {
  const userId = await verifyCalendarFeedToken(params.token);
  if (!userId) {
    return NextResponse.json({ error: 'Enlace inválido' }, { status: 401 });
  }

  let nombre: string;
  let isAdminUser: boolean;

  if (userId === HARDCODED_ADMIN.id) {
    nombre = HARDCODED_ADMIN.nombre;
    isAdminUser = true;
  } else {
    const record = await getRecord<User>('users', userId);
    if (!record) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }
    nombre = (record as any).Nombre || '';
    isAdminUser = hasFullAccess((record as any).Rol);
  }

  try {
    let citas;
    if (isAdminUser) {
      citas = await findRecords<Cita>('citas');
    } else {
      const escapedNombre = escapeAirtableFormula(nombre);
      const coterapiaPatients = await findRecords<any>(
        'pacientes_2025_2026',
        `{coterapeuta} = '${escapedNombre}'`
      );
      const clauses = [`{terapeuta} = '${escapedNombre}'`];
      for (const p of coterapiaPatients) {
        if (p.paciente) clauses.push(`{paciente_nombre} = '${escapeAirtableFormula(p.paciente)}'`);
      }
      const filterFormula = clauses.length > 1 ? `OR(${clauses.join(', ')})` : clauses[0];
      citas = await findRecords<Cita>('citas', filterFormula);
    }

    const ics = buildCitasFeedIcs(citas);
    return new NextResponse(ics, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error building calendar feed:', error);
    return NextResponse.json({ error: 'Error al generar el calendario' }, { status: 500 });
  }
}
