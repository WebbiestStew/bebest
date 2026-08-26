import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest, isAdmin } from '@/lib/session';
import { createRecord, createRecords, findRecords } from '@/lib/airtable';
import { Cita } from '@/lib/types';

export async function GET(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let citas;
    if (await isAdmin(request)) {
      citas = await findRecords<Cita>('citas');
    } else {
      const filterFormula = `{terapeuta} = '${user.nombre}'`;
      citas = await findRecords<Cita>('citas', filterFormula);
    }

    return NextResponse.json({ citas });
  } catch (error) {
    console.error('Error fetching citas:', error);
    return NextResponse.json({ error: 'Error al obtener citas' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const requiredFields = ['paciente_nombre', 'terapeuta', 'fecha', 'hora'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ error: `Campo requerido: ${field}` }, { status: 400 });
      }
    }

    // Non-admins can only schedule appointments under their own name
    const terapeuta = !(await isAdmin(request)) ? user.nombre : body.terapeuta;

    const repeatWeeks = Math.min(Math.max(parseInt(body.repeatWeeks, 10) || 1, 1), 52);
    const baseFields = {
      paciente_nombre: body.paciente_nombre,
      ...(body.paciente_id ? { paciente: [body.paciente_id] } : {}),
      terapeuta,
      hora: body.hora,
      notas: body.notas || '',
      estado: 'Programada',
    };

    if (repeatWeeks === 1) {
      const cita = await createRecord<Cita>('citas', { ...baseFields, fecha: body.fecha });
      return NextResponse.json({ citas: [cita] }, { status: 201 });
    }

    const baseDate = new Date(`${body.fecha}T00:00:00`);
    const fieldsList = Array.from({ length: repeatWeeks }, (_, i) => {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i * 7);
      return { ...baseFields, fecha: d.toISOString().slice(0, 10) };
    });
    const citas = await createRecords<Cita>('citas', fieldsList);

    return NextResponse.json({ citas }, { status: 201 });
  } catch (error) {
    console.error('Error creating cita:', error);
    return NextResponse.json({ error: 'Error al crear la cita' }, { status: 500 });
  }
}
