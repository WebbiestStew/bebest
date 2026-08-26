import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest, isAdmin } from '@/lib/session';
import { createRecord, findRecords, getRecord } from '@/lib/airtable';
import { Alert, Patient } from '@/lib/types';

export async function GET(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: 'Only admins can view alerts' }, { status: 403 });
  }

  try {
    const alerts = await findRecords<Alert>('alerts');
    return NextResponse.json({ alerts });
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

    return NextResponse.json({ alert }, { status: 201 });
  } catch (error) {
    console.error('Error creating alert:', error);
    return NextResponse.json(
      { error: 'Error al crear alerta' },
      { status: 500 }
    );
  }
}
