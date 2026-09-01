import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest, isAdmin } from '@/lib/session';
import { createRecord, findRecords, updateRecord, getRecord, escapeAirtableFormula } from '@/lib/airtable';
import { Patient } from '@/lib/types';


export async function GET(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let patients;

    if (await isAdmin(request)) {
      // Admin sees all patients
      patients = await findRecords<Patient>('pacientes_2025_2026');
    } else {
      // Regular user sees their own patients plus any where they're the
      // coterapeuta — co-therapy means shared access, not primary-only.
      const nombre = escapeAirtableFormula(user.nombre);
      const filterFormula = `OR({terapeuta} = '${nombre}', {coterapeuta} = '${nombre}')`;
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
  const user = await getCurrentUserFromRequest(request);
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
    const terapeuta = !(await isAdmin(request)) ? user.nombre : (body.terapeuta || user.nombre);

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
      // Optional Ficha de Registro fields (Datos del cliente)
      ...(body.edad !== undefined ? { edad: body.edad } : {}),
      ...(body.fecha_nacimiento ? { fecha_nacimiento: body.fecha_nacimiento } : {}),
      ...(body.sexo ? { sexo: body.sexo } : {}),
      ...(body.estado_civil ? { estado_civil: body.estado_civil } : {}),
      ...(body.ocupacion ? { ocupacion: body.ocupacion } : {}),
      ...(body.email ? { email: body.email } : {}),
      ...(body.como_se_entero ? { como_se_entero: body.como_se_entero } : {}),
      // Domicilio
      ...(body.calle ? { calle: body.calle } : {}),
      ...(body.numero_ext_int ? { numero_ext_int: body.numero_ext_int } : {}),
      ...(body.colonia ? { colonia: body.colonia } : {}),
      ...(body.municipio ? { municipio: body.municipio } : {}),
      ...(body.estado_direccion ? { estado_direccion: body.estado_direccion } : {}),
      ...(body.pais ? { pais: body.pais } : {}),
      // Contacto de emergencia
      ...(body.contacto_emergencia_nombre ? { contacto_emergencia_nombre: body.contacto_emergencia_nombre } : {}),
      ...(body.contacto_emergencia_relacion
        ? { contacto_emergencia_relacion: body.contacto_emergencia_relacion }
        : {}),
      ...(body.contacto_emergencia_telefono
        ? { contacto_emergencia_telefono: body.contacto_emergencia_telefono }
        : {}),
      ...(body.contacto_emergencia_email ? { contacto_emergencia_email: body.contacto_emergencia_email } : {}),
      // Motivo de la solicitud + profesional que canaliza
      ...(body.motivo_solicitud ? { motivo_solicitud: body.motivo_solicitud } : {}),
      ...(body.profesional_nombre ? { profesional_nombre: body.profesional_nombre } : {}),
      ...(body.profesional_tipo ? { profesional_tipo: body.profesional_tipo } : {}),
      ...(body.profesional_telefono ? { profesional_telefono: body.profesional_telefono } : {}),
      ...(body.profesional_email ? { profesional_email: body.profesional_email } : {}),
      ...(body.profesional_autoriza_contacto !== undefined
        ? { profesional_autoriza_contacto: body.profesional_autoriza_contacto }
        : {}),
      ...(body.contrato_terapeutico_aceptado !== undefined
        ? { contrato_terapeutico_aceptado: body.contrato_terapeutico_aceptado }
        : {}),
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
  const user = await getCurrentUserFromRequest(request);
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
    const isAssigned =
      patientAny.terapeuta === user.nombre || patientAny.coterapeuta === user.nombre;
    if (!(await isAdmin(request)) && patientAny.terapeuta && !isAssigned) {
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
