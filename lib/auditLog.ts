import { createRecord, findRecords } from './airtable';

export interface AuditLogEntry {
  id: string;
  usuario: string;
  accion: string;
  paciente_id?: string;
  paciente_nombre?: string;
  timestamp: string;
}

// Audit trail: who looked at, downloaded, edited, created, or deleted what,
// and when. Started out scoped to just the two most sensitive read actions
// (viewing a patient's file, downloading a document) — now also covers the
// mutations added since (patient edits, cita/document/user deletes, user
// creation). `pacienteId`/`pacienteNombre` are reused loosely as "the record
// this action was about" even for non-patient resources (e.g. a deleted
// cita or a created user) since the table has no separate resource-type
// column — the `accion` prefix (before the first ':') is what distinguishes
// them; see ACCION_META in app/auditoria/page.tsx. Fire-and-forget: logging
// failures are swallowed so a broken audit write never blocks the real
// request.
export function logAccess(
  usuario: string,
  accion: string,
  pacienteId: string,
  pacienteNombre?: string
): void {
  createRecord('audit_log', {
    usuario,
    accion,
    paciente_id: pacienteId,
    paciente_nombre: pacienteNombre || '',
    timestamp: new Date().toISOString(),
  }).catch((error) => {
    console.error('Error writing audit log:', error);
  });
}

export async function getAuditLog(): Promise<AuditLogEntry[]> {
  const entries = await findRecords<AuditLogEntry>('audit_log');
  return entries.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
}

// Builds a one-line "campo: antes → después" summary for the fields that
// actually changed — skips anything unchanged rather than dumping the whole
// payload, and truncates long values (historia clínica, plan de tratamiento
// JSON, etc.) so one edit doesn't produce an unreadable wall of text.
export function summarizeChanges(before: any, changes: Record<string, any>): string {
  const format = (v: any) => {
    if (v === undefined || v === null || v === '') return '(vacío)';
    const s = typeof v === 'string' ? v : JSON.stringify(v);
    return s.length > 60 ? `${s.slice(0, 60)}…` : s;
  };
  const parts: string[] = [];
  for (const key of Object.keys(changes)) {
    const oldVal = before?.[key];
    const newVal = changes[key];
    if (JSON.stringify(oldVal) === JSON.stringify(newVal)) continue;
    parts.push(`${key}: ${format(oldVal)} → ${format(newVal)}`);
  }
  return parts.join('; ');
}
