import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest, isAdmin } from '@/lib/session';
import { getRecord, updateRecord, uploadAttachment } from '@/lib/airtable';
import { Patient } from '@/lib/types';

const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15MB

async function checkAccess(request: NextRequest, patientId: string) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return { error: 'Unauthorized', status: 401 } as const;

  const patient = await getRecord<Patient>('pacientes_2025_2026', patientId);
  if (!patient) return { error: 'Paciente no encontrado', status: 404 } as const;

  const patientAny = patient as any;
  if (!(await isAdmin(request)) && patientAny.terapeuta && patientAny.terapeuta !== user.nombre) {
    return { error: 'Forbidden', status: 403 } as const;
  }

  return { user, patient } as const;
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await checkAccess(request, params.id);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const body = await request.json();
    const { filename, contentType, base64 } = body;
    if (!filename || !contentType || !base64) {
      return NextResponse.json({ error: 'Archivo inválido' }, { status: 400 });
    }

    const approxBytes = (base64.length * 3) / 4;
    if (approxBytes > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'El archivo supera el límite de 15MB' }, { status: 400 });
    }

    await uploadAttachment('pacientes_2025_2026', params.id, 'documentos', {
      filename,
      contentType,
      base64,
    });

    const updated = await getRecord<Patient>('pacientes_2025_2026', params.id);
    return NextResponse.json({ patient: updated }, { status: 201 });
  } catch (error) {
    console.error('Error uploading document:', error);
    return NextResponse.json({ error: 'Error al subir el documento' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await checkAccess(request, params.id);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const attachmentId = searchParams.get('attachmentId');
    if (!attachmentId) {
      return NextResponse.json({ error: 'attachmentId requerido' }, { status: 400 });
    }

    const current = ((access.patient as any).documentos || []) as { id: string }[];
    const remaining = current.filter((d) => d.id !== attachmentId);

    const updated = await updateRecord<Patient>('pacientes_2025_2026', params.id, {
      documentos: remaining,
    });

    return NextResponse.json({ patient: updated });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json({ error: 'Error al eliminar el documento' }, { status: 500 });
  }
}
