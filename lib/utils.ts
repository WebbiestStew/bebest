import { Patient, Cita } from './types';
import { DSM5_CODES } from './dsm5Codes';

const SESSION_MINUTES = 50;

// Formats a UTC Date as an iCalendar DATE-TIME (basic format, no separators).
function toIcsUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

// Escapes text per RFC 5545 (comma, semicolon, backslash, and literal
// newlines all need escaping inside a value).
function icsEscape(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/[,;]/g, '\\$&').replace(/\r?\n/g, '\\n');
}

// Builds a single-event .ics file for a cita, downloadable/openable to add it
// to the phone's own calendar app (Google/Apple/Outlook all support this).
// Monterrey (America/Monterrey) has used fixed UTC-6 standard time year-round
// since Mexico dropped DST outside the border strip in 2022, so the offset
// below is hardcoded rather than looked up from a timezone database.
export function buildCitaIcs(cita: Cita & { id: string }): string {
  const datePart = (cita.fecha || '').slice(0, 10);
  const start = new Date(`${datePart}T${cita.hora || '00:00'}:00-06:00`);
  const end = new Date(start.getTime() + SESSION_MINUTES * 60 * 1000);

  const summary = icsEscape(`Cita — ${cita.paciente_nombre}`);
  const descriptionParts = [`Terapeuta: ${cita.terapeuta}`];
  if (cita.notas) descriptionParts.push(`Notas: ${cita.notas}`);
  const description = icsEscape(descriptionParts.join('\n'));

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Consulta//Agenda//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:cita-${cita.id}@consulta.bebest.com`,
    `DTSTAMP:${toIcsUtc(new Date())}`,
    `DTSTART:${toIcsUtc(start)}`,
    `DTEND:${toIcsUtc(end)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `STATUS:${cita.estado === 'Cancelada' ? 'CANCELLED' : 'CONFIRMED'}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

// Looks up the ICD-10-CM code for a diagnosis name typed into Dx Principal /
// Dx Comorbilidad — exact match only (case-insensitive) against the DSM-5-TR
// classification list, since fuzzy-matching a clinical code is riskier than
// just not showing one. Pick the suggestion from the field's datalist to
// guarantee a match.
export function findDsm5Code(name: string): string | undefined {
  const target = name.trim().toLowerCase();
  if (!target) return undefined;
  return DSM5_CODES.find((e) => e.name.toLowerCase() === target)?.code;
}

// Plan de Tratamiento (Sesión 3) — the real document is a table of numbered
// objetivos each paired with técnicas, stored as a JSON string since Airtable
// has no array-of-objects field type.
export interface PlanObjetivo {
  objetivo: string;
  tecnicas: string;
}

export function parsePlanTratamiento(raw?: string): PlanObjetivo[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Pre-restructure values were a single free-text paragraph — surface
    // them as one row instead of silently losing the data.
    return [{ objetivo: 'Plan de tratamiento (formato anterior)', tecnicas: raw }];
  }
}

export function serializePlanTratamiento(rows: PlanObjetivo[]): string {
  const nonEmpty = rows.filter((r) => r.objetivo.trim() || r.tecnicas.trim());
  return nonEmpty.length ? JSON.stringify(nonEmpty) : '';
}

// Motivo de consulta (Ficha de Registro) — "select all that apply" list of
// concerns, stored as a JSON array string for the same reason as above.
export function parseMotivoConsulta(raw?: string): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Pre-restructure values were a single string (e.g. "Ansiedad") — surface
    // it as a one-item list instead of losing it.
    return [raw];
  }
}

export function serializeMotivoConsulta(items: string[]): string {
  return items.length ? JSON.stringify(items) : '';
}

// Toast notification helper
export function showToast(message: string, isError: boolean = false) {
  const event = new CustomEvent('showToast', {
    detail: { message, isError },
  });
  window.dispatchEvent(event);
}

// Validate email
export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Validate phone (basic)
export function validatePhone(phone: string): boolean {
  const re = /^[\d\s\-\+\(\)]+$/;
  return re.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

// Format date for display
export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Format datetime for display
export function formatDateTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Check if patient record is complete
export function isPatientComplete(patient: Patient): boolean {
  const p = patient as any;
  return !!(
    p.dx_principal &&
    p.plan_tratamiento &&
    p.plan_no_suicidio &&
    p.consentimiento_informado &&
    p.referido_psiquiatria
  );
}

// Get missing fields for a patient at a given stage
export function getMissingFields(
  patient: Patient,
  stage: 'Primer contacto' | 'Evaluación' | 'Tratamiento'
): string[] {
  const missing: string[] = [];

  if (stage === 'Primer contacto') {
    if (!patient.nombre) missing.push('Nombre');
    if (!patient.telefono) missing.push('Teléfono');
    if (!patient.motivo_consulta) missing.push('Motivo de consulta');
  }

  if (stage === 'Evaluación') {
    if (!patient.historia_clinica) missing.push('Historia Clínica');
    if (!patient.bateria_pruebas) missing.push('Batería de Pruebas');
    if (!patient.observaciones_pruebas) missing.push('Observaciones de Pruebas');
  }

  if (stage === 'Tratamiento') {
    if (!patient.dx_principal) missing.push('Dx Principal');
    if (!patient.plan_tratamiento) missing.push('Plan de Tratamiento');
    if (!patient.plan_no_suicidio) missing.push('Plan de No Suicidio');
    if (!patient.consentimiento_informado) missing.push('Consentimiento Informado');
    if (!patient.referido_psiquiatria) missing.push('Referencia a Psiquiatría');
  }

  return missing;
}

// Delay helper (for debouncing, etc.)
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Retry helper for API calls
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 400
): Promise<T> {
  let lastError;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries) {
        await delay(delayMs * (i + 1));
      }
    }
  }
  throw lastError;
}

// Sanitize user input
export function sanitize(input: string): string {
  return input
    .trim()
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Reads a File into a base64 string (no data: URL prefix), for the
// documentos upload endpoint, which expects raw base64.
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] || '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Get initials from name
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
