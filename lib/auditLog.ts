import { createRecord } from './airtable';

// Minimal audit trail: who looked at or downloaded a patient's record, and
// when. Scoped to the two most sensitive read actions for now (viewing a
// patient's file, downloading one of their documents) rather than every
// mutation in the app — a starting point for "who touched this sensitive
// record," not exhaustive coverage. Fire-and-forget: logging failures are
// swallowed so a broken audit write never blocks the actual request.
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
