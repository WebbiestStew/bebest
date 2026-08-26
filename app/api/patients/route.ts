import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest, isAdmin } from '@/lib/session';
import { createRecord, findRecords, updateRecord, getRecord } from '@/lib/airtable';
import { Patient } from '@/lib/types';


export async function GET(request: NextRequest) {
  const user = getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let patients;
    
    if (isAdmin(request)) {
      // Admin sees all patients
      patients = await findRecords<Patient>('pacientes_2025_2026');
    } else {
      // Regular user sees only their patients
      const filterFormula = `{terapeuta} = '${user.nombre}'`;
      patients = await findRecords<Patient>('pacientes_2025_2026', filterFormula);
    }

    return NextResponse.json({ patients });
  } catch (error) {
    console.error('Error fetching patients:', error);
    return NextResponse.json(
      { error: 'Error al obtener pacientes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const user = getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    const requiredFields = ['paciente', 'telefono', 'motivo_consulta'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Campo requerido: ${field}` },
          { status: 400 }
        );
      }
    }

    // For regular users, they can only create patients assigned to themselves
    const terapeuta = !isAdmin(request) ? user.nombre : (body.terapeuta || user.nombre);

    const newPatient = await createRecord<Patient>('pacientes_2025_2026', {
      paciente: body.paciente,
      telefono: body.telefono,
      terapeuta,
      fecha_ingreso: body.fecha_ingreso,
      motivo_consulta: body.motivo_consulta,
      estatus_en_registro: body.estatus_en_registro || 'ACTIVO',
      num_sesiones: 0,
      num_inasistencias: 0,
      expediente_completo: body.expediente_completo !== false,
      etapa_actual: body.etapa_actual || 'Primer contacto',
    });

    return NextResponse.json({ patient: newPatient }, { status: 201 });
  } catch (error) {
    console.error('Error creating patient:', error);
    return NextResponse.json(
      { error: 'Error al crear paciente' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const user = getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('id');

    if (!patientId) {
      return NextResponse.json(
        { error: 'ID de paciente requerido' },
        { status: 400 }
      );
    }

    // Verify user can edit this patient
    const patient = await getRecord<Patient>('pacientes_2025_2026', patientId);
    if (!patient) {
      return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 });
    }

    const patientAny = patient as any;
    if (!isAdmin(request) && patientAny.terapeuta && patientAny.terapeuta !== user.nombre) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const updatedPatient = await updateRecord<Patient>('pacientes_2025_2026', patientId, body);

    return NextResponse.json({ patient: updatedPatient });
  } catch (error) {
    console.error('Error updating patient:', error);
    return NextResponse.json(
      { error: 'Error al actualizar paciente' },
      { status: 500 }
    );
  }
}
