import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest, isAdmin } from '@/lib/session';
import { getRecord, updateRecord, findRecords, createRecord } from '@/lib/airtable';
import { Cita, Patient } from '@/lib/types';

const BASE_ID = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;
const API_TOKEN = process.env.AIRTABLE_API_TOKEN;
const NO_SHOW_ALERT_THRESHOLD = 2;

async function checkAccess(request: NextRequest, citaId: string) {
  const user = getCurrentUserFromRequest(request);
  if (!user) return { error: 'Unauthorized', status: 401 } as const;

  const cita = await getRecord<Cita>('citas', citaId);
  if (!cita) return { error: 'Cita no encontrada', status: 404 } as const;

  if (!isAdmin(request) && (cita as any).terapeuta !== user.nombre) {
    return { error: 'Forbidden', status: 403 } as const;
  }

  return { user, cita } as const;
}

// Counts how many of the patient's most recent resolved appointments (in date
// order, ignoring future/cancelled ones) were consecutive no-shows.
async function countConsecutiveNoShows(patientId: string): Promise<number> {
  const allCitas = await findRecords<Cita>('citas');
  const resolved = allCitas
    .filter((c: any) => (c.paciente || []).includes(patientId) && ['No asistió', 'Completada'].includes(c.estado))
    .sort((a: any, b: any) => (b.fecha || '').localeCompare(a.fecha || ''));

  let streak = 0;
  for (const c of resolved as any[]) {
    if (c.estado === 'No asistió') {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await checkAccess(request, params.id);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const body = await request.json();
    const oldEstado = (access.cita as any).estado;
    const newEstado = body.estado;
    const patientId = ((access.cita as any).paciente || [])[0];

    const updated = await updateRecord<Cita>('citas', params.id, {
      ...(body.estado ? { estado: body.estado } : {}),
      ...(body.fecha ? { fecha: body.fecha } : {}),
      ...(body.hora ? { hora: body.hora } : {}),
      ...(body.notas !== undefined ? { notas: body.notas } : {}),
      ...(body.notas_sesion !== undefined ? { notas_sesion: body.notas_sesion } : {}),
    });

    // Keep the patient's session/inasistencias counters in sync with status
    // changes, and raise an alert once a patient racks up consecutive no-shows.
    if (patientId && newEstado && newEstado !== oldEstado) {
      const patient = await getRecord<Patient>('pacientes_2025_2026', patientId);
      if (patient) {
        const noShowCount = (patient as any).num_inasistencias || 0;
        const sessionCount = (patient as any).num_sesiones || 0;

        if (newEstado === 'No asistió' && oldEstado !== 'No asistió') {
          await updateRecord('pacientes_2025_2026', patientId, {
            num_inasistencias: noShowCount + 1,
          });

          const streak = await countConsecutiveNoShows(patientId);
          if (streak >= NO_SHOW_ALERT_THRESHOLD) {
            await createRecord('alerts', {
              Paciente: [patientId],
              Paciente_nombre: (patient as any).paciente,
              Paso_incompleto: `${streak} inasistencias seguidas`,
              ...(access.user.id.startsWith('rec') ? { Usuario: [access.user.id] } : {}),
              Usuario_nombre: access.user.nombre,
              Fecha_hora: new Date().toISOString(),
              Campos_faltantes: streak,
              Notificado: false,
            });
          }
        } else if (oldEstado === 'No asistió' && newEstado !== 'No asistió') {
          await updateRecord('pacientes_2025_2026', patientId, {
            num_inasistencias: Math.max(0, noShowCount - 1),
          });
        }

        if (newEstado === 'Completada' && oldEstado !== 'Completada') {
          await updateRecord('pacientes_2025_2026', patientId, {
            num_sesiones: sessionCount + 1,
          });
        } else if (oldEstado === 'Completada' && newEstado !== 'Completada') {
          await updateRecord('pacientes_2025_2026', patientId, {
            num_sesiones: Math.max(0, sessionCount - 1),
          });
        }
      }
    }

    return NextResponse.json({ cita: updated });
  } catch (error) {
    console.error('Error updating cita:', error);
    return NextResponse.json({ error: 'Error al actualizar la cita' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await checkAccess(request, params.id);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/citas/${params.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${API_TOKEN}` },
    });
    if (!res.ok) throw new Error('Airtable delete failed');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting cita:', error);
    return NextResponse.json({ error: 'Error al eliminar la cita' }, { status: 500 });
  }
}
