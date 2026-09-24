import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest, hasFullAccess } from '@/lib/session';
import { getRecord, updateRecord, uploadAttachment } from '@/lib/airtable';
import { Patient } from '@/lib/types';
import { logAccess } from '@/lib/auditLog';

const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15MB

// Which attachment fields this endpoint is allowed to write to — 'documentos'
// is the general-purpose/legacy bucket (anything uploaded before the
// sectioned fields below existed); plan_no_suicidio_doc/
// consentimiento_informado_doc are dedicated fields so their "is this
// actually uploaded" state survives a page reload without having to guess
// from filenames; the four documentos_* fields are the sectioned buckets
// (Datos personales / Trabajo / Sesiones / Altas y bajas) new uploads go
// into instead of the general one.
const ALLOWED_FIELDS = [
  'documentos',
  'plan_no_suicidio_doc',
  'consentimiento_informado_doc',
  'documentos_datos_personales',
  'documentos_trabajo',
  'documentos_sesiones',
  'documentos_altas_bajas',
] as const;
type AllowedField = (typeof ALLOWED_FIELDS)[number];

function isAllowedField(field: unknown): field is AllowedField {
  return typeof field === 'string' && (ALLOWED_FIELDS as readonly string[]).includes(field);
}

async function checkAccess(request: NextRequest, patientId: string) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return { error: 'Unauthorized', status: 401 } as const;

  const patient = await getRecord<Patient>('pacientes_2025_2026', patientId);
  if (!patient) return { error: 'Paciente no encontrado', status: 404 } as const;

  const patientAny = patient as any;
  const isAssigned =
    patientAny.terapeuta === user.nombre || patientAny.coterapeuta === user.nombre;
  if (!(await hasFullAccess(request)) && patientAny.terapeuta && !isAssigned) {
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
    const field = isAllowedField(body.field) ? body.field : 'documentos';
    if (!filename || !contentType || !base64) {
      return NextResponse.json({ error: 'Archivo inválido' }, { status: 400 });
    }

    const approxBytes = (base64.length * 3) / 4;
    if (approxBytes > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'El archivo supera el límite de 15MB' }, { status: 400 });
    }

    await uploadAttachment('pacientes_2025_2026', params.id, field, {
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
    const fieldParam = searchParams.get('field');
    const field = isAllowedField(fieldParam) ? fieldParam : 'documentos';
    if (!attachmentId) {
      return NextResponse.json({ error: 'attachmentId requerido' }, { status: 400 });
    }

    const current = ((access.patient as any)[field] || []) as { id: string; filename?: string }[];
    const remaining = current.filter((d) => d.id !== attachmentId);
    const removed = current.find((d) => d.id === attachmentId);

    const updated = await updateRecord<Patient>('pacientes_2025_2026', params.id, {
      [field]: remaining,
    });

    logAccess(
      access.user.nombre,
      `eliminado_documento:${removed?.filename || ''}`,
      params.id,
      (access.patient as any).paciente
    );

    return NextResponse.json({ patient: updated });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json({ error: 'Error al eliminar el documento' }, { status: 500 });
  }
}
