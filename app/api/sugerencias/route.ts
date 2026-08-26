import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/session';
import { createRecord, findRecords } from '@/lib/airtable';
import { Sugerencia } from '@/lib/types';
import { roleLabel } from '@/lib/roles';

export async function GET(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sugerencias = await findRecords<Sugerencia>('sugerencias');
    sugerencias.sort((a: any, b: any) => (b.fecha_hora || '').localeCompare(a.fecha_hora || ''));
    return NextResponse.json({ sugerencias });
  } catch (error) {
    console.error('Error fetching sugerencias:', error);
    return NextResponse.json({ error: 'Error al obtener sugerencias' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (!body.mensaje || !body.mensaje.trim()) {
      return NextResponse.json({ error: 'Escribe tu sugerencia antes de enviarla' }, { status: 400 });
    }

    const sugerencia = await createRecord<Sugerencia>('sugerencias', {
      mensaje: body.mensaje.trim(),
      usuario_nombre: user.nombre,
      usuario_rol: roleLabel(user.rol),
      pagina: body.pagina || '',
      fecha_hora: new Date().toISOString(),
      estado: 'Nueva',
    });

    return NextResponse.json({ sugerencia }, { status: 201 });
  } catch (error) {
    console.error('Error creating sugerencia:', error);
    return NextResponse.json({ error: 'Error al enviar la sugerencia' }, { status: 500 });
  }
}
