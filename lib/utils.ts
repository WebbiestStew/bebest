import type { ReactElement } from 'react';
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

// Monterrey (America/Monterrey) has used fixed UTC-6 standard time year-round
// since Mexico dropped DST outside the border strip in 2022, so the offset
// below is hardcoded rather than looked up from a timezone database.
function buildVevent(cita: Cita & { id: string }, dtstamp: string): string {
  const datePart = (cita.fecha || '').slice(0, 10);
  const start = new Date(`${datePart}T${cita.hora || '00:00'}:00-06:00`);
  const end = new Date(start.getTime() + SESSION_MINUTES * 60 * 1000);

  const summary = icsEscape(`Cita — ${cita.paciente_nombre}`);
  const descriptionParts = [`Terapeuta: ${cita.terapeuta}`];
  if (cita.notas) descriptionParts.push(`Notas: ${cita.notas}`);
  const description = icsEscape(descriptionParts.join('\n'));

  return [
    'BEGIN:VEVENT',
    `UID:cita-${cita.id}@consulta.bebest.com`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${toIcsUtc(start)}`,
    `DTEND:${toIcsUtc(end)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `STATUS:${cita.estado === 'Cancelada' ? 'CANCELLED' : 'CONFIRMED'}`,
  ].join('\r\n');
}

// Builds a single-event .ics file for a cita, downloadable/openable to add it
// to the phone's own calendar app (Google/Apple/Outlook all support this).
// One-time snapshot — later edits to the cita don't reach a phone that
// downloaded this file. For that, see buildCitasFeedIcs below.
export function buildCitaIcs(cita: Cita & { id: string }): string {
  const dtstamp = toIcsUtc(new Date());
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Consulta//Agenda//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    buildVevent(cita, dtstamp),
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

// Builds a multi-event .ics FEED (all of a therapist's citas) meant to be
// subscribed to (webcal://...), not downloaded once — calendar apps refetch
// a subscribed feed periodically on their own, so edits made later in Agenda
// (reschedule, cancel, etc.) show up automatically without the user doing
// anything on their phone.
export function buildCitasFeedIcs(citas: (Cita & { id: string })[]): string {
  const dtstamp = toIcsUtc(new Date());
  const vevents = citas.map((c) => {
    const block = buildVevent(c, dtstamp);
    return `${block}\r\nEND:VEVENT`;
  });
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Consulta//Agenda//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Consulta — Mi agenda',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    ...vevents,
    'END:VCALENDAR',
  ].join('\r\n');
}

// Lowercases, strips accents (NFD decomposition, then strips the
// combining diacritical marks in the U+0300-U+036F range), and collapses
// whitespace.
// Used anywhere two human-typed names need a forgiving comparison — e.g.
// duplicate-patient detection, where "María Pérez" and "maria perez" should
// still match.
export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents after NFD decomposition
    .replace(/\s+/g, ' ')
    .trim();
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

// Groups the flat DSM5_CODES list by base disorder name (everything before
// the FIRST " — ") so a diagnosis can be picked in two steps: the disorder
// itself, then — only if it actually has more than one code (severity levels,
// substance-specific variants, etc.) — which specific one. Splitting on the
// first separator (not the last) keeps compound labels like "Leve — Sustancia
// anfetamínica" together as one variant string rather than fragmenting
// further; the picker just shows that whole remainder as the option text.
export interface Dsm5Variant {
  label: string;
  code: string;
}

const DSM5_GROUPS: Map<string, Dsm5Variant[]> = (() => {
  const map = new Map<string, Dsm5Variant[]>();
  for (const entry of DSM5_CODES) {
    const sepIndex = entry.name.indexOf(' — ');
    const base = sepIndex === -1 ? entry.name : entry.name.slice(0, sepIndex);
    const label = sepIndex === -1 ? entry.name : entry.name.slice(sepIndex + 3);
    const list = map.get(base);
    if (list) list.push({ label, code: entry.code });
    else map.set(base, [{ label, code: entry.code }]);
  }
  return map;
})();

export const DSM5_BASE_NAMES: string[] = Array.from(DSM5_GROUPS.keys()).sort((a, b) => a.localeCompare(b, 'es'));

export function getDsm5Variants(base: string): Dsm5Variant[] {
  return DSM5_GROUPS.get(base) || [];
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

// Otros diagnósticos/problemas adicionales (Sesión 3) — an open-ended list
// beyond the fixed Dx Principal/Comorbilidad/Otros Problemas slots, each row
// optionally resolving to its own DSM-5 code the same way those three do.
// Same JSON-in-text-field pattern as plan_tratamiento.
export interface DxAdicional {
  nombre: string;
  codigo?: string;
}

export function parseDxAdicionales(raw?: string): DxAdicional[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function serializeDxAdicionales(rows: DxAdicional[]): string {
  const nonEmpty = rows.filter((r) => r.nombre.trim());
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

// Same JSON-in-text-field pattern as motivo_consulta — bateria_pruebas used
// to be one free-text field, now it's a checklist of the standard battery.
export function parseBateriaPruebas(raw?: string): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Pre-restructure values were free text (e.g. "Beck y SCL-90-R") —
    // surface as a one-item list instead of losing it.
    return [raw];
  }
}

export function serializeBateriaPruebas(items: string[]): string {
  return items.length ? JSON.stringify(items) : '';
}

// Per-test follow-up on the battery above: for each applied test, the
// therapist can either attach a scored result file or write a short
// interpretation directly — never both, per test. Same JSON-in-text-field
// pattern as everything else here.
export interface PruebaInterpretacion {
  prueba: string;
  tipo: 'archivo' | 'texto';
  texto?: string;
  archivo?: { id: string; filename: string };
}

export function parsePruebaInterpretaciones(raw?: string): PruebaInterpretacion[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function serializePruebaInterpretaciones(items: PruebaInterpretacion[]): string {
  return items.length ? JSON.stringify(items) : '';
}

// Freeform timestamped notes on a patient's ficha (see notas_generales in
// lib/types.ts) — same JSON-in-text-field pattern as the fields above.
// Stored newest-first so callers don't need to re-sort on every render.
export interface NotaGeneral {
  fecha: string; // ISO timestamp
  autor: string;
  texto: string;
  // Optional reference to a file uploaded alongside this note. The actual
  // bytes live in the same general `documentos` attachment bucket as every
  // other upload on this patient (Airtable attachment fields can't be
  // invented ad hoc) — this just remembers which one belongs to this note,
  // resolved through the existing documentos-serving route.
  archivo?: { id: string; filename: string };
}

export function parseNotasGenerales(raw?: string): NotaGeneral[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function serializeNotasGenerales(items: NotaGeneral[]): string {
  return items.length ? JSON.stringify(items) : '';
}

// Toast notification helper
export function showToast(message: string, isError: boolean = false) {
  const event = new CustomEvent('showToast', {
    detail: { message, isError },
  });
  window.dispatchEvent(event);
}

// Soft-delete-with-undo: the UI should already have optimistically removed
// the item before calling this (so it visually disappears right away);
// `performDelete` — the real API call — only actually fires after the toast's
// window closes, unless the person clicks "Deshacer" first, in which case
// `restore` puts it back and the API call never happens. Note this relies on
// the tab staying open for ~6s — if it's closed or navigated away first, the
// timer dies and the item is never actually deleted server-side (safe by
// default: the failure mode is "nothing happened", not "lost data").
export function deleteWithUndo(options: {
  message: string;
  performDelete: () => void | Promise<void>;
  restore: () => void;
}) {
  const { message, performDelete, restore } = options;
  let undone = false;

  const timer = setTimeout(() => {
    if (!undone) performDelete();
  }, 5500);

  window.dispatchEvent(
    new CustomEvent('showToast', {
      detail: {
        message,
        isError: false,
        actionLabel: 'Deshacer',
        onAction: () => {
          undone = true;
          clearTimeout(timer);
          restore();
        },
      },
    })
  );
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

// Renders a react-pdf element to a real .pdf file and saves it straight to
// the user's downloads — distinct from window.print() (which just opens the
// browser's print dialog and relies on the person choosing "Save as PDF"
// themselves). Client-side only; react-pdf's `pdf()` builder works in the
// browser without any server round-trip.
export async function downloadPdf(doc: ReactElement, filename: string): Promise<void> {
  const { pdf } = await import('@react-pdf/renderer');
  const blob = await pdf(doc as any).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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

// A patient counts as "going quiet" once this many days pass with no
// Completada cita — chosen as roughly a month, long enough that a normal
// biweekly/monthly cadence doesn't false-positive, short enough to still
// catch someone falling through the cracks before it's been a full quarter.
export const INACTIVITY_THRESHOLD_DAYS = 28;
// Most of the roster was bulk-imported from the clinic's old CSV with real
// session history that simply predates this app's Agenda — a patient with no
// Completada cita logged here isn't necessarily inactive, just untracked.
// Bounding "never had a session" to patients registered fairly recently
// keeps that case to "recently onboarded, never got a first session"
// instead of flagging nearly the entire legacy roster forever.
export const RECENT_REGISTRATION_WINDOW_DAYS = 120;

// Shared by the Alertas "going quiet" list and the Pacientes table's
// recency column/indicator, so the two can never drift on what "quiet"
// means — see the false-positive bug this was written to avoid, documented
// where it was first found (app/alertas/page.tsx history).
export function getLastCompletedSessionFecha(patientId: string, citas: any[]): string | null {
  const completed = citas
    .filter((c: any) => (c.paciente || []).includes(patientId) && c.estado === 'Completada')
    .sort((a: any, b: any) => (b.fecha || '').localeCompare(a.fecha || ''));
  return completed[0]?.fecha || null;
}

export function isPatientGoingQuiet(patient: any, lastFecha: string | null): boolean {
  if (patient.estatus_en_registro !== 'ACTIVO') return false;
  const cutoff = Date.now() - INACTIVITY_THRESHOLD_DAYS * 86400000;
  if (lastFecha) return new Date(lastFecha).getTime() < cutoff;
  if (!patient.fecha_ingreso) return false;
  const registeredAt = new Date(patient.fecha_ingreso).getTime();
  const registeredRecently = registeredAt > Date.now() - RECENT_REGISTRATION_WINDOW_DAYS * 86400000;
  return registeredRecently && registeredAt < cutoff;
}
