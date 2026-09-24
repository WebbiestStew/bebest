import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest, hasFullAccess } from '@/lib/session';
import { getRecord } from '@/lib/airtable';
import { Patient } from '@/lib/types';
import { reportServerError } from '@/lib/errorMonitor';
import { logAccess } from '@/lib/auditLog';

// Streams a document through the app's own auth check instead of handing out
// Airtable's raw attachment URL — that URL works for anyone who has it, with
// no login required, so it could leak via browser history, a referrer header,
// or a shared screenshot and still be openable by whoever finds it. This
// route means the only thing ever exposed to the client is a link that's
// worthless without an authenticated Consulta session.
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; attachmentId: string } }
) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const patient = await getRecord<Patient>('pacientes_2025_2026', params.id);
    if (!patient) {
      return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 });
    }

    const patientAny = patient as any;
    const isAssigned =
      patientAny.terapeuta === user.nombre || patientAny.coterapeuta === user.nombre;
    if (!(await hasFullAccess(request)) && patientAny.terapeuta && !isAssigned) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Looks across every attachment field this patient has, not just the
    // general `documentos` bucket — plan_no_suicidio_doc,
    // consentimiento_informado_doc, and the four documentos_* section fields
    // are all separate fields (see
    // app/api/patients/[id]/documentos/route.ts's ALLOWED_FIELDS) so their
    // "already uploaded" state survives a reselect, but that meant this
    // route could never actually serve them back once uploaded.
    const doc = [
      ...(patientAny.documentos || []),
      ...(patientAny.plan_no_suicidio_doc || []),
      ...(patientAny.consentimiento_informado_doc || []),
      ...(patientAny.documentos_datos_personales || []),
      ...(patientAny.documentos_trabajo || []),
      ...(patientAny.documentos_sesiones || []),
      ...(patientAny.documentos_altas_bajas || []),
    ].find((d: any) => d.id === params.attachmentId);
    if (!doc) {
      return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 });
    }

    // Airtable attachment URLs are themselves long-lived and unauthenticated
    // once you have them — fetched server-side here so the client never
    // needs to see or store that URL at all.
    const fileResponse = await fetch(doc.url);
    if (!fileResponse.ok || !fileResponse.body) {
      return NextResponse.json({ error: 'Error al obtener el documento' }, { status: 502 });
    }

    logAccess(user.nombre, `descargar_documento:${doc.filename}`, params.id, patientAny.paciente);

    return new NextResponse(fileResponse.body, {
      status: 200,
      headers: {
        'Content-Type': doc.type || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${(doc.filename || 'documento').replace(/"/g, '')}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    reportServerError('GET /api/patients/[id]/documentos/[attachmentId]', error);
    return NextResponse.json({ error: 'Error al obtener el documento' }, { status: 500 });
  }
}
