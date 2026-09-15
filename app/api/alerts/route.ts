import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest, isAdmin } from '@/lib/session';
import { createRecord, findRecords, getRecord, updateRecord, escapeAirtableFormula } from '@/lib/airtable';
import { Alert, Patient } from '@/lib/types';
import { sendAlertEmail } from '@/lib/email';

export async function GET(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const alerts = await findRecords<Alert>('alerts');
    // Admins see every incomplete-form alert; regular users only see the
    // ones from forms they themselves saved incomplete (mirrors the
    // terapeuta/coterapeuta scoping already applied to /api/patients).
    const visible = (await isAdmin(request))
      ? alerts
      : alerts.filter((a: any) => a.Usuario_nombre === user.nombre);
    return NextResponse.json({ alerts: visible });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { error: 'Error al obtener alertas' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    const patient = await getRecord<Patient>('pacientes_2025_2026', body.paciente_id);
    // The hardcoded admin account has no real Airtable record, so only link
    // real (therapist) users to avoid Airtable rejecting an unknown record id.
    const isRealAirtableUser = user.id.startsWith('rec');

    const alert = await createRecord<Alert>('alerts', {
      Paciente: [body.paciente_id],
      Paciente_nombre: (patient as any)?.paciente || 'Paciente',
      Paso_incompleto: body.paso_incompleto,
      ...(isRealAirtableUser ? { Usuario: [user.id] } : {}),
      Usuario_nombre: user.nombre,
      Fecha_hora: new Date().toISOString(),
      Campos_faltantes: body.campos_faltantes || 0,
      Notificado: false,
    });

    // Best-effort: the assigned therapist may not be the one who triggered
    // this alert (e.g. an admin filling out a form on their behalf), so look
    // their email up by name rather than assuming it's the requesting user.
    const terapeutaNombre = (patient as any)?.terapeuta;
    let terapeutaEmail: string | undefined;
    if (terapeutaNombre) {
      const [match] = await findRecords<any>(
        'users',
        `{Nombre} = '${escapeAirtableFormula(terapeutaNombre)}'`
      );
      terapeutaEmail = match?.Email;
    }

    const sent = await sendAlertEmail({
      pacienteNombre: (patient as any)?.paciente || 'Paciente',
      pasoIncompleto: body.paso_incompleto,
      usuarioNombre: user.nombre,
      terapeutaEmail,
    });
    if (sent) {
      await updateRecord('alerts', alert.id, { Notificado: true });
    }

    return NextResponse.json({ alert }, { status: 201 });
  } catch (error) {
    console.error('Error creating alert:', error);
    return NextResponse.json(
      { error: 'Error al crear alerta' },
      { status: 500 }
    );
  }
}
