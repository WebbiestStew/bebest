import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest, isAdmin } from '@/lib/session';
import { updateRecord } from '@/lib/airtable';
import { Sugerencia } from '@/lib/types';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const user = getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isAdmin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    if (!['Nueva', 'Revisada', 'Hecha'].includes(body.estado)) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
    }

    const sugerencia = await updateRecord<Sugerencia>('sugerencias', params.id, {
      estado: body.estado,
    });

    return NextResponse.json({ sugerencia });
  } catch (error) {
    console.error('Error updating sugerencia:', error);
    return NextResponse.json({ error: 'Error al actualizar la sugerencia' }, { status: 500 });
  }
}
